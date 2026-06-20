<script setup>
import { ref, computed } from 'vue'
import produitsData from './data/produits.json'
import equipementsData from './data/equipements.json'

const LS_PRODUITS_AJOUTES = 'business-locale-produits-ajoutes'
const LS_EQUIPEMENTS_AJOUTES = 'business-locale-equipements-ajoutes'

const getStoredItems = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch (error) {
    console.warn(`Impossible de lire ${key} depuis localStorage`, error)
    return []
  }
}

const saveStoredItems = (key, items) => {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (error) {
    console.warn(`Impossible d'enregistrer ${key} dans localStorage`, error)
  }
}

// --- ÉTAT DE L'APPLICATION ---
const panier = ref([])
const panierOuvert = ref(false)
const pageActive = ref('tout')
const recherche = ref('')
const nomClient = ref('')
const dateCommande = ref('')

// NOUVEAU : Variables pour la logistique de Mayotte
const modeLivraison = ref('retrait') // Peut être 'retrait' ou 'livraison'
const lieuRetrait = ref('dzaoudzi') // Peut être 'dzaoudzi' ou 'mamoudzou'

const produitsAjoutes = ref(getStoredItems(LS_PRODUITS_AJOUTES).map(item => ({
  ...item,
  varianteChoisie: item.variantes ? item.variantes[0] : null
})))
const equipementsAjoutes = ref(getStoredItems(LS_EQUIPEMENTS_AJOUTES))

const produits = ref([
  ...produitsData.map(p => ({ ...p, varianteChoisie: p.variantes[1] })),
  ...produitsAjoutes.value
])
const equipements = ref([
  ...equipementsData,
  ...equipementsAjoutes.value
])

const saveProduitsAjoutes = () => saveStoredItems(LS_PRODUITS_AJOUTES, produitsAjoutes.value)
const saveEquipementsAjoutes = () => saveStoredItems(LS_EQUIPEMENTS_AJOUTES, equipementsAjoutes.value)

const notification = ref({ active: false, message: '' })
let timeoutId = null

const modeVendeur = ref(false)
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
    console.warn('Erreur lors de la compression de l’image', error)
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
    },
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
  }
}

const demarrerEdition = (article, type) => {
  modeEdition.value = true
  articleEnEdition.value = article
  typeArticleEnEdition.value = type
  imageSource.value = article.image_url && article.image_url.startsWith('data:') ? 'local' : 'web'
  const isModulable = type === 'gastronomie' && article.variantes?.length > 1
  const prixParFormat = {
    'Format Petit': '',
    'Format Moyen': '',
    'Format Grand': ''
  }
  if (isModulable) {
    article.variantes.forEach(v => {
      if (formatOptions.includes(v.nom)) {
        prixParFormat[v.nom] = v.prix
      }
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
    const index = produits.value.findIndex(item => item.id === article.id)
    if (index !== -1) produits.value.splice(index, 1)
    const localIndex = produitsAjoutes.value.findIndex(item => item.id === article.id)
    if (localIndex !== -1) {
      produitsAjoutes.value.splice(localIndex, 1)
      saveProduitsAjoutes()
    }
  } else {
    const index = equipements.value.findIndex(item => item.id === article.id)
    if (index !== -1) equipements.value.splice(index, 1)
    const localIndex = equipementsAjoutes.value.findIndex(item => item.id === article.id)
    if (localIndex !== -1) {
      equipementsAjoutes.value.splice(localIndex, 1)
      saveEquipementsAjoutes()
    }
  }
  if (articleEnEdition.value?.id === article.id) resetVendeurForm()
  afficherNotification(`🗑️ Article supprimé : ${article.titre}`)
}

// --- CALCUL DES FRAIS DE LIVRAISON / RETRAIT ---
const fraisLogistique = computed(() => {
  if (modeLivraison.value === 'livraison') {
    return 2 // Livraison Petite-Terre = 2€
  } else if (modeLivraison.value === 'retrait' && lieuRetrait.value === 'mamoudzou') {
    return 3 // Retrait Pied de la barge Mamoudzou = 3€
  }
  return 0 // Retrait Dzaoudzi = Gratuit
})

const totalArticles = computed(() => {
  return panier.value.reduce((total, item) => total + (item.prix * item.quantite), 0)
})

// Le total général inclut désormais les frais logistiques
const totalGénéral = computed(() => {
  return totalArticles.value + fraisLogistique.value
})

// --- FONCTIONNALITÉ VENDEUR ---
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
      return [
        {
          id: 'v_temp_' + Date.now(),
          nom: nouvelArticle.value.variante_nom,
          prix: parseFloat(nouvelArticle.value.prix)
        }
      ]
    }
    return formatOptions.map(format => ({
      id: `v_temp_${format.replace(/\s+/g, '_')}`,
      nom: format,
      prix: parseFloat(nouvelArticle.value.prixParFormat[format])
    }))
  }

  if (modeEdition.value && articleEnEdition.value) {
    articleEnEdition.value.titre = nouvelArticle.value.titre
    articleEnEdition.value.description = nouvelArticle.value.description
    articleEnEdition.value.image_url = imageFinale

    if (typeArticleEnEdition.value === 'gastronomie') {
      articleEnEdition.value.variantes = buildVariantes()
      articleEnEdition.value.varianteChoisie = articleEnEdition.value.variantes[0]
      saveProduitsAjoutes()
    } else {
      articleEnEdition.value.prix_journalier = parseFloat(nouvelArticle.value.prix)
      saveEquipementsAjoutes()
    }

    afficherNotification(`✏️ Article modifié : ${articleEnEdition.value.titre}`)
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
    produitsAjoutes.value.push(nouveauPlat)
    saveProduitsAjoutes()
    produits.value.push(nouveauPlat)
  } else {
    const nouvelEquipement = {
      id: 'equip_temp_' + Date.now(),
      titre: nouvelArticle.value.titre,
      description: nouvelArticle.value.description,
      prix_journalier: parseFloat(nouvelArticle.value.prix),
      montant_caution: 0,
      image_url: imageFinale
    }
    equipementsAjoutes.value.push(nouvelEquipement)
    saveEquipementsAjoutes()
    equipements.value.push(nouvelEquipement)
  }

  afficherNotification(`✅ ${nouvelArticle.value.titre} ajouté au catalogue !`)
  resetVendeurForm()
}

// --- LOGIQUE FILTRES & RECHERCHE ---
const produitsVendeur = computed(() => produits.value.filter(p => p.titre))
const equipementsVendeur = computed(() => equipements.value.filter(e => e.titre))

const produitsFiltrés = computed(() => {
  return produits.value.filter(p => {
    const correspondRecherche = p.titre.toLowerCase().includes(recherche.value.toLowerCase()) || p.description.toLowerCase().includes(recherche.value.toLowerCase())
    return correspondRecherche && (pageActive.value === 'tout' || pageActive.value === 'gastronomie')
  })
})

const equipementsFiltrés = computed(() => {
  return equipements.value.filter(e => {
    const correspondRecherche = e.titre.toLowerCase().includes(recherche.value.toLowerCase()) || e.description.toLowerCase().includes(recherche.value.toLowerCase())
    return correspondRecherche && (pageActive.value === 'tout' || pageActive.value === 'location')
  })
})

// --- GESTION DU PANIER ---
const ajouterAuPanier = (article, estProduit = false) => {
  let idUnique, titreComplet, prixFinal

  if (estProduit) {
    idUnique = `${article.id}-${article.varianteChoisie.id}`
    titreComplet = `${article.titre} - ${article.varianteChoisie.nom}`
    prixFinal = article.varianteChoisie.prix
  } else {
    idUnique = article.id
    titreComplet = article.titre
    prixFinal = article.prix_journalier
  }

  const articleExistant = panier.value.find(item => item.idUnique === idUnique)
  if (articleExistant) {
    articleExistant.quantite++
  } else {
    panier.value.push({ idUnique, titre: titreComplet, prix: prixFinal, quantite: 1 })
  }
  afficherNotification(`✅ ${titreComplet} ajouté au panier`)
}

const modifierQuantite = (idUnique, changement) => {
  const index = panier.value.findIndex(item => item.idUnique === idUnique)
  if (index !== -1) {
    panier.value[index].quantite += changement
    if (panier.value[index].quantite <= 0) panier.value.splice(index, 1)
    if (panier.value.length === 0) panierOuvert.value = false
  }
}

const afficherNotification = (texte) => {
  notification.value.message = texte
  notification.value.active = true
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => notification.value.active = false, 3000)
}

// --- ENVOI WHATSAPP MIS À JOUR AVEC LES INFOS DE LIVRAISON ---
const commanderSurWhatsApp = () => {
  if (!nomClient.value || !dateCommande.value) {
    alert("Merci d'indiquer votre nom et la date souhaitée.")
    return
  }

  let message = `*NOUVELLE COMMANDE*\n`
  message += `Client : ${nomClient.value}\n`
  message += `Date : ${dateCommande.value}\n`
  
  // Détail logistique dans le message
  if (modeLivraison.value === 'livraison') {
    message += `Type : Livraison (Petite-Terre)\n`
  } else {
    const lieu = lieuRetrait.value === 'dzaoudzi' ? 'Dzaoudzi (Petite-Terre)' : 'Pied de la barge (Mamoudzou)'
    message += `Type : Récupération à ${lieu}\n`
  }
  
  message += `--------------------------\n`
  
  panier.value.forEach(item => {
    message += `- ${item.quantite}x ${item.titre} - ${item.prix * item.quantite} €\n`
  })
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`
  
  const url = `https://wa.me/262639610515?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
</script>

<template>
  <main>
    <header class="en-tete">
      <div>
        <h1>Ma Boutique Locale</h1>
        <p class="sous-titre">Une expérience gourmande et pratique, pensée pour mobile : plats locaux, locations faciles et commandes rapides.</p>
      </div>
      <div class="actions-entete">
        <button class="bouton-vendeur" @click="modeVendeur = !modeVendeur">
          {{ modeVendeur ? 'Quitter Mode Vendeur' : '👨‍💼 Accès Vendeur' }}
        </button>
        <button class="panier-encart" @click="panierOuvert = true">
          🛒 Panier : {{ panier.length }}
        </button>
      </div>
    </header>

    <section v-if="modeVendeur" class="panneau-admin">
      <h2>Espace Vendeur - Ajouter un article</h2>
      <div class="bloc-info">
        <p>Bienvenue dans l’espace vendeur : ajoute, modifie et publie des articles directement sur la boutique.</p>
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
          {{ modeEdition ? '✏️ Modifier l’article' : '➕ Ajouter au catalogue' }}
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

    <div v-show="!modeVendeur">
      <div class="barre-recherche">
        <input type="text" v-model="recherche" placeholder="Rechercher un plat ou un équipement..." />
      </div>
      
      <nav class="menu-navigation">
        <button :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">Tout</button>
        <button :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">Gastronomie</button>
        <button :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">Locations</button>
      </nav>

      <section v-if="produitsFiltrés.length > 0">
        <h2>Notre Carte</h2>
        <div class="grille-produits">
          <div v-for="produit in produitsFiltrés" :key="produit.id" class="carte-produit">
            <img :src="produit.image_url" :alt="produit.titre" class="image-produit" />
            <h3>{{ produit.titre }}</h3>
            <p>{{ produit.description }}</p>
                  <div class="selecteur-variante" v-if="produit.variantes?.length > 1">
              <label>Choisir la taille :</label>
              <select v-model="produit.varianteChoisie">
                <option v-for="v in produit.variantes" :key="v.id" :value="v">{{ v.nom }} - {{ v.prix }} €</option>
              </select>
            </div>
            <p v-else class="prix-unique">{{ produit.variantes[0].nom }} - {{ produit.variantes[0].prix }} €</p>
            <button @click="ajouterAuPanier(produit, true)" class="bouton-ajout">Ajouter au panier ({{ produit.varianteChoisie.prix }} €)</button>
          </div>
        </div>
      </section>

      <section v-if="equipementsFiltrés.length > 0">
        <h2>Location d'Équipements</h2>
        <div class="grille-equipements">
          <div v-for="equipement in equipementsFiltrés" :key="equipement.id" class="carte-equipement">
            <img :src="equipement.image_url" :alt="equipement.titre" class="image-produit" />
            <h3>{{ equipement.titre }}</h3>
            <p>{{ equipement.description }}</p>
            <p class="prix"><strong>Prix par jour :</strong> {{ equipement.prix_journalier }} €</p>
            <button @click="ajouterAuPanier(equipement)" class="bouton-ajout">Réserver</button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="panierOuvert" class="fond-sombre" @click.self="panierOuvert = false">
      <div class="tiroir-panier">
        <div class="entete-tiroir">
          <h2>Votre Commande</h2>
          <button @click="panierOuvert = false" class="bouton-fermer">✖</button>
        </div>

        <div v-if="panier.length === 0" class="panier-vide">Votre panier est vide.</div>

        <div v-else class="contenu-panier">
          <ul class="liste-panier">
            <li v-for="item in panier" :key="item.idUnique" class="item-panier">
              <div class="info-item">
                <span class="titre-item">{{ item.titre }}</span>
                <span class="prix-item">{{ item.prix }} € / unité</span>
              </div>
              <div class="controle-quantite">
                <button @click="modifierQuantite(item.idUnique, -1)">-</button>
                <span>{{ item.quantite }}</span>
                <button @click="modifierQuantite(item.idUnique, 1)">+</button>
              </div>
            </li>
          </ul>

          <div class="zone-livraison">
            <h3>Mode de récupération</h3>
            
            <div class="options-radio">
              <label>
                <input type="radio" v-model="modeLivraison" value="retrait" />
                Click & Collect (Retrait)
              </label>
              <label>
                <input type="radio" v-model="modeLivraison" value="livraison" />
                Livraison locale (+2 €)
              </label>
            </div>

            <div v-if="modeLivraison === 'retrait'" class="sous-options">
              <label>Lieu du retrait :</label>
              <select v-model="lieuRetrait">
                <option value="dzaoudzi">Dzaoudzi (Petite-Terre) - Gratuit</option>
                <option value="mamoudzou">Mamoudzou (Au pied de la barge) - +3 €</option>
              </select>
            </div>

            <div v-if="modeLivraison === 'livraison'" class="info-livraison">
              📍 Livraison uniquement en Petite-Terre.
            </div>
          </div>

          <div class="formulaire-client">
            <h3>Vos Informations</h3>
            <input type="text" v-model="nomClient" placeholder="Votre nom complet" />
            <label>Date souhaitée :</label>
            <input type="date" v-model="dateCommande" />
          </div>

          <div class="pied-tiroir">
            <div class="details-calcul">
              <p>Articles : {{ totalArticles }} €</p>
              <p>Logistique : {{ fraisLogistique }} €</p>
              <p class="total">Total : <strong>{{ totalGénéral }} €</strong></p>
            </div>
            <button @click="commanderSurWhatsApp" class="bouton-whatsapp">Commander via WhatsApp</button>
          </div>
        </div>
      </div>
    </div>

    <div :class="['notification', { 'visible': notification.active }]">{{ notification.message }}</div>
  </main>
</template>

<style scoped>
:root {
  --bg-page: #f6f3ef;
  --surface: rgba(255, 255, 255, 0.95);
  --surface-strong: #ffffff;
  --text: #1f2833;
  --text-muted: #6b7b8c;
  --accent: #f08a5d;
  --accent-dark: #b35034;
  --accent-soft: #ffe7db;
  --success: #2abf84;
  --warning: #f1b24a;
  --border: rgba(31, 40, 51, 0.08);
  --shadow: 0 24px 70px rgba(31, 40, 51, 0.08);
}

* {
  box-sizing: border-box;
}

main {
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at top, #fff7f1 0%, #f8efe8 28%, #f0ece8 100%);
  color: var(--text);
  padding: 18px 16px 44px;
}

main::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(240, 138, 93, 0.16), transparent 24%),
              radial-gradient(circle at bottom right, rgba(42, 191, 132, 0.14), transparent 22%);
  pointer-events: none;
  z-index: -1;
}

.en-tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 26px;
}

.en-tete h1 {
  font-size: 2rem;
  line-height: 1.05;
  margin: 0;
  letter-spacing: -0.03em;
}

.en-tete .sous-titre {
  color: var(--text-muted);
  margin-top: 8px;
  font-size: 1rem;
  max-width: 420px;
  line-height: 1.6;
}

.actions-entete {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  justify-content: flex-end;
}

.bouton-vendeur,
.panier-encart,
.bouton-ajout,
.bouton-whatsapp,
.bouton-valider-ajout,
.bouton-annuler-edition,
.actions-article-vendeur button {
  border: none;
  border-radius: 20px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.bouton-vendeur {
  padding: 14px 20px;
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  font-weight: 700;
  box-shadow: 0 16px 32px rgba(240, 138, 93, 0.24);
  cursor: pointer;
}

.bouton-vendeur:hover,
.panier-encart:hover,
.bouton-ajout:hover,
.bouton-whatsapp:hover,
.bouton-valider-ajout:hover,
.bouton-annuler-edition:hover,
.actions-article-vendeur button:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

.panier-encart {
  background: linear-gradient(135deg, #2abf84, #34d9a5);
  color: white;
  padding: 14px 18px;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(42, 191, 132, 0.18);
  cursor: pointer;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(240, 138, 93, 0.12);
  border-color: rgba(240, 138, 93, 0.4);
}

button:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(42, 191, 132, 0.16);
}

.carte-produit,
.carte-equipement,
.carte-vendeur {
  position: relative;
  overflow: hidden;
}

.carte-produit::after,
.carte-equipement::after,
.carte-vendeur::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(240, 138, 93, 0.12);
  top: -30px;
  right: -30px;
  pointer-events: none;
}

.carte-produit:hover,
.carte-equipement:hover,
.carte-vendeur:hover {
  transform: translateY(-2px);
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18); }
  50% { box-shadow: 0 24px 50px rgba(240, 138, 93, 0.24); }
}

.bouton-ajout,
.bouton-whatsapp,
.bouton-valider-ajout {
  animation: pulseGlow 5s ease-in-out infinite;
}

.panier-encart {
  background: linear-gradient(135deg, #2abf84, #2fdbac);
  color: white;
  padding: 12px 18px;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(42, 191, 132, 0.15);
  cursor: pointer;
}

.barre-recherche {
  margin-bottom: 20px;
}

.barre-recherche input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 18px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  color: var(--text);
  box-shadow: inset 0 1px 4px rgba(31, 40, 51, 0.05);
}

.menu-navigation {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  overflow-x: auto;
  padding: 8px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 1px 3px rgba(31, 40, 51, 0.06);
}

.menu-navigation::-webkit-scrollbar {
  display: none;
}

.menu-navigation button {
  flex: 0 0 auto;
  padding: 12px 16px;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  border-radius: 999px;
}

.menu-navigation button.actif {
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  box-shadow: 0 12px 20px rgba(240, 138, 93, 0.18);
}

.carte-produit,
.carte-equipement,
.carte-vendeur,
.formulaire-vendeur,
.tiroir-panier,
.formulaire-client,
.liste-panier,
.zone-livraison,
.details-calcul {
  backdrop-filter: blur(12px);
}

.carte-produit,
.carte-equipement,
.carte-vendeur {
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 28px;
  padding: 18px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.grille-produits,
.grille-equipements,
.grille-articles-vendeur {
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
}

.image-produit {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 24px;
  margin-bottom: 14px;
  box-shadow: inset 0 2px 16px rgba(0, 0, 0, 0.08);
}

.carte-produit h3,
.carte-equipement h3,
.carte-vendeur h4 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.carte-produit p,
.carte-equipement p,
.carte-vendeur p {
  color: var(--text-muted);
  line-height: 1.6;
}

.selecteur-variante {
  margin: 16px 0 10px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 18px;
  padding: 14px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.selecteur-variante label {
  font-size: 0.9rem;
  color: var(--text);
  display: block;
  margin-bottom: 8px;
}

.selecteur-variante select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  font-size: 1rem;
  color: var(--text);
  background: white;
}

.bouton-ajout {
  width: 100%;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18);
  margin-top: 12px;
  cursor: pointer;
}

.bouton-ajout:hover,
.bouton-whatsapp:hover,
.bouton-valider-ajout:hover,
.bouton-annuler-edition:hover,
.actions-article-vendeur button:hover {
  transform: translateY(-1px);
  opacity: 0.98;
}

.fond-sombre {
  position: fixed;
  inset: 0;
  background-color: rgba(18, 20, 26, 0.55);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  padding: 20px 0 20px 20px;
}

.tiroir-panier {
  width: min(420px, 100%);
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}

.entete-tiroir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.entete-tiroir h2 {
  margin: 0;
  font-size: 1.2rem;
}

.bouton-fermer {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2c3e50;
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.contenu-panier {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  gap: 18px;
}

.liste-panier {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.item-panier {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: rgba(240, 138, 93, 0.06);
  border-radius: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.titre-item {
  font-weight: 700;
  color: var(--text);
}

.prix-item {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.controle-quantite {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.controle-quantite button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: white;
  color: var(--text);
  cursor: pointer;
}

.formulaire-client,
.zone-livraison,
.details-calcul {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.formulaire-client h3,
.zone-livraison h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.formulaire-client input,
.formulaire-vendeur input,
.formulaire-vendeur select,
.formulaire-vendeur textarea,
.sous-options select {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: #fff;
  color: var(--text);
  font-size: 1rem;
}

.formulaire-client label,
.formulaire-vendeur label,
.sous-options label,
.options-radio label,
.selecteur-variante label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.bouton-whatsapp {
  width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #25D366, #1ebd58);
  color: white;
  font-weight: 700;
  border-radius: 18px;
  cursor: pointer;
  box-shadow: 0 20px 45px rgba(37, 211, 102, 0.2);
}

.notification {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%) translateY(120px);
  background: rgba(44, 62, 80, 0.9);
  color: white;
  padding: 14px 24px;
  border-radius: 999px;
  font-weight: 600;
  z-index: 2000;
  transition: transform 0.3s ease;
}

.notification.visible {
  transform: translateX(-50%) translateY(0);
}

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
}

.formulaire-vendeur .groupe-champ {
  margin-bottom: 18px;
}

.formulaire-vendeur label {
  color: var(--text);
  font-size: 0.95rem;
  margin-bottom: 10px;
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
}

.bouton-valider-ajout,
.bouton-annuler-edition {
  padding: 16px 18px;
  font-weight: 700;
}

.bouton-valider-ajout {
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
}

.bouton-annuler-edition {
  background: #aab3ba;
  color: white;
}

.liste-articles-vendeur {
  margin-top: 32px;
}

.grille-articles-vendeur {
  grid-template-columns: 1fr;
}

.carte-vendeur {
  position: relative;
  overflow: hidden;
}

.actions-article-vendeur {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.actions-article-vendeur button {
  padding: 14px 12px;
  font-weight: 700;
}

.actions-article-vendeur button:first-child {
  background: linear-gradient(135deg, #3498db, #5ac8ff);
  color: white;
}

.actions-article-vendeur .bouton-supprimer {
  background: linear-gradient(135deg, #e74c3c, #ff6a6a);
  color: white;
}

.prix-vendeur {
  margin-top: 14px;
  font-weight: 700;
  color: var(--accent-dark);
}

.zone-livraison {
  margin: 0;
}

.options-radio {
  display: grid;
  gap: 10px;
}

.options-radio label {
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
  background: white;
}

.sous-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(31, 40, 51, 0.08);
}

.details-calcul {
  display: grid;
  gap: 10px;
}

.details-calcul p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
}

.details-calcul .total {
  font-size: 1.15rem;
  color: var(--text);
  font-weight: 700;
}

@media (min-width: 700px) {
  .grille-produits,
  .grille-equipements {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1050px) {
  .grille-produits,
  .grille-equipements {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  main {
    padding: 16px 14px 32px;
  }

  .en-tete {
    align-items: flex-start;
  }

  .actions-entete {
    justify-content: space-between;
  }

  .menu-navigation {
    padding: 10px 6px;
  }

  .bouton-vendeur,
  .panier-encart,
  .bouton-ajout,
  .bouton-whatsapp,
  .bouton-valider-ajout,
  .bouton-annuler-edition,
  .actions-article-vendeur button,
  .bouton-fermer {
    border-radius: 16px;
  }

  .grille-articles-vendeur {
    grid-template-columns: 1fr;
  }

  .fond-sombre {
    padding: 14px 0 0 0;
    justify-content: center;
    align-items: flex-end;
  }

  .tiroir-panier {
    width: 100%;
    border-top-left-radius: 28px;
    border-top-right-radius: 28px;
    padding: 20px;
  }

  .entete-tiroir {
    flex-direction: column;
    align-items: flex-start;
  }

  .selection-image {
    gap: 8px;
  }
}
</style>