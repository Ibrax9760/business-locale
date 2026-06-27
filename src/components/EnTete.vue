<script setup>
import { ref } from 'vue'

const props = defineProps({
  utilisateur: Object,
  profilClient: Object,
  panierLength: Number
})

const emit = defineEmits(['toggle-vendeur', 'open-panier', 'deconnexion', 'open-auth'])

const menuUtilisateurOuvert = ref(false)

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
  <!-- ========================================== -->
  <!-- 1. EN-TÊTE SUPÉRIEUR (TOP BAR)             -->
  <!-- ========================================== -->
  <header class="navbar-premium">
    
    <!-- GAUCHE : Zone Utilisateur (Visible uniquement sur Desktop) -->
    <div class="nav-zone nav-gauche zone-desktop">
      <button class="bouton-icone profil-btn" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span v-if="utilisateur && profilClient?.nom" class="nom-utilisateur">{{ profilClient.nom }}</span>
      </button>

      <!-- Menu contextuel Bureau (S'ouvre vers le bas) -->
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

    <!-- CENTRE : Identité visuelle (Toujours visible) -->
    <div class="nav-zone nav-centre">
      <h1 class="titre-marque">
        <span class="icone-panier-mignon">🧺</span>
        MA BOUTIQUE LOCALE
      </h1>
    </div>

    <!-- DROITE : Zone Transactionnelle (Visible uniquement sur Desktop) -->
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

  <!-- ========================================== -->
  <!-- 2. BARRE INFÉRIEURE (BOTTOM TAB BAR)       -->
  <!-- Visible uniquement sur Mobile              -->
  <!-- ========================================== -->
  <nav class="barre-mobile zone-mobile">
    
    <!-- Bouton Profil Mobile -->
    <div class="conteneur-profil-mobile">
      <button class="bouton-icone" @click.stop="gererClicUtilisateur" aria-label="Profil utilisateur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      
      <!-- Menu contextuel Mobile (S'ouvre vers le haut) -->
      <div v-if="utilisateur && menuUtilisateurOuvert" class="menu-contextuel menu-mobile">
        <button v-if="profilClient?.role === 'super_admin'" class="menu-action" @click.stop="actionnerVendeur">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Espace Vendeur
        </button>
        <button class="menu-action action-danger" @click.stop="actionactionnerDeconnexion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Déconnexion
        </button>
      </div>
    </div>

    <!-- Bouton Panier Mobile -->
    <button class="bouton-icone" @click="$emit('open-panier')" aria-label="Ouvrir le panier">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span v-if="panierLength > 0" class="badge-panier">{{ panierLength }}</span>
    </button>

  </nav>

  <!-- Calque de fermeture transparent (clic extérieur) -->
  <div v-if="menuUtilisateurOuvert" class="calque-fermeture" @click.stop="menuUtilisateurOuvert = false"></div>
</template>

<style scoped>
/* ========================================== */
/* SOCLE COMMUN (Couleurs, Typographie)       */
/* ========================================== */

.navbar-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-zone { display: flex; align-items: center; }
.nav-gauche { flex: 1; justify-content: flex-start; position: relative; }
.nav-centre { flex: 2; justify-content: center; }
.nav-droite { flex: 1; justify-content: flex-end; }

.titre-marque {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #3b302a;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.icone-panier-mignon { font-size: 1.3rem; line-height: 1; }

.bouton-icone {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #3b302a;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: opacity 0.2s;
}

.profil-btn { gap: 8px; }

.nom-utilisateur {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #3b302a;
}

.bouton-icone:active { opacity: 0.6; }
.bouton-icone svg { width: 24px; height: 24px; }

.badge-panier {
  position: absolute;
  top: 2px;
  right: 0px;
  background-color: #bc6c46;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  height: 18px;
  min-width: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  transform: translate(25%, -25%);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* ========================================== */
/* ARCHITECTURE DU MENU CONTEXTUEL            */
/* ========================================== */

.menu-contextuel {
  position: absolute;
  background-color: #ffffff;
  border: 1px solid #e0dcd3;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  min-width: 200px;
  overflow: hidden;
  z-index: 901;
  padding: 8px 0;
}

/* Variante Bureau (Sous le bouton) */
.menu-desktop {
  top: 100%;
  left: 0;
  margin-top: 12px;
}

/* Variante Mobile (Au-dessus du bouton de la barre du bas) */
.menu-mobile {
  bottom: 100%;
  left: 10px;
  margin-bottom: 16px;
}

.menu-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: transparent;
  border: none;
  color: #3b302a;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.menu-action:hover { background-color: #f8f6f0; }
.menu-action svg { width: 18px; height: 18px; opacity: 0.7; }
.action-danger { color: #b35034; }
.action-danger svg { opacity: 1; }

.calque-fermeture {
  position: fixed;
  inset: 0;
  z-index: 900;
  cursor: default;
}

/* ========================================== */
/* LOGIQUE HYBRIDE : DESKTOP vs MOBILE        */
/* ========================================== */

/* Par défaut (Desktop), on cache la barre mobile */
.zone-mobile { display: none; }

/* Styles de la barre inférieure */
.barre-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  justify-content: space-around;
  align-items: center;
  padding: 12px 20px;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.conteneur-profil-mobile { position: relative; }

/* MEDIA QUERY : Dès qu'on passe sur petit écran (< 768px) */
@media (max-width: 768px) {
  
  /* On cache la zone droite et gauche de la Top Bar */
  .zone-desktop { display: none !important; }
  
  /* On affiche la Bottom Tab Bar */
  .zone-mobile { display: flex; }
  
  /* On centre le titre qui est désormais seul en haut */
  .nav-centre { flex: 1; }
  
  /* On allège l'en-tête supérieur pour gagner de la place */
  .navbar-premium { padding: 12px; }
  .titre-marque { font-size: 1rem; }
}
</style>