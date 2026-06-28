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
    panier.value.push({ 
      idUnique, 
      titre: titreComplet, 
      prix: prixFinal, 
      quantite: 1, 
      typeElement: estProduit ? 'gastronomie' : 'location' 
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
    
    <div v-if="afficherFormulaireAuth && !utilisateur" class="modal-overlay" @click.self="afficherFormulaireAuth = false">
      <div class="modal-auth">
        <button class="bouton-fermer-auth" @click="afficherFormulaireAuth = false">✖</button>
        
        <h2>{{ estModeInscription ? 'Créer un compte' : 'Bon retour' }}</h2>
        
        <div v-if="messageErreur" class="alerte-erreur">⚠️ {{ messageErreur }}</div>
        
        <form @submit.prevent="estModeInscription ? executerInscription() : executerConnexion()">
          <div v-if="estModeInscription" class="groupe-champ">
            <label>Nom</label>
            <input type="text" v-model="nomInput" required />
          </div>
          
          <div class="groupe-champ">
            <label>Email</label>
            <input type="email" v-model="emailInput" required />
          </div>
          
          <div class="groupe-champ">
            <label>Mot de passe</label>
            <input type="password" v-model="motDePasseInput" required />
          </div>
          
          <button type="submit" class="bouton-valider-auth">
            {{ estModeInscription ? "S'inscrire" : "Se connecter" }}
          </button>
        </form>
        
        <p @click="estModeInscription = !estModeInscription" class="lien-bascule">
          {{ estModeInscription ? 'Déjà un compte ? Connectez-vous' : 'Pas de compte ? Inscrivez-vous' }}
        </p>
      </div>
    </div>

    <EnTete 
      :utilisateur="utilisateur" 
      :profilClient="profilClient"
      :panierLength="panier.length"
      @open-panier="panierOuvert = true"
      @deconnexion="executerDeconnexion"
      @open-auth="afficherFormulaireAuth = true" 
    />

    <main>
      <router-view 
        :panier="panier" 
        @ajouter-au-panier="ajouterAuPanier"
      />
    </main>

    <TiroirPanier 
      :panier="panier" 
      :panierOuvert="panierOuvert"
      @close-panier="panierOuvert = false"
      @update-panier="panier = $event"
      @commander-whatsapp="executerCommandeWhatsApp"
    />

    <div :class="['notification', { 'visible': notification.active }]">{{ notification.message }}</div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;700&display=swap');

/* Étape 1 : Forcer le schéma clair au niveau de la racine */
:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

* {
  box-sizing: border-box;
}

main {
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f8f6f0;
  color: #2c2520;
  padding: 18px 16px 44px;
}

/* --- RECHERCHE & FILTRES --- */
.recherche-premium { margin-bottom: 32px; padding-top: 12px; }
.titre-recherche { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; margin: 0 0 16px 0; }
.barre-recherche-container { position: relative; margin-bottom: 20px; }

/* Correction de la loupe géante */
.icone-loupe-svg {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: inherit;
  opacity: 0.5;
  pointer-events: none;
}

.champ-recherche-premium {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border-radius: 16px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  background-color: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  -webkit-appearance: none; 
  appearance: none; 
}

.filtres-scrollables {
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px;
  scrollbar-width: none; -ms-overflow-style: none;
}
.filtres-scrollables::-webkit-scrollbar { display: none; }

.chip-premium {
  padding: 10px 22px; border-radius: 99px; font-weight: 600;
  white-space: nowrap; cursor: pointer; border: 1px solid rgba(128, 128, 128, 0.2);
}
.chip-premium.actif { background-color: #1a1d20; color: #fcfcfc; }

/* --- GRILLES ET CARTES --- */
.grille-produits, .grille-equipements {
  display: grid; gap: 18px; grid-template-columns: 1fr;
}
@media (min-width: 700px) { .grille-produits, .grille-equipements { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1050px) { .grille-produits, .grille-equipements { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

.carte-produit, .carte-equipement {
  background: #ffffff; border-radius: 28px; padding: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}
.image-produit {
  width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
  border-radius: 20px; margin-bottom: 14px;
}
.carte-produit h3, .carte-equipement h3 { font-family: 'Playfair Display', serif; margin: 0 0 8px; }

/* --- MODALE D'AUTHENTIFICATION --- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(15, 20, 25, 0.65);
  backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center;
  z-index: 2000; padding: 20px;
}
.modal-auth {
  background: #ffffff; width: 100%; max-width: 400px;
  border-radius: 24px; padding: 32px; position: relative;
  box-shadow: 0 24px 60px rgba(0,0,0,0.2);
}
.bouton-fermer-auth {
  position: absolute; top: 20px; right: 20px; background: #f4f6f8;
  border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
}
.modal-auth h2 { font-family: 'Playfair Display', serif; font-size: 1.8rem; margin: 0 0 20px 0; }
.groupe-champ { margin-bottom: 16px; }
.groupe-champ label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: #4a5568; }
.groupe-champ input {
  width: 100%; padding: 14px 16px; border: 1px solid #d1d9e0;
  border-radius: 14px; background: #f8fafc; font-size: 1rem;
}
.bouton-valider-auth {
  width: 100%; padding: 14px; margin-top: 10px; border-radius: 14px;
  background: #3b302a; color: #ffffff; font-weight: 700; border: none; cursor: pointer;
}
.lien-bascule { color: #74b4aa; font-weight: 600; font-size: 0.9rem; cursor: pointer; text-align: center; margin-top: 20px; }
.alerte-erreur { background: #fdf2f2; color: #b35034; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; }

/* --- NOTIFICATIONS --- */
.notification {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(120px);
  background: rgba(43, 76, 64, 0.95); color: white; padding: 14px 24px;
  border-radius: 999px; font-weight: 600; z-index: 2000; transition: transform 0.3s ease;
}
.notification.visible { transform: translateX(-50%) translateY(0); }
</style>