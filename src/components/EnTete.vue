<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  utilisateur: Object,
  profilClient: Object,
  panierLength: Number
})

const emit = defineEmits(['toggle-vendeur', 'open-panier', 'deconnexion', 'open-auth'])

const menuUtilisateurOuvert = ref(false)

// === NOUVEAU : Logique de masquage au défilement ===
const masquerBarreMobile = ref(false)
let dernierePositionScroll = 0

const gererScroll = () => {
  const positionActuelle = window.scrollY || document.documentElement.scrollTop
  
  // Ignorer l'effet de rebond tout en haut de l'écran sur mobile
  if (positionActuelle < 0) return 

  // Si on descend de plus de 50px, on cache la barre
  if (positionActuelle > dernierePositionScroll && positionActuelle > 50) {
    masquerBarreMobile.value = true
  } 
  // Si on remonte, on l'affiche immédiatement
  else if (positionActuelle < dernierePositionScroll) {
    masquerBarreMobile.value = false
  }
  
  dernierePositionScroll = positionActuelle
}

onMounted(() => {
  window.addEventListener('scroll', gererScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', gererScroll)
})
// ====================================================

const gererClicUtilisateur = () => {
  if (!props.utilisateur) {
    emit('open-auth')
  } else {
    menuUtilisateurOuvert.value = !menuUtilisateurOuvert.value
  }
}

const actionnerDeconnexion = () => {
  emit('deconnexion')
  menuUtilisateurOuvert.value = false
}

const actionnerVendeur = () => {
  emit('toggle-vendeur')
  menuUtilisateurOuvert.value = false
}
</script>

<template>
  <header class="navbar-premium">
    <div class="nav-zone nav-gauche zone-desktop">
      <button class="bouton-icone profil-btn" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span v-if="utilisateur && profilClient?.nom" class="nom-utilisateur">{{ profilClient.nom }}</span>
      </button>

      <div v-if="utilisateur && menuUtilisateurOuvert" class="menu-contextuel menu-desktop">
        <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerVendeur">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Espace Vendeur
        </button>
        <button class="menu-action action-danger" @click.stop="actionnerDeconnexion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Déconnexion
        </button>
      </div>
    </div>

    <div class="nav-zone nav-centre">
      <h1 class="titre-marque">
        <span class="icone-panier-mignon">🧺</span>
        MA BOUTIQUE LOCALE
      </h1>
    </div>

    <div class="nav-zone nav-droite zone-desktop">
      <button class="bouton-icone" @click="$emit('open-panier')" aria-label="Ouvrir le panier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span v-if="panierLength > 0" class="badge-panier">{{ panierLength }}</span>
      </button>
    </div>
  </header>

  <nav class="barre-mobile zone-mobile" :class="{ 'barre-cachee': masquerBarreMobile }">
    <div class="conteneur-profil-mobile">
      <button class="bouton-icone" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      
      <div v-if="utilisateur && menuUtilisateurOuvert" class="menu-contextuel menu-mobile">
        <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerVendeur">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Espace Vendeur
        </button>
        <button class="menu-action action-danger" @click.stop="actionnerDeconnexion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Déconnexion
        </button>
      </div>
    </div>

    <button class="bouton-icone" @click="$emit('open-panier')" aria-label="Ouvrir le panier">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span v-if="panierLength > 0" class="badge-panier">{{ panierLength }}</span>
    </button>
  </nav>

  <div v-if="menuUtilisateurOuvert" class="calque-fermeture" @click.stop="menuUtilisateurOuvert = false"></div>
</template>

<style scoped>
/* [Le CSS du haut (Top Bar, Desktop) reste exactement le même] */
.navbar-premium { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; position: sticky; top: 0; z-index: 1000; background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.nav-zone { display: flex; align-items: center; }
.nav-gauche { flex: 1; justify-content: flex-start; position: relative; }
.nav-centre { flex: 2; justify-content: center; }
.nav-droite { flex: 1; justify-content: flex-end; }
.titre-marque { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; margin: 0; color: #3b302a; letter-spacing: 0.5px; text-align: center; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 8px; }
.icone-panier-mignon { font-size: 1.3rem; line-height: 1; }
.bouton-icone { background: transparent; border: none; padding: 8px; cursor: pointer; color: #3b302a; display: flex; align-items: center; justify-content: center; position: relative; transition: opacity 0.2s; }
.profil-btn { gap: 8px; }
.nom-utilisateur { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 600; color: #3b302a; }
.bouton-icone:active { opacity: 0.6; }
.bouton-icone svg { width: 24px; height: 24px; }
.badge-panier { position: absolute; top: 2px; right: 0px; background-color: #bc6c46; color: white; font-size: 0.7rem; font-weight: 700; font-family: 'Inter', sans-serif; height: 18px; min-width: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; transform: translate(25%, -25%); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.menu-contextuel { position: absolute; background-color: #ffffff; border: 1px solid #e0dcd3; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); min-width: 200px; overflow: hidden; z-index: 1001; padding: 8px 0; }
.menu-desktop { top: 100%; left: 0; margin-top: 12px; }
.menu-mobile { bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%); }
.menu-action { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: transparent; border: none; color: #3b302a; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; text-align: left; transition: background-color 0.2s; }
.menu-action:hover { background-color: #f8f6f0; }
.menu-action svg { width: 18px; height: 18px; opacity: 0.7; }
.action-danger { color: #b35034; }
.action-danger svg { opacity: 1; }
.calque-fermeture { position: fixed; inset: 0; z-index: 900; cursor: default; }
.zone-mobile { display: none; }

/* === NOUVELLE PILULE MOBILE : Compacte et Dynamique === */
.barre-mobile {
  position: fixed;
  bottom: 24px;
  left: 50%;
  
  /* L'animation de masquage joue sur l'axe Y */
  transform: translateX(-50%) translateY(0); 
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Largeur ajustée (auto) pour épouser le contenu */
  width: auto;
  min-width: 160px;
  
  /* Espace entre le bouton profil et panier */
  gap: 40px;
  
  background-color: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 99px;
  justify-content: center;
  align-items: center;
  padding: 10px 32px;
  z-index: 1000;
  box-shadow: 0 12px 32px rgba(59, 48, 42, 0.15);
}

/* La classe activée par le défilement */
.barre-cachee {
  /* On pousse la barre de 150% vers le bas pour la cacher sous l'écran */
  transform: translateX(-50%) translateY(150%);
}

.conteneur-profil-mobile { position: relative; }

@media (max-width: 768px) {
  .zone-desktop { display: none !important; }
  .zone-mobile { display: flex; }
  .nav-centre { flex: 1; }
  .navbar-premium { padding: 12px; }
  .titre-marque { font-size: 1rem; }
}
</style>