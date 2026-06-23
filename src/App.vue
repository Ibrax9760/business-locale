<script setup>
import { ref, computed } from 'vue'
import produitsData from './data/produits.json'
import equipementsData from './data/equipements.json'
import EnTete from './components/EnTete.vue'
import PanneauVendeur from './components/PanneauVendeur.vue'
import CarteProduit from './components/CarteProduit.vue'
import CarteEquipement from './components/CarteEquipement.vue'
import TiroirPanier from './components/TiroirPanier.vue'

// --- UTILITAIRES LOCALSTORAGE ---
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

// --- ÉTAT GLOBAL DE L'APPLICATION ---
const panier = ref([])
const panierOuvert = ref(false)
const pageActive = ref('tout')
const recherche = ref('')
const modeVendeur = ref(false)

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

const notification = ref({ active: false, message: '' })
let timeoutId = null

const saveProduitsAjoutes = () => saveStoredItems(LS_PRODUITS_AJOUTES, produitsAjoutes.value)
const saveEquipementsAjoutes = () => saveStoredItems(LS_EQUIPEMENTS_AJOUTES, equipementsAjoutes.value)

const afficherNotification = (texte) => {
  notification.value.message = texte
  notification.value.active = true
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => notification.value.active = false, 3000)
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

// --- GESTION DU PANIER (ajout simple) ---
const ajouterAuPanier = (itemData) => {
  const articleExistant = panier.value.find(item => item.idUnique === itemData.idUnique)
  if (articleExistant) {
    articleExistant.quantite++
  } else {
    panier.value.push(itemData)
  }
  afficherNotification(`✅ ${itemData.titre} ajouté au panier`)
}

// --- HANDLERS POUR LES COMPOSANTS ---
const handleToggleVendeur = () => {
  modeVendeur.value = !modeVendeur.value
}

const handleOpenPanier = () => {
  panierOuvert.value = true
}

const handleClosePanier = () => {
  panierOuvert.value = false
}

const handleUpdatePanier = (newPanier) => {
  panier.value = newPanier
}

const handleCommanderWhatsApp = ({ message }) => {
  const url = `https://wa.me/262639610515?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

const handleSaveProduits = () => {
  saveProduitsAjoutes()
}

const handleSaveEquipements = () => {
  saveEquipementsAjoutes()
}

const handleUpdateProduits = (produits_updated) => {
  produits.value = produits_updated
}

const handleUpdateEquipements = (equipements_updated) => {
  equipements.value = equipements_updated
}
</script>

<template>
  <main>
    <!-- EN-TÊTE GLOBAL -->
    <EnTete 
      :modeVendeur="modeVendeur"
      :panierLength="panier.length"
      @toggle-vendeur="handleToggleVendeur"
      @open-panier="handleOpenPanier"
    />

    <!-- PANNEAU VENDEUR -->
    <PanneauVendeur 
      v-if="modeVendeur"
      :produitsAjoutes="produitsAjoutes"
      :equipementsAjoutes="equipementsAjoutes"
      :produits="produits"
      :equipements="equipements"
      @save-produits="handleSaveProduits"
      @save-equipements="handleSaveEquipements"
      @update-produits="handleUpdateProduits"
      @update-equipements="handleUpdateEquipements"
      @afficher-notification="afficherNotification"
    />

    <!-- ZONE CLIENT (Recherche, Navigation, Grilles) -->
    <div v-show="!modeVendeur">
      <!-- Barre de recherche -->
      <div class="barre-recherche">
        <input type="text" v-model="recherche" placeholder="Rechercher un plat ou un équipement..." />
      </div>
      
      <!-- Menu de navigation -->
      <nav class="menu-navigation">
        <button :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">Tout</button>
        <button :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">Gastronomie</button>
        <button :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">Locations</button>
      </nav>

      <!-- Grille Produits -->
      <section v-if="produitsFiltrés.length > 0">
        <h2>Notre Carte</h2>
        <div class="grille-produits">
          <CarteProduit 
            v-for="produit in produitsFiltrés" 
            :key="produit.id" 
            :produit="produit"
            @ajouter-panier="ajouterAuPanier"
          />
        </div>
      </section>

      <!-- Grille Équipements -->
      <section v-if="equipementsFiltrés.length > 0">
        <h2>Location d'Équipements</h2>
        <div class="grille-equipements">
          <CarteEquipement 
            v-for="equipement in equipementsFiltrés" 
            :key="equipement.id" 
            :equipement="equipement"
            @ajouter-panier="ajouterAuPanier"
          />
        </div>
      </section>
    </div>

    <!-- TIROIR PANIER -->
    <TiroirPanier 
      :panier="panier"
      :panierOuvert="panierOuvert"
      @close-panier="handleClosePanier"
      @update-panier="handleUpdatePanier"
      @commander-whatsapp="handleCommanderWhatsApp"
    />

    <!-- NOTIFICATION GLOBALE -->
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

section {
  margin-bottom: 35px;
}

h2 {
  color: #1f2833;
  margin-bottom: 20px;
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
  color: #1f2833;
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
  color: #6b7b8c;
  font-weight: 700;
  cursor: pointer;
  border-radius: 999px;
  border: none;
  transition: all 0.18s ease;
}

.menu-navigation button.actif {
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  box-shadow: 0 12px 20px rgba(240, 138, 93, 0.18);
}

.grille-produits,
.grille-equipements {
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
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

  .menu-navigation {
    padding: 10px 6px;
  }
}
</style>
