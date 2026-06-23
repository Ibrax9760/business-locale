<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  produitsAjoutes: Array,
  equipementsAjoutes: Array,
  produits: Array,
  equipements: Array
})

const emit = defineEmits(['save-produits', 'save-equipements', 'afficher-notification', 'update-produits', 'update-equipements'])

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
  prixParFormat: {
    'Format Petit': '',
    'Format Moyen': '',
    'Format Grand': ''
  },
  image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
})

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
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(type, quality)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = event.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const handleImageUpload = async (event) => {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  try {
    nouvelArticle.value.image_url = await compressImageFile(file)
  } catch (error) {
    console.warn('Erreur lors de la compression de l\'image', error)
    const reader = new FileReader()
    reader.onload = (e) => {
      nouvelArticle.value.image_url = e.target.result
    }
    reader.readAsDataURL(file)
  }
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
    prixParFormat: {
      'Format Petit': '',
      'Format Moyen': '',
      'Format Grand': ''
    }
  }
}

const demarrerEdition = (article, type) => {
  modeEdition.value = true
  articleEnEdition.value = article
  typeArticleEnEdition.value = type
  imageSource.value = article.image_url && article.image_url.startsWith('data:') ? 'local' : 'web'
  
  const isModulable = type === 'gastronomie' && article.variantes?.length > 1
  const prixParFormat = { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' }
  
  if (isModulable) {
    article.variantes.forEach(v => {
      if (formatOptions.includes(v.nom)) prixParFormat[v.nom] = v.prix
    })
  }
  
  nouvelArticle.value = {
    type,
    titre: article.titre,
    description: article.description,
    prix: isModulable ? '' : (type === 'gastronomie' ? (article.variantes?.[0]?.prix ?? '') : article.prix_journalier),
    formatType: isModulable ? 'modulable' : 'unique',
    variante_nom: type === 'gastronomie' ? (formatOptions.includes(article.variantes?.[0]?.nom) ? article.variantes[0].nom : formatOptions[0]) : formatOptions[0],
    prixParFormat,
    image_url: article.image_url || ''
  }
}

const supprimerArticleVendeur = (article, type) => {
  if (type === 'gastronomie') {
    const nouveauxProduits = props.produits.filter(item => item.id !== article.id)
    const nouveauxAjoutes = props.produitsAjoutes.filter(item => item.id !== article.id)
    emit('update-produits', nouveauxProduits)
    emit('save-produits', nouveauxAjoutes)
  } else {
    const nouveauxEquipements = props.equipements.filter(item => item.id !== article.id)
    const nouveauxAjoutes = props.equipementsAjoutes.filter(item => item.id !== article.id)
    emit('update-equipements', nouveauxEquipements)
    emit('save-equipements', nouveauxAjoutes)
  }
  
  if (articleEnEdition.value?.id === article.id) resetVendeurForm()
  emit('afficher-notification', `🗑️ Article supprimé : ${article.titre}`)
}

const ajouterArticleVendeur = () => {
  const isProduit = nouvelArticle.value.type === 'gastronomie'
  const isUnique = isProduit && nouvelArticle.value.formatType === 'unique'
  const isModulable = isProduit && nouvelArticle.value.formatType === 'modulable'

  if (!nouvelArticle.value.titre || (isUnique && !nouvelArticle.value.prix) || (!isProduit && !nouvelArticle.value.prix)) {
    alert("Veuillez renseigner un titre et un prix.")
    return
  }

  if (isModulable) {
    const missingFormat = formatOptions.some(format => !nouvelArticle.value.prixParFormat[format])
    if (missingFormat) {
      alert("Veuillez renseigner un prix pour chaque format modulable.")
      return
    }
  }

  const imageFinale = nouvelArticle.value.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'

  const buildVariantes = () => {
    if (isUnique) {
      return [{ id: 'v_temp_' + Date.now(), nom: nouvelArticle.value.variante_nom, prix: parseFloat(nouvelArticle.value.prix) }]
    }
    return formatOptions.map(format => ({
      id: `v_temp_${format.replace(/\s+/g, '_')}`,
      nom: format,
      prix: parseFloat(nouvelArticle.value.prixParFormat[format])
    }))
  }

  if (modeEdition.value && articleEnEdition.value) {
    if (typeArticleEnEdition.value === 'gastronomie') {
      const articleModifie = {
        ...articleEnEdition.value,
        titre: nouvelArticle.value.titre,
        description: nouvelArticle.value.description,
        image_url: imageFinale,
        variantes: buildVariantes()
      }
      articleModifie.varianteChoisie = articleModifie.variantes[0]

      const nouveauxProduits = props.produits.map(p => p.id === articleModifie.id ? articleModifie : p)
      const nouveauxAjoutes = props.produitsAjoutes.map(p => p.id === articleModifie.id ? articleModifie : p)

      emit('update-produits', nouveauxProduits)
      emit('save-produits', nouveauxAjoutes)
    } else {
      const articleModifie = {
        ...articleEnEdition.value,
        titre: nouvelArticle.value.titre,
        description: nouvelArticle.value.description,
        image_url: imageFinale,
        prix_journalier: parseFloat(nouvelArticle.value.prix)
      }
      
      const nouveauxEquipements = props.equipements.map(e => e.id === articleModifie.id ? articleModifie : e)
      const nouveauxAjoutes = props.equipementsAjoutes.map(e => e.id === articleModifie.id ? articleModifie : e)

      emit('update-equipements', nouveauxEquipements)
      emit('save-equipements', nouveauxAjoutes)
    }
    emit('afficher-notification', `✏️ Article modifié : ${nouvelArticle.value.titre}`)
    resetVendeurForm()
    return
  }

  if (nouvelArticle.value.type === 'gastronomie') {
    const nouveauPlat = {
      id: 'prod_temp_' + Date.now(),
      titre: nouvelArticle.value.titre,
      description: nouvelArticle.value.description,
      categorie: "Nouveau",
      image_url: imageFinale,
      variantes: buildVariantes(),
      disponible: true
    }
    nouveauPlat.varianteChoisie = nouveauPlat.variantes[0]
    
    emit('save-produits', [...props.produitsAjoutes, nouveauPlat])
    emit('update-produits', [...props.produits, nouveauPlat])
  } else {
    const nouvelEquipement = {
      id: 'equip_temp_' + Date.now(),
      titre: nouvelArticle.value.titre,
      description: nouvelArticle.value.description,
      prix_journalier: parseFloat(nouvelArticle.value.prix),
      montant_caution: 0,
      image_url: imageFinale
    }
    emit('save-equipements', [...props.equipementsAjoutes, nouvelEquipement])
    emit('update-equipements', [...props.equipements, nouvelEquipement])
  }

  emit('afficher-notification', `✅ ${nouvelArticle.value.titre} ajouté au catalogue !`)
  resetVendeurForm()
}

const produitsVendeur = computed(() => props.produits.filter(p => p.titre))
const equipementsVendeur = computed(() => props.equipements.filter(e => e.titre))
</script>

<template>
  <section class="panneau-admin">
    <h2>Espace Vendeur - Ajouter un article</h2>
    <div class="bloc-info">
      <p>Bienvenue dans l'espace vendeur : ajoute, modifie et publie des articles directement sur la boutique.</p>
    </div>
    <div class="formulaire-vendeur">
      <div class="groupe-champ"><label>Type d'article :</label><select v-model="nouvelArticle.type"><option value="gastronomie">Gastronomie (Plat)</option><option value="location">Équipement (Location)</option></select></div>
      <div class="groupe-champ"><label>Titre de l'article :</label><input type="text" v-model="nouvelArticle.titre" placeholder="Ex: Gâteau" /></div>
      <div class="groupe-champ"><label>Description :</label><textarea v-model="nouvelArticle.description" placeholder="Description..."></textarea></div>
    <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie'">
      <label>Type de format :</label>
      <div class="selection-image">
        <label><input type="radio" value="unique" v-model="nouvelArticle.formatType" /> Unique</label>
        <label><input type="radio" value="modulable" v-model="nouvelArticle.formatType" /> Modulable</label>
      </div>
    </div>
    <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'unique'">
      <label>Format / Taille :</label>
      <select v-model="nouvelArticle.variante_nom">
        <option v-for="format in formatOptions" :key="format" :value="format">{{ format }}</option>
      </select>
    </div>
    <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'unique'">
      <label>Prix (€) :</label>
      <input type="number" v-model="nouvelArticle.prix" placeholder="Ex: 15" />
    </div>
    <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'modulable'">
      <label>Prix par format :</label>
      <div v-for="format in formatOptions" :key="format" class="prix-format">
        <span>{{ format }} :</span>
        <input type="number" v-model="nouvelArticle.prixParFormat[format]" placeholder="Prix" />
      </div>
    </div>
    <div class="groupe-champ" v-else-if="nouvelArticle.type !== 'gastronomie'">
      <label>Prix (€) :</label>
      <input type="number" v-model="nouvelArticle.prix" placeholder="Ex: 15" />
    </div>
    <div class="groupe-champ">
      <label>Source de l'image :</label>
      <div class="selection-image">
        <label><input type="radio" value="web" v-model="imageSource" /> URL Web</label>
        <label><input type="radio" value="local" v-model="imageSource" /> Image locale</label>
      </div>
    </div>
    <div class="groupe-champ" v-if="imageSource === 'web'">
      <label>Lien image :</label>
      <input type="text" v-model="nouvelArticle.image_url" placeholder="https://..." />
    </div>
    <div class="groupe-champ" v-else>
      <label>Choisir un fichier :</label>
      <input type="file" accept="image/*" @change="handleImageUpload" />
    </div>
    <div class="aperçu-image" v-if="nouvelArticle.image_url">
      <label>Aperçu :</label>
      <img :src="nouvelArticle.image_url" alt="Aperçu image" />
    </div>
    <div class="actions-formulaire-vendeur">
      <button @click="ajouterArticleVendeur" class="bouton-valider-ajout">
        {{ modeEdition ? "✏️ Modifier l'article" : "➕ Ajouter au catalogue" }}
      </button>
      <button v-if="modeEdition" @click="resetVendeurForm" type="button" class="bouton-annuler-edition">Annuler</button>
    </div>
    </div>

    <section class="liste-articles-vendeur">
      <h3>Articles en vente</h3>
      <div class="grille-articles-vendeur">
        <div v-for="produit in produitsVendeur" :key="produit.id" class="carte-produit carte-vendeur">
          <h4>{{ produit.titre }}</h4>
          <p>{{ produit.description }}</p>
          <p class="prix-vendeur">{{ produit.variantes ? produit.variantes[0].prix + ' €' : produit.prix_journalier + ' € / jour' }}</p>
          <div class="actions-article-vendeur">
            <button @click="demarrerEdition(produit, 'gastronomie')">Modifier</button>
            <button @click="supprimerArticleVendeur(produit, 'gastronomie')" class="bouton-supprimer">Supprimer</button>
          </div>
        </div>
        <div v-for="equipement in equipementsVendeur" :key="equipement.id" class="carte-equipement carte-vendeur">
          <h4>{{ equipement.titre }}</h4>
          <p>{{ equipement.description }}</p>
          <p class="prix-vendeur">{{ equipement.prix_journalier }} € / jour</p>
          <div class="actions-article-vendeur">
            <button @click="demarrerEdition(equipement, 'location')">Modifier</button>
            <button @click="supprimerArticleVendeur(equipement, 'location')" class="bouton-supprimer">Supprimer</button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.panneau-admin {
  background: linear-gradient(180deg, rgba(255, 239, 228, 0.96) 0%, rgba(255, 245, 238, 0.98) 100%);
  border: 1px solid rgba(240, 138, 93, 0.3);
  border-radius: 32px;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(240, 138, 93, 0.12);
  margin-bottom: 28px;
}

.panneau-admin h2 {
  margin-top: 0;
  font-size: 1.25rem;
  color: #1f2833;
}

.bloc-info {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.9);
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(240, 138, 93, 0.12);
}

.bloc-info p {
  margin: 0;
  color: #6b7b8c;
  line-height: 1.7;
}

.formulaire-vendeur .groupe-champ {
  margin-bottom: 18px;
}

.formulaire-vendeur label {
  display: block;
  color: #1f2833;
  font-size: 0.95rem;
  margin-bottom: 10px;
  font-weight: 600;
}

.formulaire-vendeur input,
.formulaire-vendeur select,
.formulaire-vendeur textarea {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: #fff;
  color: #1f2833;
  font-size: 1rem;
}

.formulaire-vendeur textarea {
  min-height: 100px;
  resize: vertical;
}

.selection-image {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.selection-image label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(240, 138, 93, 0.08);
  border: 1px solid rgba(240, 138, 93, 0.12);
  cursor: pointer;
}

.aperçu-image {
  margin-top: 15px;
}

.aperçu-image label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
}

.aperçu-image img {
  width: 100%;
  border-radius: 22px;
  max-height: 260px;
  object-fit: cover;
}

.actions-formulaire-vendeur {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  margin-top: 15px;
}

.bouton-valider-ajout,
.bouton-annuler-edition {
  padding: 16px 18px;
  font-weight: 700;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.bouton-valider-ajout {
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18);
  animation: pulseGlow 5s ease-in-out infinite;
}

.bouton-valider-ajout:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

.bouton-annuler-edition {
  background: #aab3ba;
  color: white;
}

.bouton-annuler-edition:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18); }
  50% { box-shadow: 0 24px 50px rgba(240, 138, 93, 0.24); }
}

.liste-articles-vendeur {
  margin-top: 32px;
}

.liste-articles-vendeur h3 {
  color: #1f2833;
  margin-bottom: 16px;
}

.grille-articles-vendeur {
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
}

.carte-vendeur {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(31, 40, 51, 0.08);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 24px 70px rgba(31, 40, 51, 0.08);
}

.carte-vendeur h4 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: #1f2833;
}

.carte-vendeur p {
  color: #6b7b8c;
  line-height: 1.6;
}

.prix-vendeur {
  margin-top: 14px;
  font-weight: 700;
  color: #b35034;
}

.actions-article-vendeur {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.actions-article-vendeur button {
  padding: 14px 12px;
  font-weight: 700;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
  flex: 1;
}

.actions-article-vendeur button:first-child {
  background: linear-gradient(135deg, #3498db, #5ac8ff);
  color: white;
}

.actions-article-vendeur .bouton-supprimer {
  background: linear-gradient(135deg, #e74c3c, #ff6a6a);
  color: white;
}

.actions-article-vendeur button:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

.prix-format {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.prix-format span {
  min-width: 120px;
}

.prix-format input {
  flex: 1;
}

@media (max-width: 640px) {
  .panneau-admin {
    border-radius: 24px;
    padding: 20px;
  }

  .actions-formulaire-vendeur {
    grid-template-columns: 1fr;
  }

  .grille-articles-vendeur {
    grid-template-columns: 1fr;
  }
}
</style>