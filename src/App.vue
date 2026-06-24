<script setup>
import { ref, computed, onMounted } from 'vue'
// Importation du client Supabase que nous avons configuré
import { supabase } from './utils/supabaseClient'

import EnTete from './components/EnTete.vue'
import PanneauVendeur from './components/PanneauVendeur.vue'
import CarteProduit from './components/CarteProduit.vue'
import CarteEquipement from './components/CarteEquipement.vue'
import TiroirPanier from './components/TiroirPanier.vue'

// --- ÉTAT DE L'APPLICATION ---
const panier = ref([])
const panierOuvert = ref(false)
const pageActive = ref('tout')
const recherche = ref('')
const nomClient = ref('')
const dateCommande = ref('')

// Variables logistiques
const modeLivraison = ref('retrait')
const lieuRetrait = ref('dzaoudzi')

// Variables de données (qui vont recevoir les données de Supabase)
const produits = ref([])
const equipements = ref([])

// Chargement des données depuis Supabase avec hydratation des métadonnées frontales
const chargerDonnees = async () => {
  try {
    // 1. Requête et formatage de la table gastronomie
    const { data: dataPlats, error: errorPlats } = await supabase
      .from('produits_gastronomie')
      .select('*')
    
    if (errorPlats) throw errorPlats
    
    produits.value = dataPlats.map(p => ({
      ...p,
      type: 'gastronomie', // Réinjection de la propriété d'identification
      varianteChoisie: p.variantes && p.variantes.length > 0 ? p.variantes[0] : null
    }))

    // 2. Requête et formatage de la table équipements
    const { data: dataEquipements, error: errorEquipements } = await supabase
      .from('equipements_location')
      .select('*')
      
    if (errorEquipements) throw errorEquipements
    
    equipements.value = dataEquipements.map(e => ({
      ...e,
      type: 'location' // Réinjection de la propriété d'identification
    }))
    
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error.message)
    afficherNotification("❌ Erreur de connexion à la base de données")
  }
}

// Exécuter le chargement au lancement de l'application
onMounted(() => {
  chargerDonnees()
})

const notification = ref({ active: false, message: '' })
let timeoutId = null

const afficherNotification = (texte) => {
  notification.value.message = texte
  notification.value.active = true
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => notification.value.active = false, 3000)
}

// --- VARIABLES ET LOGIQUE DU MODE VENDEUR ---
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
  prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' },
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
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality))
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
    console.warn('Erreur compression image', error)
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
    prixParFormat: { 'Format Petit': '', 'Format Moyen': '', 'Format Grand': '' },
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
  }
}

const demarrerEdition = (article, type) => {
  modeEdition.value = true
  articleEnEdition.value = article
  typeArticleEnEdition.value = type
  imageSource.value = article.image_url && article.image_url.startsWith('data:') ? 'local' : 'web'
  
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
}

const supprimerArticleVendeur = async (article, type) => {
  const confirmation = confirm(`Voulez-vous vraiment supprimer l'article : ${article.titre} ?`)
  if (!confirmation) return

  try {
    if (type === 'gastronomie') {
      const { error } = await supabase.from('produits_gastronomie').delete().eq('id', article.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('equipements_location').delete().eq('id', article.id)
      if (error) throw error
    }
    afficherNotification(`🗑️ Article supprimé de la base de données`)
    await chargerDonnees()
    if (articleEnEdition.value?.id === article.id) resetVendeurForm()
  } catch (error) {
    console.error("Erreur de suppression:", error.message)
    afficherNotification("❌ Échec de la suppression de l'article")
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
      afficherNotification(`✏️ Article modifié avec succès`)
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
      afficherNotification(`✅ Article ajouté au catalogue`)
    }
    await chargerDonnees()
    resetVendeurForm()
  } catch (error) {
    console.error("Erreur d'écriture:", error.message)
    afficherNotification("❌ Échec de l'enregistrement des données")
  }
}
// --- LOGIQUE FILTRES & RECHERCHE ---
const produitsFiltrés = computed(() => {
  return produits.value.filter(p => {
    const correspondRecherche = p.titre.toLowerCase().includes(recherche.value.toLowerCase()) || 
                                (p.description && p.description.toLowerCase().includes(recherche.value.toLowerCase()))
    return correspondRecherche && (pageActive.value === 'tout' || pageActive.value === 'gastronomie')
  })
})

const equipementsFiltrés = computed(() => {
  return equipements.value.filter(e => {
    const correspondRecherche = e.titre.toLowerCase().includes(recherche.value.toLowerCase()) || 
                                (e.description && e.description.toLowerCase().includes(recherche.value.toLowerCase()))
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

// --- CALCULS LOGISTIQUES ---
const fraisLogistique = computed(() => {
  if (modeLivraison.value === 'livraison') return 2
  if (modeLivraison.value === 'retrait' && lieuRetrait.value === 'mamoudzou') return 3
  return 0
})

const totalArticles = computed(() => panier.value.reduce((total, item) => total + (item.prix * item.quantite), 0))
const totalGénéral = computed(() => totalArticles.value + fraisLogistique.value)

const commanderSurWhatsApp = () => {
  // 1. Validation stricte des saisies utilisateur
  if (!nomClient.value || !dateCommande.value) {
    alert("Veuillez impérativement renseigner votre nom et la date de récupération.");
    return;
  }
  if (panier.value.length === 0) {
    alert("Votre panier est vide.");
    return;
  }

  // 2. Construction d'un véritable ticket de caisse digital
  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛍️ *NOUVELLE COMMANDE*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  // --- INFOS CLIENT ---
  message += `👤 *Client :* ${nomClient.value}\n`;
  message += `📅 *Date prévue :* ${dateCommande.value}\n`;
  
  if (modeLivraison.value === 'livraison') {
    message += `🛵 *Logistique :* Livraison (Petite-Terre)\n\n`;
  } else {
    const lieu = lieuRetrait.value === 'dzaoudzi' ? 'Dzaoudzi' : 'Mamoudzou';
    message += `📦 *Logistique :* Retrait sur place (${lieu})\n\n`;
  }

  // --- DÉTAIL DES ARTICLES ---
  message += `📝 *RÉSUMÉ DES ARTICLES*\n`;
  message += `──────────────────────\n`;

  panier.value.forEach(item => {
    let nomArticle = item.titre;
    let details = "";
    
    // Scission intelligente : Si le titre contient une variante (ex: "Test 1 - Format Grand")
    if (item.titre.includes(" - ")) {
      const parts = item.titre.split(" - ");
      nomArticle = parts[0]; // Récupère "Test 1"
      details = `\n   ↳ ${parts.slice(1).join(" - ")}`; // Aligne "Format Grand" en dessous avec une flèche
    }
    
    message += `▪️ *${item.quantite}x ${nomArticle}*${details} (${item.prix} €)\n`;
  });

  // --- FACTURATION ---
  message += `\n💳 *DÉTAIL DE FACTURATION*\n`;
  message += `──────────────────────\n`;
  
  const sousTotal = totalGénéral.value - fraisLogistique.value;
  message += `Sous-total : ${sousTotal} €\n`;
  
  if (fraisLogistique.value > 0) {
    message += `Frais logistiques : ${fraisLogistique.value} €\n`;
  }
  
  message += `\n*TOTAL À PAYER : ${totalGénéral.value} €*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Merci de confirmer la bonne réception de cette commande. ✅`;

  // 3. Routage vers WhatsApp
  const numeroVendeur = "262639610515"; 
  const urlApi = `https://wa.me/${numeroVendeur}?text=${encodeURIComponent(message)}`;
  
  window.open(urlApi, '_blank');
};
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

    <div v-show="!modeVendeur">
      <section class="recherche-section">
        <h2 class="titre-section">Que cherchez-vous ?</h2>
        
        <div class="barre-recherche-container">
          <span class="icone-loupe">🔍</span>
          <input 
            type="text" 
            class="champ-recherche" 
            placeholder="Rechercher un plat ou un équipement..." 
            v-model="recherche" 
          />
        </div>

        <div class="filtres-container">
          <button 
            class="chip-filtre" 
            :class="{ actif: pageActive === 'tout' }" 
            @click="pageActive = 'tout'">
            Tout
          </button>
          <button 
            class="chip-filtre" 
            :class="{ actif: pageActive === 'gastronomie' }" 
            @click="pageActive = 'gastronomie'">
            Gastronomie
          </button>
          <button 
            class="chip-filtre" 
            :class="{ actif: pageActive === 'location' }" 
            @click="pageActive = 'location'">
            Locations
          </button>
        </div>
      </section>

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
              <label :class="{ actif: modeLivraison === 'retrait' }">
                <input type="radio" v-model="modeLivraison" value="retrait" />
                📦 Click & Collect (Retrait)
              </label>
              <label :class="{ actif: modeLivraison === 'livraison' }">
                <input type="radio" v-model="modeLivraison" value="livraison" />
                🛵 Livraison Petite-Terre (+2 €)
              </label>
            </div>

            <div v-if="modeLivraison === 'retrait'" class="sous-options animate-fade">
              <label>Lieu de retrait disponible :</label>
              <select v-model="lieuRetrait">
                <option value="dzaoudzi">Dzaoudzi (Petite-Terre) - Gratuit</option>
                <option value="mamoudzou">Mamoudzou (Pied de la barge Grande-Terre) - +3 €</option>
              </select>
            </div>

            <div v-if="modeLivraison === 'livraison'" class="info-livraison animate-fade">
              📍 Note : Les livraisons sont limitées exclusivement au secteur géographique de Petite-Terre.
            </div>
          </div>

          <div class="formulaire-client">
            <h3>Vos Informations</h3>
            <input type="text" v-model="nomClient" placeholder="Votre nom complet" />
            <label>Date de récupération souhaitée :</label>
            <input type="date" v-model="dateCommande" />
          </div>

          <div class="pied-tiroir">
            <div class="details-calcul">
              <p><span>Articles :</span> <strong>{{ totalArticles }} €</strong></p>
              <p><span>Frais logistiques :</span> <strong>{{ fraisLogistique }} €</strong></p>
              <p class="total"><span>Total Général :</span> <strong>{{ totalGénéral }} €</strong></p>
            </div>
            <button @click="commanderSurWhatsApp" class="bouton-whatsapp">Valider et envoyer via WhatsApp</button>
          </div>
        </div>
      </div>
    </div>

    <div :class="['notification', { 'visible': notification.active }]">{{ notification.message }}</div>
       
  <PanneauVendeur 
     v-if="modeVendeur"
     :produits="produits" 
     :equipements="equipements" 
     @refresh-data="chargerDonnees"
     @afficher-notification="afficherNotification"
   />
  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;700&display=swap');

* {
  box-sizing: border-box;
}

main {
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #f8f6f0;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  color: #2c2520;
  padding: 18px 16px 44px;
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
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  line-height: 1.05;
  margin: 0;
  color: #3b302a;
}

.en-tete .sous-titre {
  color: #6b7b8c;
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
  border-radius: 50px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  font-family: 'Inter', sans-serif;
}

.bouton-vendeur {
  padding: 14px 20px;
  background: linear-gradient(135deg, #bc6c46, #d98f6a);
  color: white;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(188, 108, 70, 0.2);
  cursor: pointer;
}

.panier-encart {
  background: linear-gradient(135deg, #74b4aa, #8bc9bf);
  color: white;
  padding: 14px 18px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(116, 180, 170, 0.2);
  cursor: pointer;
}

.bouton-vendeur:hover,
.panier-encart:hover,
.bouton-ajout:hover,
.bouton-whatsapp:hover,
.bouton-valider-ajout:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #74b4aa;
  box-shadow: 0 0 0 4px rgba(116, 180, 170, 0.15);
}

/* --- RECHERCHE & FILTRES --- */
.recherche-section {
  margin-bottom: 40px;
  max-width: 800px;
}

.titre-section {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  color: #3b302a;
  margin-bottom: 20px;
  letter-spacing: 0.01em;
}

.barre-recherche-container {
  position: relative;
  margin-bottom: 24px;
  width: 100%;
}

.icone-loupe {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  font-size: 1.2rem;
  pointer-events: none;
}

.champ-recherche {
  width: 100%;
  box-sizing: border-box;
  padding: 16px 20px 16px 56px;
  border-radius: 50px;
  border: 1px solid #e0dcd3;
  background-color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #2c2520;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
}

.champ-recherche:focus {
  outline: none;
  border-color: #74b4aa;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(116, 180, 170, 0.2);
}

.champ-recherche::placeholder {
  color: #a09b96;
}

.filtres-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.chip-filtre {
  padding: 10px 24px;
  border-radius: 50px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: transparent;
  border: 1px solid #bc6c46;
  color: #bc6c46;
}

.chip-filtre.actif {
  background-color: #2b4c40;
  border-color: #2b4c40;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(43, 76, 64, 0.3);
}

/* --- STRUCTURES CARTES & GRILLES --- */
.carte-produit,
.carte-equipement,
.carte-vendeur {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}

.grille-produits,
.grille-equipements {
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
}

.image-produit {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 20px;
  margin-bottom: 14px;
}

.carte-produit h3,
.carte-equipement h3 {
  font-family: 'Playfair Display', serif;
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: #3b302a;
}

.bouton-ajout {
  width: 100%;
  padding: 14px 16px;
  background: #2b4c40;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

/* --- DESIGN AVANCÉ DU PANIER (OPTION 1) --- */
.fond-sombre {
  position: fixed;
  inset: 0;
  background-color: rgba(31, 26, 23, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.tiroir-panier {
  width: min(450px, 100%);
  height: 100%;
  background: #fdfdfb;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.05);
}

.entete-tiroir h2 {
  font-family: 'Playfair Display', serif;
  margin: 0;
  font-size: 1.6rem;
  color: #3b302a;
}

.bouton-fermer {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0dcd3;
  border: none;
  color: #3b302a;
  cursor: pointer;
  font-weight: 700;
}

.contenu-panier {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  gap: 20px;
  padding-right: 4px;
}

.item-panier {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #f0ece3;
  border-radius: 20px;
}

.zone-livraison,
.formulaire-client,
.details-calcul {
  background: #ffffff;
  border-radius: 24px;
  padding: 20px;
  border: 1px solid #f0ece3;
}

.zone-livraison h3,
.formulaire-client h3 {
  font-family: 'Playfair Display', serif;
  margin: 0 0 14px;
  font-size: 1.15rem;
  color: #3b302a;
}

.options-radio {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.options-radio label {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e0dcd3;
  background: #fdfdfb;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.options-radio label:has(input:checked) {
  border-color: #2b4c40;
  background: rgba(43, 76, 64, 0.05);
  color: #2b4c40;
}

.sous-options {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0ece3;
}

.sous-options select {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e0dcd3;
  font-family: 'Inter', sans-serif;
  background-color: #ffffff;
}

.info-livraison {
  margin-top: 12px;
  font-size: 0.9rem;
  color: #bc6c46;
  font-weight: 600;
}

.formulaire-client input {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e0dcd3;
  margin-bottom: 12px;
}

.details-calcul p {
  margin: 0 0 8px;
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #6b7b8c;
}

.details-calcul .total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px dashed #e0dcd3;
  font-size: 1.2rem;
  color: #2b4c40;
}

.bouton-whatsapp {
  width: 100%;
  padding: 16px;
  background: #25D366;
  color: white;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.2);
  text-transform: uppercase;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}

.notification {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%) translateY(120px);
  background: rgba(43, 76, 64, 0.95);
  color: white;
  padding: 14px 24px;
  border-radius: 999px;
  font-weight: 600;
  z-index: 2000;
  transition: transform 0.3s ease;
}

/* Personnalisation avancée du menu déroulant public */
.selecteur-variante select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 100%;
  max-width: 300px;
  padding: 12px 40px 12px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1f2833;
  background-color: #f8fafc;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* Injection vectorielle d'une flèche personnalisée */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.selecteur-variante select:focus {
  outline: none;
  border-color: #b35034;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(179, 80, 52, 0.1);
}

.selecteur-variante label {
  display: block;
  font-size: 0.85rem;
  color: #6b7b8c;
  margin-bottom: 6px;
  font-weight: 600;
}

.notification.visible {
  transform: translateX(-50%) translateY(0);
}

.animate-fade {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 700px) {
  .grille-produits, .grille-equipements { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1050px) {
  .grille-produits, .grille-equipements { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .tiroir-panier { width: 100%; }
}
</style>