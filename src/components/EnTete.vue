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

const emit = defineEmits(['open-panier', 'deconnexion', 'open-auth', 'open-settings'])

const menuUtilisateurOuvert = ref(false)

const gererClicUtilisateur = () => {
  menuUtilisateurOuvert.value = !menuUtilisateurOuvert.value;
}

const actionnerAdmin = () => {
  router.push('/admin')
  menuUtilisateurOuvert.value = false
}

const actionnerVendeur = () => {
  router.push('/vendeur')
  menuUtilisateurOuvert.value = false
}

const actionnerParametres = () => {
  emit('open-settings')
  menuUtilisateurOuvert.value = false
}

const actionnerConnexion = () => {
  emit('open-auth')
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icone-retour">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Retour</span>
      </button>

      <button class="bouton-icone profil-btn" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-profil">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span v-if="utilisateur && profilClient?.nom" class="nom-utilisateur">{{ profilClient.nom }}</span>
      </button>

      <transition name="menu-fade">
        <div v-if="menuUtilisateurOuvert" class="menu-contextuel menu-desktop">
          <template v-if="utilisateur">
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

            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Paramètres
            </button>

            <button class="menu-action action-danger" @click.stop="actionnerDeconnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Déconnexion
            </button>
          </template>
          <template v-else>
            <button class="menu-action" @click.stop="actionnerConnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Se connecter
            </button>
            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Paramètres
            </button>
          </template>
        </div>
      </transition>
    </div>

    <div class="nav-zone nav-centre">
      <h1 class="titre-marque" @click="router.push('/')">
        <span class="icone-panier-mignon">🧺</span>
        <span class="texte-boutique">MA BOUTIQUE LOCALE</span>
      </h1>
    </div>

    <div class="nav-zone nav-droite zone-desktop">
      <button class="bouton-icone panier-btn" @click="$emit('open-panier')" aria-label="Ouvrir le panier">
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
      class="bouton-icone-mobile" 
      aria-label="Retour au catalogue"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>

    <div class="conteneur-profil-mobile">
      <button class="bouton-icone-mobile" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      
      <transition name="menu-fade">
        <div v-if="menuUtilisateurOuvert" class="menu-contextuel menu-mobile">
          <template v-if="utilisateur">
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

            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Paramètres
            </button>

            <button class="menu-action action-danger" @click.stop="actionnerDeconnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Déconnexion
            </button>
          </template>
          <template v-else>
            <button class="menu-action" @click.stop="actionnerConnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Se connecter
            </button>
            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Paramètres
            </button>
          </template>
        </div>
      </transition>
    </div>

    <button class="bouton-icone-mobile" @click="$emit('open-panier')" aria-label="Ouvrir le panier">
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
.navbar-premium { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 16px 40px; 
  position: sticky; 
  top: 0; 
  z-index: 1000; 
  background-color: rgba(253, 252, 249, 0.85); /* Frosted linen */
  backdrop-filter: blur(20px); 
  -webkit-backdrop-filter: blur(20px); 
  border-bottom: 1px solid var(--border-subtile);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.015);
}

.nav-zone { display: flex; align-items: center; }
.nav-gauche { flex: 1; justify-content: flex-start; position: relative; gap: 20px; }
.nav-centre { flex: 2; justify-content: center; }
.nav-droite { flex: 1; justify-content: flex-end; }

/* --- Bouton Retour de luxe --- */
.bouton-retour { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  background: var(--bg-carte); 
  border: 1px solid var(--border-subtile); 
  padding: 8px 18px; 
  border-radius: 99px; 
  cursor: pointer; 
  font-family: 'Inter', sans-serif; 
  font-size: 0.85rem; 
  font-weight: 600; 
  color: var(--text-primary); 
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.bouton-retour:hover { 
  background: var(--accent-gold-light); 
  border-color: var(--accent-gold);
  transform: translateX(-4px); 
}
.icone-retour { width: 14px; height: 14px; color: var(--text-primary); }

/* Branding Premium */
.titre-marque { 
  font-family: 'Playfair Display', serif; 
  font-size: 1.35rem; 
  font-weight: 700; 
  margin: 0; 
  color: var(--text-primary); 
  letter-spacing: 2px; 
  text-align: center; 
  white-space: nowrap; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.titre-marque:hover {
  color: var(--accent-gold-dark);
}
.texte-boutique {
  border-bottom: 2px solid transparent;
  padding-bottom: 2px;
}
.titre-marque:hover .texte-boutique {
  border-color: var(--accent-gold);
}
.icone-panier-mignon { font-size: 1.45rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }

/* Boutons d'icônes standard */
.bouton-icone { 
  background: var(--bg-carte); 
  border: 1px solid var(--border-subtile);
  padding: 10px; 
  border-radius: 14px;
  cursor: pointer; 
  color: var(--text-primary); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  position: relative; 
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.bouton-icone:hover {
  border-color: var(--accent-gold);
  background-color: var(--accent-gold-light);
  transform: translateY(-2px);
}
.bouton-icone:active { 
  transform: translateY(0); 
}
.profil-btn { 
  gap: 10px; 
  padding: 8px 16px;
}
.nom-utilisateur { 
  font-family: 'Inter', sans-serif; 
  font-size: 0.9rem; 
  font-weight: 600; 
  color: var(--text-primary); 
}
.bouton-icone svg { width: 20px; height: 20px; color: var(--text-primary); }

.badge-panier { 
  position: absolute; 
  top: -4px; 
  right: -4px; 
  background-color: var(--accent-green); 
  color: white; 
  font-size: 0.7rem; 
  font-weight: 700; 
  font-family: 'Inter', sans-serif; 
  height: 20px; 
  min-width: 20px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 0 4px; 
  border: 2px solid var(--bg-carte);
  box-shadow: 0 4px 10px rgba(38, 70, 60, 0.25); 
}

/* Menus contextuels (Dropdowns) */
.menu-contextuel { 
  position: absolute; 
  background-color: rgba(255, 255, 255, 0.95); 
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtile); 
  border-radius: 20px; 
  box-shadow: var(--shadow-premium); 
  min-width: 230px; 
  overflow: hidden; 
  z-index: 1001; 
  padding: 10px 0; 
}
.menu-desktop { top: 100%; left: 0; margin-top: 14px; }
.menu-mobile { bottom: calc(100% + 16px); left: 50%; transform: translateX(-50%); }

.menu-action { 
  width: 100%; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 12px 20px; 
  background: transparent; 
  border: none; 
  color: var(--text-primary); 
  font-family: 'Inter', sans-serif; 
  font-size: 0.9rem; 
  font-weight: 600; 
  cursor: pointer; 
  text-align: left; 
  transition: all 0.2s ease; 
}
.menu-action:hover { 
  background-color: var(--accent-gold-light); 
  color: var(--accent-gold-dark);
  padding-left: 24px;
}
.menu-action svg { width: 16px; height: 16px; opacity: 0.8; transition: transform 0.2s; }
.menu-action:hover svg {
  transform: scale(1.1);
}
.action-danger { color: #b35034; }
.action-danger:hover {
  background-color: #fff5f5;
  color: #c53030;
}
.calque-fermeture { position: fixed; inset: 0; z-index: 900; cursor: default; }

/* Transitions Menu Dropdown */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) translateX(0);
}
.menu-desktop.menu-fade-enter-from,
.menu-desktop.menu-fade-leave-to {
  transform: translateY(10px);
}
.menu-mobile.menu-fade-enter-from,
.menu-mobile.menu-fade-leave-to {
  transform: translateY(10px) translateX(-50%);
}

/* Interface Mobile & Tablette */
.zone-mobile { display: none; }

.barre-mobile { 
  position: fixed; 
  bottom: 28px; 
  left: 50%; 
  transform: translateX(-50%) translateY(0); 
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
  width: auto; 
  min-width: 190px; 
  gap: 32px; 
  background-color: rgba(255, 255, 255, 0.90); 
  backdrop-filter: blur(24px); 
  -webkit-backdrop-filter: blur(24px); 
  border: 1px solid rgba(197, 164, 126, 0.25); 
  border-radius: 99px; 
  justify-content: center; 
  align-items: center; 
  padding: 12px 32px; 
  z-index: 1000; 
  box-shadow: 0 16px 40px rgba(31, 27, 24, 0.15); 
}
.barre-cachee { transform: translateX(-50%) translateY(160%); }
.conteneur-profil-mobile { position: relative; }

.bouton-icone-mobile {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s;
}
.bouton-icone-mobile:active {
  transform: scale(0.9);
}
.bouton-icone-mobile svg {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) { 
  .zone-desktop { display: none !important; } 
  .zone-mobile { display: flex; } 
  .nav-centre { flex: 1; } 
  .navbar-premium { padding: 16px 20px; } 
  .titre-marque { font-size: 1.1rem; } 
}
</style>