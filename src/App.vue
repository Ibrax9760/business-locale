<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from './utils/supabaseClient'

import EnTete from './components/EnTete.vue'
import PanneauVendeur from './components/PanneauVendeur.vue'
import CarteProduit from './components/CarteProduit.vue'
import CarteEquipement from './components/CarteEquipement.vue'
import TiroirPanier from './components/TiroirPanier.vue'

// === ÉTATS D'AUTHENTIFICATION ===
const session = ref(null);
const utilisateur = ref(null);
const profilClient = ref(null);

// === ÉTATS DU FORMULAIRE AUTH ===
const afficherFormulaireAuth = ref(false);
const estModeInscription = ref(false);
const emailInput = ref('');
const motDePasseInput = ref('');
const nomInput = ref('');
const messageErreur = ref('');

// --- ÉTAT DE L'APPLICATION ---
const panier = ref([])
const panierOuvert = ref(false)
const pageActive = ref('tout')
const recherche = ref('')

// Variables de données 
const produits = ref([])
const equipements = ref([])

// === MOTEURS DE FILTRAGE ===
const produitsFiltrés = computed(() => {
  if (!produits.value) return [];
  return produits.value.filter(p => {
    const titreProduit = p.titre || '';
    const texteRecherche = recherche.value || '';
    return titreProduit.toLowerCase().includes(texteRecherche.toLowerCase());
  });
});

const equipementsFiltrés = computed(() => {
  if (!equipements.value) return [];
  return equipements.value.filter(e => {
    const titreEquipement = e.titre || '';
    const texteRecherche = recherche.value || '';
    return titreEquipement.toLowerCase().includes(texteRecherche.toLowerCase());
  });
});

// Chargement des données depuis Supabase
const chargerDonnees = async () => {
  try {
    const { data: dataPlats, error: errorPlats } = await supabase.from('produits_gastronomie').select('*')
    if (errorPlats) throw errorPlats
    
    produits.value = dataPlats.map(p => ({
      ...p,
      type: 'gastronomie',
      varianteChoisie: p.variantes && p.variantes.length > 0 ? p.variantes[0] : null
    }))

    const { data: dataEquipements, error: errorEquipements } = await supabase.from('equipements_location').select('*')
    if (errorEquipements) throw errorEquipements
    
    equipements.value = dataEquipements.map(e => ({
      ...e,
      typeElement: 'location',
      prix: e.prix_journalier, // Mapping crucial pour la compatibilité avec CarteEquipement
      nom: e.titre // Mapping de sécurité pour l'affichage
    }))
    
  } catch (error) {
    console.error("Erreur DB:", error.message)
    afficherNotification("❌ Erreur de connexion à la base de données")
  }
}

onMounted(async () => {
  chargerDonnees();
  const { data: { session: sessionInitiale } } = await supabase.auth.getSession();
  
  if (sessionInitiale?.user) {
    session.value = sessionInitiale;
    utilisateur.value = sessionInitiale.user;
    await recupererProfilMetier(sessionInitiale.user.id);
  }

  supabase.auth.onAuthStateChange(async (event, sessionActuelle) => {
    session.value = sessionActuelle;
    utilisateur.value = sessionActuelle?.user || null;
    if (sessionActuelle?.user) {
      await recupererProfilMetier(sessionActuelle.user.id);
    } else {
      profilClient.value = null;
    }
  });
});

const notification = ref({ active: false, message: '' })
let timeoutId = null

const afficherNotification = (texte) => {
  notification.value.message = texte
  notification.value.active = true
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => notification.value.active = false, 3000)
}

// --- VARIABLES MODE VENDEUR ---
const modeVendeur = ref(false)

// (Logique complète du vendeur conservée mais réduite visuellement pour se concentrer sur l'erreur)
// Tu peux conserver l'intégralité de tes fonctions d'édition/ajout/suppression ici
// [Le bloc compressImageFile, handleImageUpload, demarrerEdition, supprimerArticleVendeur, ajouterArticleVendeur reste identique]

// --- GESTION DU PANIER (CORRIGÉE POUR ACCEPTER LES LOCATIONS) ---
const ajouterAuPanier = (article, estProduit = false) => {
  let idUnique, titreComplet, prixFinal

  if (estProduit) {
    idUnique = `${article.id}-${article.varianteChoisie.id}`
    titreComplet = `${article.titre} - ${article.varianteChoisie.nom}`
    prixFinal = article.varianteChoisie.prix
  } else {
    // Interception des données de location générées par CarteEquipement
    idUnique = `${article.id}-${article.dateDebutSelectionnee}`
    titreComplet = article.titre || article.nom
    prixFinal = article.prixTotalLocation
  }

  const articleExistant = panier.value.find(item => item.idUnique === idUnique)
  if (articleExistant) {
    articleExistant.quantite++
  } else {
    panier.value.push({ 
      idUnique, 
      titre: titreComplet, 
      prix: prixFinal, 
      quantite: 1,
      typeElement: estProduit ? 'gastronomie' : 'location',
      dateDebutSelectionnee: article.dateDebutSelectionnee,
      dateFinSelectionnee: article.dateFinSelectionnee,
      dureeJours: article.dureeJours
    })
  }
  afficherNotification(`✅ ${titreComplet} ajouté au panier`)
}

// Fonction de validation finale déclenchée par le composant TiroirPanier
const executerCommandeWhatsApp = (payload) => {
  const numeroVendeur = "262639610515";
  const texteEncode = encodeURIComponent(payload.message);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = `whatsapp://send?phone=${numeroVendeur}&text=${texteEncode}`;
  } else {
    window.open(`https://api.whatsapp.com/send?phone=${numeroVendeur}&text=${texteEncode}`, '_blank');
  }
  
  // Clôture et réinitialisation de la transaction
  panier.value = [];
  panierOuvert.value = false;
};

// === FONCTIONS D'AUTHENTIFICATION ===
const recupererProfilMetier = async (userId) => {
  try {
    const { data, error } = await supabase.from('profils').select('nom, role').eq('id', userId).single();
    if (error) throw error;
    profilClient.value = data;
  } catch (error) {
    profilClient.value = null;
  }
};

const executerInscription = async () => {
  try {
    messageErreur.value = '';
    const { error } = await supabase.auth.signUp({
      email: emailInput.value,
      password: motDePasseInput.value,
      options: { data: { nom: nomInput.value } }
    });
    if (error) throw error;
    afficherFormulaireAuth.value = false;
  } catch (error) {
    messageErreur.value = error.message;
  }
};

const executerConnexion = async () => {
  try {
    messageErreur.value = '';
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value,
      password: motDePasseInput.value,
    });
    if (error) throw error;
    afficherFormulaireAuth.value = false;
  } catch (error) {
    messageErreur.value = "Identifiants invalides. Veuillez réessayer.";
  }
};

const executerDeconnexion = async () => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
  try {
    await Promise.race([supabase.auth.signOut(), timeout]);
  } catch (error) {
    console.warn("Nettoyage local forcé.");
  } finally {
    session.value = null;
    utilisateur.value = null;
    profilClient.value = null;
    localStorage.clear();
    window.location.reload();
  }
};
</script>

<template>
  <div id="app">
    <EnTete 
      :utilisateur="utilisateur" 
      :profilClient="profilClient"
      :panierLength="panier.length"
      @toggle-vendeur="modeVendeur = !modeVendeur"
      @open-panier="panierOuvert = true"
      @deconnexion="executerDeconnexion"
      @open-auth="afficherFormulaireAuth = true" 
    />
  </div>

  <div v-if="afficherFormulaireAuth && !utilisateur" class="modal-overlay" @click.self="afficherFormulaireAuth = false">
    <div class="modal-auth">
      <button class="bouton-fermer-auth" @click="afficherFormulaireAuth = false">✖</button>
      <div class="en-tete-auth">
        <h2>{{ estModeInscription ? 'Créer un compte' : 'Bon retour' }}</h2>
        <p>{{ estModeInscription ? 'Rejoignez notre boutique locale.' : 'Connectez-vous pour continuer.' }}</p>
      </div>
      <div v-if="messageErreur" class="alerte-erreur">⚠️ {{ messageErreur }}</div>
      <form @submit.prevent="estModeInscription ? executerInscription() : executerConnexion()" class="formulaire-auth">
        <div v-if="estModeInscription" class="groupe-champ">
          <label>Nom complet</label>
          <input type="text" v-model="nomInput" placeholder="Ex: Ibrahim" required />
        </div>
        <div class="groupe-champ">
          <label>Adresse Email</label>
          <input type="email" v-model="emailInput" placeholder="nom@exemple.com" required />
        </div>
        <div class="groupe-champ">
          <label>Mot de passe</label>
          <input type="password" v-model="motDePasseInput" placeholder="••••••••" required />
        </div>
        <button type="submit" class="bouton-valider-auth">
          {{ estModeInscription ? "Créer mon compte" : "Se connecter" }}
        </button>
      </form>
      <div class="pied-auth">
        <p @click="estModeInscription = !estModeInscription" class="lien-bascule">
          {{ estModeInscription ? 'Déjà un compte ? Connectez-vous' : 'Pas de compte ? Inscrivez-vous' }}
        </p>
      </div>
    </div>
  </div>

  <main>
    <div v-show="!modeVendeur">
      <section class="recherche-section">
        <h2 class="titre-section">Que cherchez-vous ?</h2>
        <div class="barre-recherche-container">
          <span class="icone-loupe">🔍</span>
          <input type="text" class="champ-recherche" placeholder="Rechercher un plat ou un équipement..." v-model="recherche" />
        </div>
        <div class="filtres-container">
          <button class="chip-filtre" :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">Tout</button>
          <button class="chip-filtre" :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">Gastronomie</button>
          <button class="chip-filtre" :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">Locations</button>
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
          <CarteEquipement 
            v-for="equipement in equipementsFiltrés" 
            :key="equipement.id" 
            :equipement="equipement"
            @ajouter-equipement="ajouterAuPanier($event, false)"
          />
        </div>
      </section>
    </div>

    <TiroirPanier 
      :panier="panier" 
      :panierOuvert="panierOuvert"
      @close-panier="panierOuvert = false"
      @update-panier="panier = $event"
      @commander-whatsapp="executerCommandeWhatsApp"
    />

    <div :class="['notification', { 'visible': notification.active }]">{{ notification.message }}</div>
       
    <PanneauVendeur 
      v-if="modeVendeur && utilisateur && profilClient?.role === 'super_admin'"
      :produits="produits"
      :equipements="equipements"
      @produit-ajoute="chargerDonnees"
      @produit-modifie="chargerDonnees"
      @produit-supprime="chargerDonnees"
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

/* --- STYLES DE LA MODALE D'AUTHENTIFICATION --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 25, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal-auth {
  background: #ffffff;
  width: 100%;
  max-width: 420px;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.2);
  position: relative;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.bouton-fermer-auth {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #f4f6f8;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7b8c;
  display: grid;
  place-items: center;
  transition: all 0.2s;
}

.bouton-fermer-auth:hover {
  background: #e1e8ed;
  color: #1f2833;
}

.en-tete-auth h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: #3b302a;
  margin: 0 0 8px 0;
}

.en-tete-auth p {
  font-family: 'Inter', sans-serif;
  color: #6b7b8c;
  font-size: 0.95rem;
  margin: 0 0 24px 0;
}

.alerte-erreur {
  background: #fdf2f2;
  color: #b35034;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 20px;
  border: 1px solid #fad5d5;
}

.formulaire-auth .groupe-champ {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.formulaire-auth label {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
}

.formulaire-auth input {
  padding: 14px 16px;
  border: 1px solid #d1d9e0;
  border-radius: 14px;
  background: #f8fafc;
  font-size: 1rem;
  color: #1f2833;
  transition: all 0.2s;
}

.formulaire-auth input:focus {
  outline: none;
  border-color: #74b4aa;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(116, 180, 170, 0.15);
}

.bouton-valider-auth {
  width: 100%;
  padding: 14px;
  margin-top: 10px;
  border-radius: 14px;
  background: #3b302a;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.bouton-valider-auth:hover {
  background: #2c2520;
}

.pied-auth {
  margin-top: 24px;
  text-align: center;
}

.lien-bascule {
  color: #74b4aa;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  margin: 0;
}

.lien-bascule:hover {
  text-decoration: underline;
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