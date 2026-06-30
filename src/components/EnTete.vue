<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { t } from '../utils/i18n'

const props = defineProps({
  utilisateur: Object,
  profilClient: Object,
  panierLength: Number,
  secoussePanier: Boolean
})

const emit = defineEmits(['open-panier', 'deconnexion', 'open-auth', 'open-settings', 'open-menu-builder'])

const router = useRouter()
const route = useRoute()
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

const actionnerMenuBuilder = () => {
  emit('open-menu-builder')
  menuUtilisateurOuvert.value = false
}

const actionnerSuivi = () => {
  router.push('/suivi')
  menuUtilisateurOuvert.value = false
}

const actionnerSimulator = () => {
  router.push('/devis-simulator')
  menuUtilisateurOuvert.value = false
}

const actionnerLookbook = () => {
  router.push('/lookbook')
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
    <!-- ZONE GAUCHE : RETOUR OU PROFIL + MENU CONTEXTUEL -->
    <div class="nav-zone nav-gauche">
      <button 
        v-if="route.path !== '/'" 
        @click="router.push('/')" 
        class="bouton-retour"
        :title="t('return')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icone-retour">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span class="texte-retour">{{ t('return') }}</span>
      </button>

      <button v-else class="bouton-icone profil-btn" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-profil">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span v-if="utilisateur && profilClient?.nom" class="nom-utilisateur">{{ profilClient.nom }}</span>
      </button>

      <!-- MENU DÉROULANT DE PROFIL/PARAMÈTRES (À GAUCHE) -->
      <transition name="menu-fade">
        <div v-if="menuUtilisateurOuvert" class="menu-contextuel">
          <!-- Options communes -->
          <button class="menu-action" @click.stop="actionnerMenuBuilder">
            <span style="font-size: 1.1rem; line-height: 1; margin-right: 2px;">🍳</span>
            <span>Créateur de Menu</span>
          </button>
          
          <button class="menu-action" @click.stop="actionnerSuivi">
            <span style="font-size: 1.1rem; line-height: 1; margin-right: 2px;">📦</span>
            <span>Suivre ma commande</span>
          </button>

          <button class="menu-action" @click.stop="actionnerSimulator">
            <span style="font-size: 1.1rem; line-height: 1; margin-right: 2px;">🧮</span>
            <span>Simulateur de Budget</span>
          </button>

          <button class="menu-action" @click.stop="actionnerLookbook">
            <span style="font-size: 1.1rem; line-height: 1; margin-right: 2px;">📸</span>
            <span>Lookbook d'Inspiration</span>
          </button>

          <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-subtile);" />

          <template v-if="utilisateur">
            <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerAdmin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
              {{ t('space_admin') }}
            </button>

            <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerVendeur">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              {{ t('space_seller') }}
            </button>

            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              {{ t('settings') }}
            </button>

            <button class="menu-action action-danger" @click.stop="actionnerDeconnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {{ t('logout') }}
            </button>
          </template>
          <template v-else>
            <button class="menu-action" @click.stop="actionnerConnexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              {{ t('login') }}
            </button>
            <button class="menu-action" @click.stop="actionnerParametres">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              {{ t('settings') }}
            </button>
          </template>
        </div>
      </transition>
    </div>

    <!-- ZONE CENTRALE : NOM DE LA MARQUE -->
    <div class="nav-zone nav-centre">
      <h1 class="titre-marque" @click="router.push('/')">
        <span class="texte-boutique">{{ t('brand_title') }}</span>
        <span class="icone-panier-mignon">🧺</span>
      </h1>
    </div>

    <!-- ZONE DROITE : VIDE POUR LA RESPONSIVITÉ -->
    <div class="nav-zone nav-droite"></div>
  </header>

  <!-- BOUTON MENU BUILDER FLOTTANT (FAB) EN BAS À DROITE (AU-DESSUS DU PANIER) -->
  <button 
    class="bouton-builder-flottant" 
    @click="$emit('open-menu-builder')" 
    aria-label="Lancer l'assistant de menu"
    title="Créateur de Menu Guidé"
  >
    🍳
  </button>

  <!-- BOUTON PANIER FLOTTANT (FAB) EN BAS À DROITE -->
  <button 
    :class="['bouton-panier-flottant', { 'secousse-bounce': props.secoussePanier }]" 
    @click="$emit('open-panier')" 
    aria-label="Ouvrir le panier"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-panier-fab">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
    <span v-if="panierLength > 0" class="badge-panier-fab">{{ panierLength }}</span>
  </button>

  <!-- Calque transparent pour fermer le menu lors d'un clic en dehors -->
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
  background-color: var(--bg-nav, rgba(253, 252, 249, 0.85));
  backdrop-filter: blur(20px); 
  -webkit-backdrop-filter: blur(20px); 
  border-bottom: 1px solid var(--border-subtile);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.015);
  transition: background-color 0.3s ease, border-color 0.3s ease;
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

/* Branding Premium avec panier à droite */
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

/* --- BOUTON PANIER FLOTTANT (FAB) PREMIUM EN BAS À DROITE --- */
.bouton-panier-flottant {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1400; /* Juste sous le overlay du panier mais au-dessus du reste */
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--accent-green);
  color: #ffffff;
  border: 1px solid var(--border-subtile);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(38, 70, 60, 0.35);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bouton-panier-flottant:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 14px 35px rgba(38, 70, 60, 0.45);
  background-color: #1e362e;
}

.svg-panier-fab {
  width: 24px;
  height: 24px;
}

.badge-panier-fab {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #b35034; /* Badge rouge-orangé distinct */
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  height: 22px;
  min-width: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg-carte);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

/* Menus contextuels (Dropdowns) alignés à gauche sous le profil */
.menu-contextuel { 
  position: absolute; 
  top: 100%; 
  left: 0; 
  right: auto;
  margin-top: 14px;
  background-color: var(--bg-carte);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtile); 
  border-radius: 20px; 
  box-shadow: var(--shadow-premium); 
  min-width: 230px; 
  overflow: hidden; 
  z-index: 1001; 
  padding: 10px 0; 
  transition: background-color 0.3s ease;
}

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
  transform: translateY(10px);
}

/* Interface Mobile & Tablette - Rangement propre */
@media (max-width: 768px) { 
  .navbar-premium { padding: 12px 16px; } 
  .titre-marque { font-size: 0.95rem; gap: 6px; letter-spacing: 1px; } 
  .icone-panier-mignon { font-size: 1.1rem; }
  
  /* Masquer les textes superflus */
  .nom-utilisateur, .texte-retour { 
    display: none !important; 
  }
  
  /* Arrondir le bouton de retour pour mobile (style icône) */
  .bouton-retour {
    padding: 8px;
    border-radius: 50%;
  }
  .bouton-retour svg {
    width: 18px !important;
    height: 18px !important;
  }

  /* Compacter le bouton de profil */
  .profil-btn {
    padding: 8px;
    border-radius: 50%;
  }
  .profil-btn svg {
    width: 18px !important;
    height: 18px !important;
  }

  /* Adapter la position du FAB Panier sur mobile */
  .bouton-panier-flottant {
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
  }
  .bouton-builder-flottant {
    bottom: 88px;
    right: 31px;
    width: 42px;
    height: 42px;
    font-size: 1.1rem;
    opacity: 0.75;
  }
}

.bouton-builder-flottant {
  position: fixed;
  bottom: 98px;
  right: 36px;
  z-index: 1400;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--accent-gold);
  color: #ffffff;
  border: 1px solid var(--border-subtile);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(197, 164, 126, 0.25);
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 1.25rem;
}
.bouton-builder-flottant:hover {
  opacity: 1;
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 12px 30px rgba(197, 164, 126, 0.45);
  background-color: var(--accent-gold-dark);
}

/* Animation de rebond du panier */
.secousse-bounce {
  animation: bounce-micro 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes bounce-micro {
  0% { transform: scale(1); }
  35% { transform: scale(1.3); }
  65% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
</style>