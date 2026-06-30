<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'

const emit = defineEmits(['afficher-notification', 'refresh-data'])
const ongletActif = ref('catalogue')
const produitsVendeur = ref([])
const equipementsVendeur = ref([])
const listeCommandes = ref([])
const chargement = ref(true)

const modalOuverte = ref(false)
const imageSource = ref('web')
const modeEdition = ref(false)
const articleEnEdition = ref(null)
const typeArticleEnEdition = ref('gastronomie')
const formatOptions = ['Format Petit', 'Format Moyen', 'Format Grand']

const nouvelArticle = ref({
  type: 'gastronomie', titre: '', description: '', prix: '',
  formatType: 'unique', variante_nom: formatOptions[0],
  prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' },
  image_url: ''
})

const modalCommandeOuverte = ref(false)
const modeEditionCommande = ref(false)
const commandeEnEdition = ref(null)

const formulaireCommande = ref({ nom_client: '', mode_recuperation: 'Manuelle', total_general: 0, statut: 'En attente', details_panier: [] })

const chargerArticles = async () => {
  chargement.value = true;
  try {
    const [resProduits, resEquipements] = await Promise.all([
      supabase.from('produits_gastronomie').select('*').order('id', { ascending: false }),
      supabase.from('equipements_location').select('*').order('id', { ascending: false })
    ]);
    if (resProduits.error) throw resProduits.error;
    if (resEquipements.error) throw resEquipements.error;
    produitsVendeur.value = resProduits.data || [];
    equipementsVendeur.value = resEquipements.data || [];
  } catch (error) { console.error(error); emit('afficher-notification', `❌ Erreur données`); } 
  finally { chargement.value = false; }
}

const chargerCommandes = async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    listeCommandes.value = data
  } catch (erreur) { console.error(erreur) } 
  finally { chargement.value = false }
}

const libererDatesEquipements = async (commande) => {
  if (!commande.details_panier || !Array.isArray(commande.details_panier)) return;
  const equipements = commande.details_panier.filter(item => item.typeElement === 'location');
  for (const eq of equipements) {
    if (eq.idBase && eq.dateDebut && eq.dateFin) {
      await supabase.from('reservations_equipements').delete().match({ equipement_id: eq.idBase, date_debut: eq.dateDebut, date_fin: eq.dateFin });
    }
  }
}

const ouvrirAjoutCommande = () => {
  modeEditionCommande.value = false
  formulaireCommande.value = { nom_client: '', mode_recuperation: 'Saisie Manuelle', total_general: 0, statut: 'En attente', details_panier: [] }
  modalCommandeOuverte.value = true
}

const ouvrirEditionCommande = (commande) => {
  modeEditionCommande.value = true
  commandeEnEdition.value = commande
  formulaireCommande.value = { ...commande }
  modalCommandeOuverte.value = true
}

const sauvegarderCommande = async () => {
  try {
    const { id, created_at, ...payload } = formulaireCommande.value

    if (modeEditionCommande.value) {
      const { error } = await supabase.from('commandes').update(payload).eq('id', commandeEnEdition.value.id)
      if (error) throw error
      
      if (payload.statut === 'Annulée') {
        await libererDatesEquipements(commandeEnEdition.value)
      } else {
        // S'assurer de bloquer les dates en cas de réactivation/modification (nettoyage puis insertion)
        await libererDatesEquipements(commandeEnEdition.value)
        if (payload.details_panier && Array.isArray(payload.details_panier)) {
          const equipements = payload.details_panier.filter(item => item.typeElement === 'location');
          for (const eq of equipements) {
            if (eq.idBase && eq.dateDebut && eq.dateFin) {
              await supabase.from('reservations_equipements').insert([{
                equipement_id: eq.idBase,
                date_debut: eq.dateDebut,
                date_fin: eq.dateFin
              }]);
            }
          }
        }
      }
    } else {
      const { data, error } = await supabase.from('commandes').insert([payload]).select()
      if (error) throw error
      
      // Bloquer les dates si création manuelle d'une commande contenant des équipements
      if (data && data[0]) {
        const cmdCreee = data[0];
        if (cmdCreee.details_panier && Array.isArray(cmdCreee.details_panier)) {
          const equipements = cmdCreee.details_panier.filter(item => item.typeElement === 'location');
          for (const eq of equipements) {
            if (eq.idBase && eq.dateDebut && eq.dateFin) {
              await supabase.from('reservations_equipements').insert([{
                equipement_id: eq.idBase,
                date_debut: eq.dateDebut,
                date_fin: eq.dateFin
              }]);
            }
          }
        }
      }
    }
    modalCommandeOuverte.value = false
    await chargerCommandes()
  } catch (erreur) { console.error(erreur) }
}

const annulerCommande = async (commande) => {
  if (!confirm(`Annuler cette commande ?`)) return
  try {
    await libererDatesEquipements(commande)
    await supabase.from('commandes').update({ statut: 'Annulée' }).eq('id', commande.id)
    await chargerCommandes()
  } catch (erreur) { console.error(erreur) }
}

const supprimerCommande = async (commande) => {
  if (!confirm(`⚠️ SUPPRESSION : Effacer la commande ?`)) return
  try {
    await libererDatesEquipements(commande)
    await supabase.from('commandes').delete().eq('id', commande.id)
    await chargerCommandes()
  } catch (erreur) { console.error(erreur) }
}

const changerOnglet = (onglet) => {
  ongletActif.value = onglet
  if (onglet === 'catalogue' && produitsVendeur.value.length === 0) chargerArticles()
  if (onglet === 'commandes' && listeCommandes.value.length === 0) chargerCommandes()
}

const formaterDate = (chaineDate) => {
  if (!chaineDate) return '';
  const dateObj = new Date(chaineDate);
  return isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(dateObj);
}

// MATRICE COULEURS STRICTE
const getCouleurStatut = (statut) => {
  if (statut === 'Validée') return 'badge-succes'
  if (statut === 'Annulée') return 'badge-erreur'
  if (statut === 'En préparation') return 'badge-preparation'
  return 'badge-attente'
}

onMounted(() => { chargerArticles() })

const compressImageFile = (file, maxSize = 900, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio); height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality))
      }
      img.onerror = reject; img.src = event.target.result
    }
    reader.onerror = reject; reader.readAsDataURL(file)
  })
}

const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(','); const mime = arr[0].match(/:(.*?);/)[1]; const bstr = atob(arr[1])
  let n = bstr.length; const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

const handleImageUpload = async (event) => {
  const file = event.target.files && event.target.files[0]; if (!file) return
  try {
    const compressedBase64 = await compressImageFile(file)
    const blob = dataURLtoBlob(compressedBase64)
    const nomFichierUnique = `public/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    await supabase.storage.from('images-catalogue').upload(nomFichierUnique, blob, { contentType: file.type })
    const { data: urlData } = supabase.storage.from('images-catalogue').getPublicUrl(nomFichierUnique)
    nouvelArticle.value.image_url = urlData.publicUrl
  } catch (error) { console.error(error); alert("Erreur d'image."); }
}

const ouvrirModalAjout = () => { resetVendeurForm(); modalOuverte.value = true }
const fermerModal = () => { modalOuverte.value = false; resetVendeurForm() }
const resetVendeurForm = () => {
  modeEdition.value = false; articleEnEdition.value = null; typeArticleEnEdition.value = 'gastronomie'; imageSource.value = 'web'
  nouvelArticle.value = { type: 'gastronomie', titre: '', description: '', prix: '', formatType: 'unique', variante_nom: formatOptions[0], prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' }, image_url: '' }
}

const demarrerEdition = (article, type) => {
  modeEdition.value = true; articleEnEdition.value = article; typeArticleEnEdition.value = type
  imageSource.value = article.image_url && article.image_url.includes('supabase') ? 'local' : 'web'
  const isModulable = type === 'gastronomie' && article.variantes?.length > 1
  const prixParFormat = { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' }
  if (type === 'gastronomie' && article.variantes) {
    article.variantes.forEach(v => { if (formatOptions.includes(v.nom)) prixParFormat[v.nom] = v.prix })
  }
  nouvelArticle.value = {
    type, titre: article.titre, description: article.description,
    prix: type === 'gastronomie' ? (article.variantes?.[0]?.prix ?? '') : article.prix_journalier,
    formatType: isModulable ? 'modulable' : 'unique',
    variante_nom: type === 'gastronomie' && article.variantes?.[0] ? article.variantes[0].nom : formatOptions[0],
    prixParFormat, image_url: article.image_url || ''
  }
  modalOuverte.value = true
}

const supprimerArticleVendeur = async (article, type) => {
  if (!confirm(`Supprimer : ${article.titre} ?`)) return
  try {
    const table = type === 'gastronomie' ? 'produits_gastronomie' : 'equipements_location'
    await supabase.from(table).delete().eq('id', article.id)
    emit('afficher-notification', `🗑️ Supprimé`); await chargerArticles(); emit('refresh-data')
  } catch (error) { console.error(error) }
}

const ajouterArticleVendeur = async () => {
  const isProduit = nouvelArticle.value.type === 'gastronomie'
  const isUnique = isProduit && nouvelArticle.value.formatType === 'unique'
  if (!nouvelArticle.value.titre || (isUnique && !nouvelArticle.value.prix) || (!isProduit && !nouvelArticle.value.prix)) { alert("Titre et prix requis."); return }
  const imageFinale = nouvelArticle.value.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
  const buildVariantes = () => {
    if (isUnique) return [{ id: 'v_' + Date.now(), nom: nouvelArticle.value.variante_nom, prix: parseFloat(nouvelArticle.value.prix) }]
    return formatOptions.map(format => ({ id: `v_${format.replace(/\s+/g, '_').toLowerCase()}`, nom: format, prix: parseFloat(nouvelArticle.value.prixParFormat[format]) }))
  }

  try {
    if (modeEdition.value && articleEnEdition.value) {
      if (typeArticleEnEdition.value === 'gastronomie') {
        await supabase.from('produits_gastronomie').update({ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, image_url: imageFinale, variantes: buildVariantes() }).eq('id', articleEnEdition.value.id)
      } else {
        await supabase.from('equipements_location').update({ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, prix_journalier: parseFloat(nouvelArticle.value.prix), image_url: imageFinale }).eq('id', articleEnEdition.value.id)
      }
      emit('afficher-notification', `✏️ Modifié`)
    } else {
      if (isProduit) {
        await supabase.from('produits_gastronomie').insert([{ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, image_url: imageFinale, variantes: buildVariantes(), disponible: true }])
      } else {
        await supabase.from('equipements_location').insert([{ titre: nouvelArticle.value.titre, description: nouvelArticle.value.description, prix_journalier: parseFloat(nouvelArticle.value.prix), montant_caution: 0, image_url: imageFinale }])
      }
      emit('afficher-notification', `✅ Ajouté`)
    }
    fermerModal(); await chargerArticles(); emit('refresh-data')
  } catch (error) { console.error(error) }
}
</script>

<template>
  <section class="panneau-admin">
    <div class="en-tete-admin">
      <h2>Tableau de Bord Vendeur</h2>
      <div class="selecteur-onglets">
        <button :class="{ actif: ongletActif === 'catalogue' }" @click="changerOnglet('catalogue')">Mon Catalogue</button>
        <button :class="{ actif: ongletActif === 'commandes' }" @click="changerOnglet('commandes')">Gestion Commandes</button>
      </div>
    </div>

    <div v-if="ongletActif === 'catalogue'">
      <div class="barre-actions">
        <button @click="ouvrirModalAjout" class="bouton-ajout-principal">➕ Ajouter un article</button>
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
    </div>

    <div v-if="ongletActif === 'commandes'">
      <div class="barre-actions">
        <button class="bouton-ajout-principal" @click="ouvrirAjoutCommande">+ Créer une commande manuelle</button>
      </div>
      
      <div class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cmd in listeCommandes" :key="cmd.id">
              <td>{{ formaterDate(cmd.created_at) }}</td>
              <td class="cellule-forte">{{ cmd.nom_client }}</td>
              <td class="cellule-prix">{{ cmd.total_general }} €</td>
              <td><span class="badge-statut" :class="getCouleurStatut(cmd.statut)">{{ cmd.statut || 'En attente' }}</span></td>
              <td class="cellule-actions">
                <button @click="ouvrirEditionCommande(cmd)" class="btn-icone">✏️</button>
                <button v-if="cmd.statut !== 'Annulée'" @click="annulerCommande(cmd)" class="btn-icone" title="Annuler">🚫</button>
                <button @click="supprimerCommande(cmd)" class="btn-icone danger" title="Supprimer">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
            <div class="groupe-champ"><label>Titre</label><input type="text" v-model="nouvelArticle.titre" /></div>
          </div>
          <div class="groupe-champ pleine-largeur"><label>Description</label><textarea v-model="nouvelArticle.description"></textarea></div>
          <div class="grille-formulaire" v-if="nouvelArticle.type === 'gastronomie'">
            <div class="groupe-champ">
              <label>Format</label>
              <div class="selection-image">
                <label><input type="radio" value="unique" v-model="nouvelArticle.formatType" /> Unique</label>
                <label><input type="radio" value="modulable" v-model="nouvelArticle.formatType" /> Modulable</label>
              </div>
            </div>
            <div class="groupe-champ" v-if="nouvelArticle.formatType === 'unique'">
              <label>Taille</label>
              <select v-model="nouvelArticle.variante_nom"><option v-for="fmt in formatOptions" :key="fmt" :value="fmt">{{ fmt }}</option></select>
            </div>
          </div>
          <div class="grille-formulaire">
            <div class="groupe-champ" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'unique'"><label>Prix (€)</label><input type="number" v-model="nouvelArticle.prix" /></div>
            <div class="groupe-champ" v-else-if="nouvelArticle.type !== 'gastronomie'"><label>Prix / jour (€)</label><input type="number" v-model="nouvelArticle.prix" /></div>
          </div>
          <div class="groupe-champ pleine-largeur" v-if="nouvelArticle.type === 'gastronomie' && nouvelArticle.formatType === 'modulable'">
            <label>Prix par format :</label>
            <div class="grille-prix-modulable">
              <div v-for="fmt in formatOptions" :key="fmt" class="prix-format">
                <span>{{ fmt }}</span><input type="number" v-model="nouvelArticle.prixParFormat[fmt]" placeholder="Prix €" />
              </div>
            </div>
          </div>
          <hr class="separateur-formulaire" />
          <div class="zone-upload-image">
            <div class="options-image">
              <label>Média</label>
              <div class="selection-image">
                <label><input type="radio" value="web" v-model="imageSource" /> URL Web</label>
                <label><input type="radio" value="local" v-model="imageSource" /> Fichier</label>
              </div>
              <div class="champ-image" v-if="imageSource === 'web'"><input type="text" v-model="nouvelArticle.image_url" /></div>
              <div class="champ-image" v-else><input type="file" accept="image/*" @change="handleImageUpload" class="input-file" /></div>
            </div>
            <div class="apercu-miniature" v-if="nouvelArticle.image_url"><img :src="nouvelArticle.image_url" class="vignette-apercu" /></div>
          </div>
          <div class="actions-formulaire-vendeur">
            <button @click="fermerModal" type="button" class="bouton-annuler-edition">Annuler</button>
            <button @click="ajouterArticleVendeur" class="bouton-valider-ajout">{{ modeEdition ? "Enregistrer" : "Publier" }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalCommandeOuverte" class="modal-overlay" @click.self="modalCommandeOuverte = false">
      <div class="modal-contenu" style="max-width: 400px; padding: 24px;">
        <button class="bouton-fermer-modal" @click="modalCommandeOuverte = false" style="position: absolute; right: 20px;">✖</button>
        <h3 style="margin-bottom: 20px;">{{ modeEditionCommande ? 'Éditer la commande' : 'Nouvelle commande' }}</h3>
        <form @submit.prevent="sauvegarderCommande">
          <div class="groupe-champ"><label>Nom du client</label><input type="text" v-model="formulaireCommande.nom_client" required /></div>
          <div class="groupe-champ"><label>Récupération</label><input type="text" v-model="formulaireCommande.mode_recuperation" required /></div>
          <div class="groupe-champ"><label>Total (€)</label><input type="number" step="0.01" v-model="formulaireCommande.total_general" required /></div>
          <div class="groupe-champ">
            <label>Statut</label>
            <select v-model="formulaireCommande.statut" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #d1d9e0;">
              <option value="En attente">En attente</option>
              <option value="En préparation">En préparation</option>
              <option value="Validée">Validée</option>
              <option value="Annulée">Annulée</option>
            </select>
          </div>
          <button type="submit" class="bouton-ajout-principal" style="width: 100%; margin-top: 20px;">Enregistrer</button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panneau-admin { padding: 20px 0; }
.en-tete-admin { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; padding: 0 10px; }
.en-tete-admin h2 { margin: 0; color: var(--text-primary); font-size: 1.5rem; }

.selecteur-onglets { display: flex; gap: 12px; background: var(--accent-gold-light); padding: 6px; border-radius: 12px; width: fit-content; }
.selecteur-onglets button { padding: 10px 24px; border: none; background: transparent; border-radius: 8px; font-family: 'Inter', sans-serif; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.selecteur-onglets button.actif { background: var(--bg-carte); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.barre-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }

.bouton-ajout-principal { background: var(--accent-green); color: #fff; padding: 12px 24px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.bouton-ajout-principal:hover { background: #1f372f; }

.table-responsive { width: 100%; overflow-x: auto; background: var(--bg-carte); border-radius: 16px; border: 1px solid var(--border-subtile); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.table-premium { width: 100%; border-collapse: collapse; text-align: left; font-family: 'Inter', sans-serif; }
.table-premium th { background: var(--bg-app); padding: 16px 20px; font-size: 0.85rem; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtile); }
.table-premium td { padding: 20px; border-bottom: 1px solid var(--border-subtile); font-size: 0.95rem; color: var(--text-primary); vertical-align: middle; }
.cellule-forte { font-weight: 600; }
.cellule-prix { font-weight: 800; color: var(--accent-green); }
.cellule-actions { display: flex; gap: 8px; }

.btn-icone { background: var(--accent-gold-light); border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: var(--text-primary); transition: 0.2s; }
.btn-icone:hover { background: var(--border-subtile); }
.btn-icone.danger:hover { background: #ffebee; color: #c62828; }

/* CSS STRICT DES STATUTS */
.badge-statut { padding: 6px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; display: inline-block; white-space: nowrap; }
.badge-attente { background: #f3e8ff; color: #7e22ce; }       /* Violet */
.badge-preparation { background: #fff7ed; color: #ea580c; }   /* Orange */
.badge-succes { background: #e6f4ea; color: #1e8e3e; }        /* Vert */
.badge-erreur { background: #ffebee; color: #c62828; }        /* Rouge */

.grille-articles-vendeur { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.carte-vendeur { background: var(--bg-carte); border: 1px solid var(--border-subtile); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.miniature-carte { width: 60px; height: 60px; border-radius: 10px; object-fit: cover; background: var(--accent-gold-light); }
.info-carte { flex: 1; }
.info-carte h4 { margin: 0 0 4px; font-size: 1rem; color: var(--text-primary); }
.prix-vendeur { margin: 0; font-weight: 600; color: var(--accent-gold-dark); font-size: 0.9rem; }
.actions-article-vendeur button { background: var(--accent-gold-light); border: none; padding: 10px; border-radius: 8px; cursor: pointer; color: var(--text-primary); margin-left: 8px; transition: 0.2s; }
.actions-article-vendeur button:hover { background: var(--border-subtile); }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 20, 25, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
.modal-contenu { background: var(--bg-carte); width: 100%; max-width: 650px; max-height: 90vh; border-radius: 24px; overflow-y: auto; border: 1px solid var(--border-subtile); box-shadow: var(--shadow-premium); display: flex; flex-direction: column; position: relative; }
.modal-en-tete { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-subtile); position: sticky; top: 0; background: var(--bg-carte); z-index: 10; }
.modal-en-tete h3 { margin: 0; font-size: 1.2rem; color: var(--text-primary); }
.bouton-fermer-modal { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-secondary); }

.formulaire-vendeur { padding: 24px; }
.grille-formulaire { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.groupe-champ { display: flex; flex-direction: column; margin-bottom: 12px;}
.pleine-largeur { grid-column: 1 / -1; margin-bottom: 20px; }
.formulaire-vendeur label, .groupe-champ label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.formulaire-vendeur input[type="text"], .formulaire-vendeur input[type="number"], .formulaire-vendeur select, .formulaire-vendeur textarea, .groupe-champ input { padding: 12px 16px; border: 1px solid var(--border-subtile); border-radius: 12px; background: var(--bg-app); color: var(--text-primary); transition: all 0.2s; outline: none; }
.formulaire-vendeur input:focus, .formulaire-vendeur select:focus, .formulaire-vendeur textarea:focus, .groupe-champ input:focus { border-color: var(--accent-gold); }
.formulaire-vendeur textarea { min-height: 100px; resize: vertical; }

.selection-image { display: flex; gap: 12px; margin-bottom: 12px; }
.selection-image label { text-transform: none; font-weight: 500; background: var(--bg-app); padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border-subtile); cursor: pointer; display: flex; align-items: center; gap: 8px; }
.grille-prix-modulable { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.prix-format { background: var(--bg-app); padding: 12px; border-radius: 12px; border: 1px solid var(--border-subtile); display: flex; flex-direction: column; gap: 8px; }
.separateur-formulaire { border: none; border-top: 1px solid var(--border-subtile); margin: 24px 0; }
.zone-upload-image { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 30px; }
.options-image { flex: 1; }
.champ-image input { width: 100%; }
.input-file { padding: 10px; background: var(--bg-carte); border: 1px dashed var(--accent-gold); border-radius: 12px; width: 100%; color: var(--text-primary); }
.apercu-miniature { width: 120px; height: 120px; flex-shrink: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 2px solid var(--border-subtile); }
.vignette-apercu { width: 100%; height: 100%; object-fit: cover; }
.actions-formulaire-vendeur { display: flex; justify-content: flex-end; gap: 16px; padding-top: 20px; border-top: 1px solid var(--border-subtile); }
.bouton-annuler-edition, .bouton-valider-ajout { padding: 14px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none; }
.bouton-annuler-edition { background: var(--accent-gold-light); color: var(--text-primary); }
.bouton-valider-ajout { background: var(--accent-green); color: #fff; }

@media (max-width: 600px) { .grille-formulaire, .grille-prix-modulable { grid-template-columns: 1fr; } .zone-upload-image { flex-direction: column; } .apercu-miniature { width: 100%; height: 200px; } }
</style>