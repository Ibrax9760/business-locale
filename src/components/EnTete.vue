<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

import { useRouter, useRoute } from 'vue-router'


const masquerBarreMobile = ref(false)
let dernierePositionScroll = 0;

// Algorithme d'évaluation de la direction du défilement
const analyserDefilement = () => {
  const positionActuelle = window.scrollY;

  // Condition 1 : le défilement s'effectue vers le bas et dépasse un seuil de 50 pixels
  if (positionActuelle > dernierePositionScroll && positionActuelle > 50) {
    masquerBarreMobile.value = true;
  } 
  // Condition 2 : le défilement s'effectue vers le haut
  else {
    masquerBarreMobile.value = false;
  }

  // Mise à jour de la référence spatiale pour le prochain cycle d'évaluation
  dernierePositionScroll = positionActuelle;
};

// Attachement des écouteurs lors du montage du composant
onMounted(() => {
  window.addEventListener('scroll', analyserDefilement);
});

// Détachement des écouteurs lors de la destruction du composant (prévention des fuites mémoire)
onUnmounted(() => {
  window.removeEventListener('scroll', analyserDefilement);
});

const router = useRouter()
const route = useRoute()

const props = defineProps({
  utilisateur: Object,
  profilClient: Object,
  panierLength: Number
})

const emit = defineEmits(['open-panier', 'deconnexion', 'open-auth']) // 3. Supprime toggle-vendeur et toggle-admin ici

const menuUtilisateurOuvert = ref(false)
// ... (garde tout le code de gestion de scroll tel quel)

const gererClicUtilisateur = () => {
  console.log("Clic sur le bouton profil ! Utilisateur actuel :", props.utilisateur);
  
  if (!props.utilisateur) {
    console.log("Utilisateur non connecté, émission de open-auth");
    emit('open-auth'); 
  } else {
    menuUtilisateurOuvert.value = !menuUtilisateurOuvert.value;
  }
}


// 4. Modifie ces fonctions pour utiliser router.push au lieu de emit
const actionnerAdmin = () => {
  router.push('/admin') // Navigation directe
  menuUtilisateurOuvert.value = false
}

const actionnerVendeur = () => {
  router.push('/vendeur') // Navigation directe
  menuUtilisateurOuvert.value = false
}

const actionnerDeconnexion = () => {
  emit('deconnexion')
  menuUtilisateurOuvert.value = false
}
</script>

<template>
  <header class="navbar-premium">
    <div class="nav-zone nav-gauche zone-desktop">
      
      <button 
        v-if="route.path !== '/'" 
        @click="router.push('/')" 
        class="bouton-retour"
        title="Retour au catalogue"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icone-retour">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Retour
      </button>

      <button class="bouton-icone profil-btn" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span v-if="utilisateur && profilClient?.nom" class="nom-utilisateur">{{ profilClient.nom }}</span>
      </button>

      <div v-if="utilisateur && menuUtilisateurOuvert" class="menu-contextuel menu-desktop">
        <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerAdmin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          Espace Administrateur
        </button>

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
    <button 
      v-if="route.path !== '/'" 
      @click="router.push('/')" 
      class="bouton-icone" 
      aria-label="Retour au catalogue"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>

    <div class="conteneur-profil-mobile">
      <button class="bouton-icone" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      
      <div v-if="utilisateur && menuUtilisateurOuvert" class="menu-contextuel menu-mobile">
        <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerAdmin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          Espace Administrateur
        </button>

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
/* Configuration de la barre de navigation principale */
.navbar-premium { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; position: sticky; top: 0; z-index: 1000; background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.nav-zone { display: flex; align-items: center; }

/* Ajout d'un espacement (gap) pour séparer le bouton retour du profil */
.nav-gauche { flex: 1; justify-content: flex-start; position: relative; gap: 12px; }
.nav-centre { flex: 2; justify-content: center; }
.nav-droite { flex: 1; justify-content: flex-end; }

/* --- NOUVEAU : Styles du Bouton Retour --- */
.bouton-retour { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #d1d9e0; padding: 6px 14px; border-radius: 99px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; color: #3b302a; transition: all 0.2s ease; }
.bouton-retour:hover { background: #e2e8f0; transform: translateX(-2px); }
.icone-retour { width: 16px; height: 16px; }

/* Typographie et éléments graphiques */
.titre-marque { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; margin: 0; color: #3b302a; letter-spacing: 0.5px; text-align: center; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 8px; }
.icone-panier-mignon { font-size: 1.3rem; line-height: 1; }

/* Boutons d'icônes standards */
.bouton-icone { background: transparent; border: none; padding: 8px; cursor: pointer; color: #3b302a; display: flex; align-items: center; justify-content: center; position: relative; transition: opacity 0.2s; }
.profil-btn { gap: 8px; }
.nom-utilisateur { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 600; color: #3b302a; }
.bouton-icone:active { opacity: 0.6; }
.bouton-icone svg { width: 24px; height: 24px; }
.badge-panier { position: absolute; top: 2px; right: 0px; background-color: #bc6c46; color: white; font-size: 0.7rem; font-weight: 700; font-family: 'Inter', sans-serif; height: 18px; min-width: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; transform: translate(25%, -25%); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

/* Menus contextuels (Modales profil) */
.menu-contextuel { position: absolute; background-color: #ffffff; border: 1px solid #e0dcd3; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); min-width: 200px; overflow: hidden; z-index: 1001; padding: 8px 0; }
.menu-desktop { top: 100%; left: 0; margin-top: 12px; }
.menu-mobile { bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%); }
.menu-action { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: transparent; border: none; color: #3b302a; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; text-align: left; transition: background-color 0.2s; }
.menu-action:hover { background-color: #f8f6f0; }
.menu-action svg { width: 18px; height: 18px; opacity: 0.7; }
.action-danger { color: #b35034; }
.action-danger svg { opacity: 1; }
.calque-fermeture { position: fixed; inset: 0; z-index: 900; cursor: default; }

/* Responsive et interface mobile */
.zone-mobile { display: none; }

/* Ajustement de la barre mobile : Réduction du gap et du padding pour intégrer les 3 boutons */
.barre-mobile { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(0); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: auto; min-width: 160px; gap: 28px; background-color: rgba(255, 255, 255, 0.90); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 99px; justify-content: center; align-items: center; padding: 10px 24px; z-index: 1000; box-shadow: 0 12px 32px rgba(59, 48, 42, 0.15); }
.barre-cachee { transform: translateX(-50%) translateY(150%); }
.conteneur-profil-mobile { position: relative; }

@media (max-width: 768px) { 
  .zone-desktop { display: none !important; } 
  .zone-mobile { display: flex; } 
  .nav-centre { flex: 1; } 
  .navbar-premium { padding: 12px; } 
  .titre-marque { font-size: 1rem; } 
}
</style>