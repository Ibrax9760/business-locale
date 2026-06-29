<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from './utils/supabaseClient';
import EnTete from './components/EnTete.vue';
import TiroirPanier from './components/TiroirPanier.vue';

// --- ÉTATS GLOBAUX ---
const utilisateur = ref(null);
const profilClient = ref(null);
const panier = ref([]);
const panierOuvert = ref(false);
const notification = ref({ active: false, message: '' });

// --- ÉTATS AUTHENTIFICATION ---
const afficherFormulaireAuth = ref(false);
const estModeInscription = ref(false);
const emailInput = ref('');
const motDePasseInput = ref('');
const nomInput = ref('');
const messageErreur = ref('');

// --- FONCTIONS DE BASE ---
const afficherNotification = (texte) => {
  notification.value.message = texte;
  notification.value.active = true;
  setTimeout(() => notification.value.active = false, 3000);
};

const ajouterAuPanier = (article, estProduit = false) => {
  let idUnique, titreComplet, prixFinal;
  if (estProduit) {
    idUnique = `${article.id}-${article.varianteChoisie.id}`;
    titreComplet = `${article.titre} - ${article.varianteChoisie.nom}`;
    prixFinal = article.varianteChoisie.prix;
  } else {
    idUnique = `${article.id}-${article.dateDebutSelectionnee}`;
    titreComplet = article.titre || article.nom;
    prixFinal = article.prixTotalLocation;
  }
  const articleExistant = panier.value.find(item => item.idUnique === idUnique);
  if (articleExistant) { 
    articleExistant.quantite++; 
  } else {
    // INJECTION ABSOLUE DES DATES DANS LE TABLEAU
    panier.value.push({ 
  idUnique, 
  idBase: article.id, // Ajout de la référence stricte à la base de données
  titre: titreComplet, 
  prix: prixFinal, 
  quantite: 1, 
  typeElement: estProduit ? 'gastronomie' : 'location',
  dateDebut: estProduit ? null : article.dateDebutSelectionnee,
  dateFin: estProduit ? null : article.dateFinSelectionnee,
  duree: estProduit ? null : article.dureeJours 
  });
  }
  afficherNotification(`✅ ${titreComplet} ajouté au panier`);
};

const executerCommandeWhatsApp = (payload) => {
  const numeroVendeur = "262639610515";
  const texteEncode = encodeURIComponent(payload.message);
  window.open(`https://api.whatsapp.com/send?phone=${numeroVendeur}&text=${texteEncode}`, '_blank');
  panier.value = [];
  panierOuvert.value = false;
};

const executerDeconnexion = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

// --- MÉCANISME D'HYDRATATION DU PROFIL ---
const recupererProfil = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profils')
      .select('nom, role')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    profilClient.value = data;
  } catch (error) {
    console.error("Échec de la récupération des attributs du profil :", error.message);
  }
};

// --- MÉCANISMES D'AUTHENTIFICATION ---
const executerConnexion = async () => {
  try {
    messageErreur.value = '';
    
    // 1. Validation de l'authentification
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: emailInput.value, 
      password: motDePasseInput.value 
    });
    
    if (error) throw error;

    // 2. Attribution du jeton de session
    utilisateur.value = data.user;
    
    // 3. Exécution de la requête de sélection sur la table profils
    await recupererProfil(data.user.id);
    
    // 4. Fermeture de l'interface modale
    afficherFormulaireAuth.value = false;
    afficherNotification("Connexion réussie !");
    
  } catch (error) { 
    messageErreur.value = "Identifiants invalides ou erreur réseau."; 
    console.error("Incident d'authentification :", error);
  }
};

const executerInscription = async () => {
  try {
    messageErreur.value = '';
    const { data, error } = await supabase.auth.signUp({ 
      email: emailInput.value, 
      password: motDePasseInput.value,
      options: { data: { nom: nomInput.value } }
    });
    
    if (error) throw error;
    
    if (data.user) {
       utilisateur.value = data.user;
       await recupererProfil(data.user.id);
    }
    
    afficherFormulaireAuth.value = false;
    afficherNotification("Inscription réussie !");
  } catch (error) { 
    messageErreur.value = error.message; 
  }
};

// --- INITIALISATION DU COMPOSANT ---
onMounted(async () => {
  const { data: { session: s } } = await supabase.auth.getSession();
  
  if (s?.user) { 
    utilisateur.value = s.user; 
    await recupererProfil(s.user.id);
  }
});
</script>

<template>
  <div id="app">
    
    <transition name="modal-pop">
      <div v-if="afficherFormulaireAuth && !utilisateur" class="modal-overlay" @click.self="afficherFormulaireAuth = false">
        <div class="modal-auth">
          <button class="bouton-fermer-auth" @click="afficherFormulaireAuth = false" aria-label="Fermer">✖</button>
          
          <h2 class="titre-modal">{{ estModeInscription ? 'Créer un compte' : 'Bon retour' }}</h2>
          <p class="soustitre-modal">Accédez à votre espace premium</p>
          
          <div v-if="messageErreur" class="alerte-erreur">⚠️ {{ messageErreur }}</div>
          
          <form @submit.prevent="estModeInscription ? executerInscription() : executerConnexion()">
            <div v-if="estModeInscription" class="groupe-champ">
              <label>Nom</label>
              <input type="text" v-model="nomInput" placeholder="Votre nom complet" required />
            </div>
            
            <div class="groupe-champ">
              <label>Email</label>
              <input type="email" v-model="emailInput" placeholder="adresse@email.com" required />
            </div>
            
            <div class="groupe-champ">
              <label>Mot de passe</label>
              <input type="password" v-model="motDePasseInput" placeholder="••••••••" required />
            </div>
            
            <button type="submit" class="bouton-valider-auth">
              {{ estModeInscription ? "Créer mon compte" : "Se connecter" }}
            </button>
          </form>
          
          <p @click="estModeInscription = !estModeInscription" class="lien-bascule">
            {{ estModeInscription ? 'Déjà membre ? Connectez-vous' : 'Nouveau ? Créez un compte' }}
          </p>
        </div>
      </div>
    </transition>

    <EnTete 
      :utilisateur="utilisateur" 
      :profilClient="profilClient"
      :panierLength="panier.length"
      @open-panier="panierOuvert = true"
      @deconnexion="executerDeconnexion"
      @open-auth="afficherFormulaireAuth = true" 
    />

    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade-page" mode="out-in">
          <component 
            :is="Component"
            :panier="panier" 
            :utilisateur="utilisateur" 
            :profilClient="profilClient"
            @ajouter-au-panier="ajouterAuPanier"
          />
        </transition>
      </router-view>
    </main>

    <TiroirPanier 
      :panier="panier" 
      :panierOuvert="panierOuvert"
      @close-panier="panierOuvert = false"
      @update-panier="panier = $event"
      @commander-whatsapp="executerCommandeWhatsApp"
    />

    <div :class="['notification', { 'visible': notification.active }]">
      <span class="icone-notif">✨</span>
      <span>{{ notification.message }}</span>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

/* --- DESIGN SYSTEM TOKENS --- */
:root {
  color-scheme: light !important;
  
  /* Color Palette */
  --bg-app: #faf9f6; /* Linge écru premium */
  --bg-carte: #ffffff;
  --text-primary: #1f1b18; /* Marron-noir chaleureux et profond */
  --text-secondary: #6e645e; /* Bronze éteint */
  --accent-gold: #c5a47e; /* Or satiné */
  --accent-gold-light: #f7f3ed;
  --accent-gold-dark: #a6845c;
  --accent-green: #26463c; /* Vert sapin prestigieux */
  --accent-green-light: #eaf1ee;
  
  /* Borders & Shadows */
  --border-subtile: rgba(197, 164, 126, 0.22);
  --border-focus: #c5a47e;
  --radius-carte: 24px;
  --radius-input: 16px;
  
  --shadow-douce: 0 16px 40px rgba(31, 27, 24, 0.035);
  --shadow-premium: 0 30px 60px rgba(31, 27, 24, 0.06);
  --shadow-hover: 0 24px 50px rgba(197, 164, 126, 0.12);
  
  /* Standard mappings */
  --btn-primary: var(--accent-green);
  --btn-primary-text: #ffffff;
}

html, body, #app, main {
  background-color: var(--bg-app) !important;
  color: var(--text-primary) !important;
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

main {
  min-height: 100vh;
  padding: 24px 20px 60px;
  max-width: 1300px;
  margin: 0 auto;
}

/* --- RECHERCHE & FILTRES --- */
.recherche-premium { margin-bottom: 40px; padding-top: 12px; }
.titre-recherche { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin: 0 0 8px 0; color: var(--text-primary); }
.barre-recherche-container { position: relative; margin-bottom: 24px; }

/* Correction de la loupe géante */
.icone-loupe-svg {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  opacity: 0.7;
  pointer-events: none;
}

.champ-recherche-premium {
  width: 100%;
  padding: 16px 20px 16px 52px;
  border-radius: var(--radius-input);
  border: 1px solid var(--border-subtile);
  background-color: var(--bg-carte);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: var(--text-primary);
  box-shadow: var(--shadow-douce);
  transition: all 0.3s ease;
  outline: none;
  -webkit-appearance: none; 
  appearance: none; 
}

.champ-recherche-premium:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 4px rgba(197, 164, 126, 0.15), var(--shadow-douce);
}

.filtres-scrollables {
  display: flex; gap: 12px; overflow-x: auto; padding: 4px 4px 10px 4px;
  scrollbar-width: none; -ms-overflow-style: none;
}
.filtres-scrollables::-webkit-scrollbar { display: none; }

.chip-premium {
  padding: 12px 24px; border-radius: 99px; font-weight: 600;
  white-space: nowrap; cursor: pointer; border: 1px solid var(--border-subtile);
  background: var(--bg-carte); color: var(--text-secondary);
  font-family: 'Inter', sans-serif; font-size: 0.9rem;
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.chip-premium:hover {
  transform: translateY(-2px);
  border-color: var(--accent-gold);
  color: var(--text-primary);
}
.chip-premium.actif {
  background-color: var(--accent-green);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 20px rgba(38, 70, 60, 0.2);
}

/* --- GRILLES ET CARTES --- */
.grille-produits, .grille-equipements {
  display: grid; gap: 28px; grid-template-columns: 1fr;
  margin-bottom: 40px;
}
@media (min-width: 700px) { .grille-produits, .grille-equipements { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .grille-produits, .grille-equipements { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

.carte-produit, .carte-equipement {
  background: var(--bg-carte);
  border-radius: var(--radius-carte);
  padding: 20px;
  border: 1px solid var(--border-subtile);
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.carte-produit:hover, .carte-equipement:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium), var(--shadow-hover);
  border-color: rgba(197, 164, 126, 0.4);
}

.image-produit {
  width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
  border-radius: 18px; margin-bottom: 16px;
  transition: transform 0.5s ease;
}

.carte-produit h3, .carte-equipement h3 { 
  font-family: 'Playfair Display', serif; 
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 10px; 
  color: var(--text-primary);
}

/* --- MODALE D'AUTHENTIFICATION PREMIUM --- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(31, 27, 24, 0.45);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; justify-content: center; align-items: center;
  z-index: 2000; padding: 20px;
}
.modal-auth {
  background: var(--bg-carte); width: 100%; max-width: 440px;
  border-radius: 32px; padding: 40px; position: relative;
  border: 1px solid var(--border-subtile);
  box-shadow: var(--shadow-premium);
}
.bouton-fermer-auth {
  position: absolute; top: 24px; right: 24px; background: var(--accent-gold-light);
  border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
  color: var(--text-primary); display: grid; place-items: center;
  transition: all 0.2s; font-size: 0.9rem;
}
.bouton-fermer-auth:hover {
  background: var(--accent-gold);
  color: white;
  transform: scale(1.05);
}
.titre-modal { font-family: 'Playfair Display', serif; font-size: 2rem; margin: 0 0 6px 0; color: var(--text-primary); text-align: center; }
.soustitre-modal { font-size: 0.9rem; color: var(--text-secondary); text-align: center; margin: 0 0 28px 0; font-weight: 500; }

.groupe-champ { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.groupe-champ label { display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
.groupe-champ input {
  width: 100%; padding: 14px 18px; border: 1px solid var(--border-subtile);
  border-radius: var(--radius-input); background: #fdfdfd; font-size: 1rem;
  color: var(--text-primary); font-family: 'Inter', sans-serif;
  transition: all 0.3s; outline: none;
}
.groupe-champ input:focus {
  border-color: var(--border-focus);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(197, 164, 126, 0.12);
}

.bouton-valider-auth {
  width: 100%; padding: 16px; margin-top: 14px; border-radius: var(--radius-input);
  background: var(--accent-green); color: #ffffff; font-weight: 700; border: none; cursor: pointer;
  font-family: 'Inter', sans-serif; font-size: 1rem; letter-spacing: 0.5px;
  box-shadow: 0 8px 24px rgba(38, 70, 60, 0.2);
  transition: all 0.3s ease;
}
.bouton-valider-auth:hover {
  background: #1e362e;
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(38, 70, 60, 0.3);
}
.bouton-valider-auth:active {
  transform: translateY(0);
}

.lien-bascule { color: var(--accent-gold-dark); font-weight: 600; font-size: 0.95rem; cursor: pointer; text-align: center; margin-top: 24px; transition: color 0.2s; }
.lien-bascule:hover { color: var(--text-primary); text-decoration: underline; }
.alerte-erreur { background: #fff5f5; color: #c53030; padding: 14px 18px; border-radius: 14px; margin-bottom: 24px; font-weight: 600; border: 1px solid #fed7d7; font-size: 0.9rem; }

/* --- NOTIFICATIONS --- */
.notification {
  position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%) translateY(140px);
  background: var(--accent-green); color: white; padding: 16px 28px;
  border-radius: 999px; font-weight: 600; z-index: 2000; display: flex; align-items: center; gap: 10px;
  box-shadow: 0 16px 36px rgba(38, 70, 60, 0.35); border: 1px solid rgba(197, 164, 126, 0.25);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.notification.visible { transform: translateX(-50%) translateY(0); }
.icone-notif { font-size: 1.1rem; }

/* --- TRANSITIONS SUPPLÉMENTAIRES --- */
.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.fade-page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity 0.3s ease;
}
.modal-pop-enter-active .modal-auth,
.modal-pop-leave-active .modal-auth {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}
.modal-pop-enter-from .modal-auth,
.modal-pop-leave-to .modal-auth {
  transform: scale(0.95) translateY(10px);
}
</style>