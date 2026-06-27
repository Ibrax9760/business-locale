<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'

const emit = defineEmits(['afficher-notification', 'refresh-data'])

// --- ÉTATS LOCAUX DES DONNÉES (Remplacement des Props) ---
const produitsVendeur = ref([])
const equipementsVendeur = ref([])
const chargement = ref(true)

// --- ÉTATS DE L'INTERFACE ET DU FORMULAIRE ---
const modalOuverte = ref(false)
const imageSource = ref('web')
const modeEdition = ref(false)
const articleEnEdition = ref(null)
const typeArticleEnEdition = ref('gastronomie')
const formatOptions = ['Format Petit', 'Format Moyen', 'Format Grand']

const nouvelArticle = ref({
  type: 'gastronomie',
  titre: '',
  description: '',
  prix: '',
  formatType: 'unique',
  variante_nom: formatOptions[0],
  prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' },
  image_url: ''
})

// --- FONCTION D'EXTRACTION AUTONOME DES DONNÉES ---
const chargerArticles = async () => {
  try {
    chargement.value = true;
    
    // Exécution parallèle des requêtes pour optimiser le temps de réponse
    const [resProduits, resEquipements] = await Promise.all([
      supabase.from('produits_gastronomie').select('*').order('id', { ascending: false }),
      supabase.from('equipements_location').select('*').order('id', { ascending: false })
    ]);

    if (resProduits.error) throw resProduits.error;
    if (resEquipements.error) throw resEquipements.error;

    produitsVendeur.value = resProduits.data || [];
    equipementsVendeur.value = resEquipements.data || [];
  } catch (error) {
    console.error("Erreur lors de l'extraction des articles :", error.message);
    emit('afficher-notification', `❌ Erreur de chargement des données`);
  } finally {
    chargement.value = false;
  }
}

// Déclenchement automatique au chargement du composant
onMounted(() => {
  chargerArticles()
})

// --- FONCTIONS UTILITAIRES POUR L'IMAGE ---
const compressImageFile = (file, maxSize = 900, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality))
      }
      img.onerror = reject
      img.src = event.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

const handleImageUpload = async (event) => {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  try {
    const compressedBase64 = await compressImageFile(file)
    const blob = dataURLtoBlob(compressedBase64)
    const nomFichierUnique = `public/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    
    const { data, error } = await supabase.storage
      .from('images-catalogue')
      .upload(nomFichierUnique, blob, { contentType: file.type })
      
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('images-catalogue')
      .getPublicUrl(nomFichierUnique)
      
    nouvelArticle.value.image_url = urlData.publicUrl
  } catch (error) {
    console.error("Erreur de téléversement :", error.message)
    alert("Impossible d'enregistrer l'image.")
  }
}

// --- GESTION DE L'INTERFACE MODALE ---
const ouvrirModalAjout = () => {
  resetVendeurForm()
  modalOuverte.value = true
}

const fermerModal = () => {
  modalOuverte.value = false
  resetVendeurForm()
}

const resetVendeurForm = () => {
  modeEdition.value = false
  articleEnEdition.value = null
  typeArticleEnEdition.value = 'gastronomie'
  imageSource.value = 'web'
  nouvelArticle.value = {
    type: 'gastronomie',
    titre: '',
    description: '',
    prix: '',
    formatType: 'unique',
    variante_nom: formatOptions[0],
    prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' },
    image_url: ''
  }
}

const demarrerEdition = (article, type) => {
  modeEdition.value = true
  articleEnEdition.value = article
  typeArticleEnEdition.value = type
  imageSource.value = article.image_url && article.image_url.includes('supabase') ? 'local' : 'web'
  
  const isModulable = type === 'gastronomie' && article.variantes?.length > 1
  const prixParFormat = { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' }
  
  if (type === 'gastronomie' && article.variantes) {
    article.variantes.forEach(v => {
      if (formatOptions.includes(v.nom)) prixParFormat[v.nom] = v.prix
    })
  }

  nouvelArticle.value = {
    type,
    titre: article.titre,
    description: article.description,
    prix: type === 'gastronomie' ? (article.variantes?.[0]?.prix ?? '') : article.prix_journalier,
    formatType: isModulable ? 'modulable' : 'unique',
    variante_nom: type === 'gastronomie' && article.variantes?.[0] ? article.variantes[0].nom : formatOptions[0],
    prixParFormat,
    image_url: article.image_url || ''
  }
  
  modalOuverte.value = true
}

// --- TRANSACTIONS BASE DE DONNÉES (CRUD) ---
const supprimerArticleVendeur = async (article, type) => {
  const confirmation = confirm(`Voulez-vous vraiment supprimer : ${article.titre} ?`)
  if (!confirmation) return

  try {
    const table = type === 'gastronomie' ? 'produits_gastronomie' : 'equipements_location'
    const { error } = await supabase.from(table).delete().eq('id', article.id)
    if (error) throw error
    
    emit('afficher-notification', `🗑️ Article supprimé`)
    await chargerArticles() // Rafraîchissement autonome
    emit('refresh-data') // Conservation de l'émission pour synchronisation globale éventuelle
  } catch (error) {
    console.error(error)
    emit('afficher-notification', `❌ Erreur de suppression`)
  }
}

const ajouterArticleVendeur = async () => {
  const isProduit = nouvelArticle.value.type === 'gastronomie'
  const isUnique = isProduit && nouvelArticle.value.formatType === 'unique'
  
  if (!nouvelArticle.value.titre || (isUnique && !nouvelArticle.value.prix) || (!isProduit && !nouvelArticle.value.prix)) {
    alert("Veuillez renseigner un titre et un prix.")
    return
  }

  const imageFinale = nouvelArticle.value.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'

  const buildVariantes = () => {
    if (isUnique) {
      return [{ id: 'v_' + Date.now(), nom: nouvelArticle.value.variante_nom, prix: parseFloat(nouvelArticle.value.prix) }]
    }
    return formatOptions.map(format => ({
      id: `v_${format.replace(/\s+/g, '_').toLowerCase()}`,
      nom: format,
      prix: parseFloat(nouvelArticle.value.prixParFormat[format])
    }))
  }

  try {
    if (modeEdition.value && articleEnEdition.value) {
      if (typeArticleEnEdition.value === 'gastronomie') {
        const { error } = await supabase.from('produits_gastronomie')
          .update({ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, image_url: imageFinale, variantes: buildVariantes() })
          .eq('id', articleEnEdition.value.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('equipements_location')
          .update({ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, prix_journalier: parseFloat(nouvelArticle.value.prix), image_url: imageFinale })
          .eq('id', articleEnEdition.value.id)
        if (error) throw error
      }
      emit('afficher-notification', `✏️ Article modifié`)
    } else {
      if (isProduit) {
        const { error } = await supabase.from('produits_gastronomie')
          .insert([{ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, image_url: imageFinale, variantes: buildVariantes(), disponible: true }])
        if (error) throw error
      } else {
        const { error } = await supabase.from('equipements_location')
          .insert([{ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, prix_journalier: parseFloat(nouvelArticle.value.prix), montant_caution: 0, image_url: imageFinale }])
        if (error) throw error
      }
      emit('afficher-notification', `✅ Article ajouté`)
    }
    
    fermerModal()
    await chargerArticles() // Rafraîchissement autonome
    emit('refresh-data') // Conservation de l'émission
  } catch (error) {
    console.error(error)
    emit('afficher-notification', `❌ Échec de l'enregistrement`)
  }
}
</script>

<template>
  <section class="panneau-admin">
    <div class="en-tete-admin">
      <h2>Tableau de Bord Vendeur</h2>
      <button @click="ouvrirModalAjout" class="bouton-ajout-principal">➕ Ajouter un nouvel article</button>
    </div>

    <section class="liste-articles-vendeur">
      <div class="grille-articles-vendeur">
        <div v-for="produit in produitsVendeur" :key="produit.id" class="carte-vendeur">
          <img :src="produit.image_url" class="miniature-carte" alt="" />
          <div class="info-carte">
            <h4>{{ produit.titre }}</h4>
            <p class="prix-vendeur">{{ produit.variantes ? produit.variantes[0].prix + ' €' : '' }}</p>
          </div>
          <div class="actions-article-vendeur">
            <button @click="demarrerEdition(produit, 'gastronomie')" class="bouton-modifier">✏️</button>
            <button @click="supprimerArticleVendeur(produit, 'gastronomie')" class="bouton-supprimer">🗑️</button>
          </div>
        </div>

        <div v-for="equipement in equipementsVendeur" :key="equipement.id" class="carte-vendeur">
          <img :src="equipement.image_url" class="miniature-carte" alt="" />
          <div class="info-carte">
            <h4>{{ equipement.titre }}</h4>
            <p class="prix-vendeur">{{ equipement.prix_journalier }} € / jour</p>
          </div>
          <div class="actions-article-vendeur">
            <button @click="demarrerEdition(equipement, 'location')" class="bouton-modifier">✏️</button>
            <button @click="supprimerArticleVendeur(equipement, 'location')" class="bouton-supprimer">🗑️</button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="modalOuverte" class="modal-overlay" @click.self="fermerModal">
      <div class="modal-contenu">
        <div class="modal-en-tete">
          <h3>{{ modeEdition ? "Modifier l'article" : "Créer un nouvel article" }}</h3>
          <button class="bouton-fermer-modal" @click="fermerModal">✖</button>
        </div>

        <div class="formulaire-vendeur">
          <div class="grille-formulaire">
            <div class="groupe-champ">
              <label>Type d'article</label>
              <select v-model="nouvelArticle.type" :disabled="modeEdition">
                <option value="gastronomie">Gastronomie (Plat)</option>
                <option value="location">Équipement (Location)</option>
              </select>
            </div>
            <div class="groupe-champ">
              <label>Titre de l'article</label>
              <input type="text" v-model="nouvelArticle.titre" placeholder="Ex: Gâteau" />
            </div>
          </div>

          <div class="groupe-champ pleine-largeur">
            <label>Description</label>
            <textarea v-model="nouvelArticle.description" placeholder="Description détaillée de l'article..."></textarea>
          </div>

          <div class="grille-formulaire" v-if="nouvelArticle.type === 'gastronomie'">
            <div class="groupe-champ">
              <label>Format</label>
              <div class="selection-image">
                <label><input type="radio" value="unique" v-model="nouvelArticle.formatType" /> Unique</label>
                <label><input type="radio" value="modulable" v-model="nouvelArticle.formatType" /> Modulable</label>
              </div>
            </div>
            
            <div class="groupe-champ" v-if="nouvelArticle.formatType === 'unique'">
              <label>Taille par défaut</label>
              <select v-model="nouvelArticle.variante_nom">
                <option v-for="format in formatOptions" :key="format" :value="format">{{ format }}</option>
              </select>
            </div>
          </div>

          <div class="grille-formulaire">
            <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'unique'">
              <label>Prix (€)</label>
              <input type="number" v-model="nouvelArticle.prix" placeholder="0.00" />
            </div>
            <div class="groupe-champ" v-else-if="nouvelArticle.type !== 'gastronomie'">
              <label>Prix par jour (€)</label>
              <input type="number" v-model="nouvelArticle.prix" placeholder="0.00" />
            </div>
          </div>

          <div class="groupe-champ pleine-largeur" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'modulable'">
            <label>Définition des prix par format :</label>
            <div class="grille-prix-modulable">
              <div v-for="format in formatOptions" :key="format" class="prix-format">
                <span>{{ format }}</span>
                <input type="number" v-model="nouvelArticle.prixParFormat[format]" placeholder="Prix €" />
              </div>
            </div>
          </div>

          <hr class="separateur-formulaire" />

          <div class="zone-upload-image">
            <div class="options-image">
              <label>Média de présentation</label>
              <div class="selection-image">
                <label><input type="radio" value="web" v-model="imageSource" /> URL Web</label>
                <label><input type="radio" value="local" v-model="imageSource" /> Uploader une image</label>
              </div>
              
              <div class="champ-image" v-if="imageSource === 'web'">
                <input type="text" v-model="nouvelArticle.image_url" placeholder="https://lien-de-votre-image.jpg" />
              </div>
              <div class="champ-image" v-else>
                <input type="file" accept="image/*" @change="handleImageUpload" class="input-file" />
              </div>
            </div>

            <div class="apercu-miniature" v-if="nouvelArticle.image_url">
              <img :src="nouvelArticle.image_url" alt="Aperçu" class="vignette-apercu" />
            </div>
          </div>

          <div class="actions-formulaire-vendeur">
            <button @click="fermerModal" type="button" class="bouton-annuler-edition">Annuler</button>
            <button @click="ajouterArticleVendeur" class="bouton-valider-ajout">
              {{ modeEdition ? "Enregistrer les modifications" : "Publier l'article" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panneau-admin {
  padding: 20px 0;
}

.en-tete-admin {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 10px;
}

.en-tete-admin h2 {
  margin: 0;
  color: #1f2833;
  font-size: 1.5rem;
}

.bouton-ajout-principal {
  background: #1f2833;
  color: #fff;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.bouton-ajout-principal:hover {
  background: #3a4b5c;
}

/* Grille des articles compacte */
.grille-articles-vendeur {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.carte-vendeur {
  background: #fff;
  border: 1px solid #e1e8ed;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.miniature-carte {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  object-fit: cover;
  background: #f4f6f8;
}

.info-carte {
  flex: 1;
}

.info-carte h4 {
  margin: 0 0 4px;
  font-size: 1rem;
  color: #1f2833;
}

.prix-vendeur {
  margin: 0;
  font-weight: 600;
  color: #b35034;
  font-size: 0.9rem;
}

.actions-article-vendeur button {
  background: #f4f6f8;
  border: none;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  margin-left: 8px;
  transition: 0.2s;
}

.actions-article-vendeur .bouton-modifier:hover { background: #e3f2fd; }
.actions-article-vendeur .bouton-supprimer:hover { background: #ffebee; }

/* MODALE (Fenêtre contextuelle) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 20, 25, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-contenu {
  background: #ffffff;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  border-radius: 24px;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}

.modal-en-tete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e8ed;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}

.modal-en-tete h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #1f2833;
}

.bouton-fermer-modal {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #6b7b8c;
}

/* Design du formulaire repensé */
.formulaire-vendeur {
  padding: 24px;
}

.grille-formulaire {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.groupe-champ {
  display: flex;
  flex-direction: column;
}

.pleine-largeur {
  grid-column: 1 / -1;
  margin-bottom: 20px;
}

.formulaire-vendeur label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.formulaire-vendeur input[type="text"],
.formulaire-vendeur input[type="number"],
.formulaire-vendeur select,
.formulaire-vendeur textarea {
  padding: 12px 16px;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  background: #f8fafc;
  font-size: 0.95rem;
  color: #1f2833;
  transition: all 0.2s;
}

.formulaire-vendeur input:focus,
.formulaire-vendeur select:focus,
.formulaire-vendeur textarea:focus {
  outline: none;
  border-color: #b35034;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(179, 80, 52, 0.1);
}

.formulaire-vendeur textarea {
  min-height: 100px;
  resize: vertical;
}

.selection-image {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.selection-image label {
  text-transform: none;
  font-weight: 500;
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #d1d9e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.grille-prix-modulable {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.prix-format {
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #d1d9e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.separateur-formulaire {
  border: none;
  border-top: 1px solid #e1e8ed;
  margin: 24px 0;
}

/* Zone Image rationalisée */
.zone-upload-image {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 30px;
}

.options-image {
  flex: 1;
}

.champ-image input { width: 100%; }

.input-file {
  padding: 10px;
  background: #fff;
  border: 1px dashed #b35034;
  border-radius: 12px;
  width: 100%;
}

.apercu-miniature {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 2px solid #fff;
}

.vignette-apercu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Boutons d'action Modal */
.actions-formulaire-vendeur {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #e1e8ed;
}

.bouton-annuler-edition,
.bouton-valider-ajout {
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: transform 0.1s, opacity 0.2s;
}

.bouton-annuler-edition {
  background: #f1f5f9;
  color: #475569;
}

.bouton-valider-ajout {
  background: #b35034;
  color: #fff;
}

.bouton-valider-ajout:hover { opacity: 0.9; transform: translateY(-1px); }

@media (max-width: 600px) {
  .grille-formulaire, .grille-prix-modulable { grid-template-columns: 1fr; }
  .zone-upload-image { flex-direction: column; }
  .apercu-miniature { width: 100%; height: 200px; }
}
</style>