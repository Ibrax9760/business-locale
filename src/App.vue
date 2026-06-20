<script setup>
import { ref, computed } from 'vue'
import produitsData from './data/produits.json'
import equipementsData from './data/equipements.json'

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

const produits = ref(produitsData.map(p => ({ ...p, varianteChoisie: p.variantes[1] })))
const equipements = ref(equipementsData)

const notification = ref({ active: false, message: '' })
let timeoutId = null

const modeVendeur = ref(false)
const nouvelArticle = ref({
  type: 'gastronomie',
  titre: '',
  description: '',
  prix: '',
  image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
})

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
  if (!nouvelArticle.value.titre || !nouvelArticle.value.prix) {
    alert("Veuillez au moins renseigner un titre et un prix.")
    return
  }
  const imageFinale = nouvelArticle.value.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'

  if (nouvelArticle.value.type === 'gastronomie') {
    const nouveauPlat = {
      id: 'prod_temp_' + Date.now(),
      titre: nouvelArticle.value.titre,
      description: nouvelArticle.value.description,
      categorie: "Nouveau",
      image_url: imageFinale,
      variantes: [
        { id: "v_temp", nom: "Format Unique", prix: parseFloat(nouvelArticle.value.prix) }
      ],
      disponible: true
    }
    nouveauPlat.varianteChoisie = nouveauPlat.variantes[0]
    produits.value.push(nouveauPlat)
  } else {
    equipements.value.push({
      id: 'equip_temp_' + Date.now(),
      titre: nouvelArticle.value.titre,
      description: nouvelArticle.value.description,
      prix_journalier: parseFloat(nouvelArticle.value.prix),
      montant_caution: 0,
      image_url: imageFinale
    })
  }
  afficherNotification(`✅ ${nouvelArticle.value.titre} ajouté au catalogue !`)
  nouvelArticle.value.titre = ''
  nouvelArticle.value.description = ''
  nouvelArticle.value.prix = ''
}

// --- LOGIQUE FILTRES & RECHERCHE ---
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
    titreComplet = `${article.titre} (${article.varianteChoisie.nom})`
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
  afficherNotification(titreComplet)
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
    message += `- ${item.quantite}x ${item.titre} (${item.prix * item.quantite} €)\n`
  })
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`
  
  const url = `https://wa.me/33600000000?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
</script>

<template>
  <main>
    <header class="en-tete">
      <h1>Ma Boutique Locale</h1>
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
      <p class="avertissement">⚠️ Les ajouts sont temporaires pour la démonstration. Ils disparaîtront au rafraîchissement de la page.</p>
      <div class="formulaire-vendeur">
        <div class="groupe-champ"><label>Type d'article :</label><select v-model="nouvelArticle.type"><option value="gastronomie">Gastronomie (Plat)</option><option value="location">Équipement (Location)</option></select></div>
        <div class="groupe-champ"><label>Titre de l'article :</label><input type="text" v-model="nouvelArticle.titre" placeholder="Ex: Gâteau" /></div>
        <div class="groupe-champ"><label>Description :</label><textarea v-model="nouvelArticle.description" placeholder="Description..."></textarea></div>
        <div class="groupe-champ"><label>Prix (€) :</label><input type="number" v-model="nouvelArticle.prix" placeholder="Ex: 15" /></div>
        <div class="groupe-champ"><label>Lien image :</label><input type="text" v-model="nouvelArticle.image_url" /></div>
        <button @click="ajouterArticleVendeur" class="bouton-valider-ajout">➕ Ajouter au catalogue</button>
      </div>
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
        <div v-for="produit in produitsFiltrés" :key="produit.id" class="carte-produit">
          <img :src="produit.image_url" :alt="produit.titre" class="image-produit" />
          <h3>{{ produit.titre }}</h3>
          <p>{{ produit.description }}</p>
          <div class="selecteur-variante">
            <label>Choisir la taille :</label>
            <select v-model="produit.varianteChoisie">
              <option v-for="v in produit.variantes" :key="v.id" :value="v">{{ v.nom }} - {{ v.prix }} €</option>
            </select>
          </div>
          <button @click="ajouterAuPanier(produit, true)" class="bouton-ajout">Ajouter au panier ({{ produit.varianteChoisie.prix }} €)</button>
        </div>
      </section>

      <section v-if="equipementsFiltrés.length > 0">
        <h2>Location d'Équipements</h2>
        <div v-for="equipement in equipementsFiltrés" :key="equipement.id" class="carte-equipement">
          <img :src="equipement.image_url" :alt="equipement.titre" class="image-produit" />
          <h3>{{ equipement.titre }}</h3>
          <p>{{ equipement.description }}</p>
          <p class="prix"><strong>Prix par jour :</strong> {{ equipement.prix_journalier }} €</p>
          <button @click="ajouterAuPanier(equipement)" class="bouton-ajout">Réserver</button>
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
/* styles de base existants */
main { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; color: #2c3e50; }
.en-tete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.actions-entete { display: flex; gap: 10px; }
.panier-encart { background-color: #2ecc71; color: white; padding: 10px 15px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; }
.barre-recherche { margin-bottom: 20px; }
.barre-recherche input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 1em; box-sizing: border-box;}
.menu-navigation { display: flex; gap: 10px; margin-bottom: 25px; background-color: #ecf0f1; padding: 8px; border-radius: 8px; }
.menu-navigation button { flex: 1; padding: 10px; border: none; background: transparent; font-weight: bold; color: #7f8c8d; cursor: pointer; border-radius: 6px; }
.menu-navigation button.actif { background-color: white; color: #2c3e50; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.carte-produit, .carte-equipement { border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 25px; border-radius: 8px; background-color: #f9f9f9; }
.image-produit { width: 100%; height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 10px; }
.selecteur-variante { margin: 15px 0; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #eee; }
.selecteur-variante label { font-size: 0.8em; color: #7f8c8d; display: block; margin-bottom: 5px; }
.selecteur-variante select { width: 100%; padding: 8px; border: none; font-size: 1em; background: transparent; cursor: pointer;}
.bouton-ajout { width: 100%; padding: 12px; background-color: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; }

/* Tiroir & Formulaires */
.fond-sombre { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 1000; display: flex; justify-content: flex-end; }
.tiroir-panier { width: 355px; height: 100%; background-color: white; padding: 20px; display: flex; flex-direction: column; box-sizing: border-box; }
.contenu-panier { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.liste-panier { list-style: none; padding: 0; margin: 0; }
.item-panier { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
.formulaire-client { margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; }
.formulaire-client h3 { font-size: 0.95em; margin-top: 0; margin-bottom: 10px; }
.formulaire-client input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;}
.formulaire-client label { font-size: 0.8em; color: #7f8c8d; }
.bouton-whatsapp { width: 100%; padding: 15px; background-color: #25D366; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background-color: #34495e; color: white; padding: 12px 24px; border-radius: 30px; transition: transform 0.4s; z-index: 2000; }
.notification.visible { transform: translateX(-50%) translateY(0); }
.controle-quantite { display: flex; align-items: center; gap: 8px; }
.controle-quantite button { width: 25px; height: 25px; border-radius: 50%; border: 1px solid #ddd; cursor: pointer; }

/* Vendeur styles */
.bouton-vendeur { background-color: #f39c12; color: white; border: none; border-radius: 8px; padding: 10px 12px; font-weight: bold; cursor: pointer; }
.panneau-admin { background-color: #fff8e1; border: 2px dashed #f39c12; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
.avertissement { font-size: 0.85em; color: #d35400; margin-bottom: 15px; font-style: italic; }
.formulaire-vendeur .groupe-champ { margin-bottom: 12px; }
.formulaire-vendeur label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 0.85em; }
.formulaire-vendeur input, .formulaire-vendeur select, .formulaire-vendeur textarea { width: 100%; padding: 10px; border: 1px solid #f39c12; border-radius: 6px; box-sizing: border-box; }
.bouton-valider-ajout { width: 100%; padding: 15px; background-color: #e67e22; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

/* --- NOUVEAU : STYLE DE LA ZONE LOGISTIQUE MAYOTTE --- */
.zone-livraison {
  margin: 15px 0;
  padding: 12px;
  background-color: #edf2f7;
  border-radius: 8px;
}
.zone-livraison h3 { font-size: 0.95em; margin-top: 0; margin-bottom: 10px; }
.options-radio { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.options-radio label { font-size: 0.9em; cursor: pointer; display: flex; align-items: center; gap: 5px;}
.sous-options { margin-top: 10px; border-top: 1px solid #cbd5e0; padding-top: 10px; }
.sous-options label { font-size: 0.8em; color: #4a5568; display: block; margin-bottom: 5px; }
.sous-options select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 0.9em; }
.info-livraison { font-size: 0.85em; color: #2b6cb0; font-style: italic; margin-top: 5px; }

.details-calcul { margin-bottom: 15px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
.details-calcul p { margin: 5px 0; font-size: 0.9em; display: flex; justify-content: space-between; }
.details-calcul .total { font-size: 1.2em; border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: 5px; }
</style>