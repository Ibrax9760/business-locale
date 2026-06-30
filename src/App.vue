<script setup>
import { ref, onMounted, watch } from 'vue';
import { supabase } from './utils/supabaseClient';
import EnTete from './components/EnTete.vue';
import TiroirPanier from './components/TiroirPanier.vue';
import TiroirMenuBuilder from './components/TiroirMenuBuilder.vue';
import { currentLang, setLang, t } from './utils/i18n';

// --- ÉTATS GLOBAUX ---
const utilisateur = ref(null);
const profilClient = ref(null);
const panier = ref([]);
const panierOuvert = ref(false);
const menuBuilderOuvert = ref(false);
const declencherSecoussePanier = ref(false);
const notification = ref({ active: false, message: '' });

// --- ÉTATS PARAMÈTRES (CARTE BLANCHE) ---
const afficherParametres = ref(false);
const themeActuel = ref(localStorage.getItem('app-theme') || 'theme-ecru');
const nomProfilInput = ref('');
const langueChoisie = ref(currentLang.value);
const statsNombreCommandes = ref(0);

// --- ÉTATS AUTHENTIFICATION ---
const afficherFormulaireAuth = ref(false);
const authMode = ref('connexion'); // 'connexion', 'inscription', 'oublie', 'reinitialisation'
const emailInput = ref('');
const motDePasseInput = ref('');
const nomInput = ref('');
const telephoneInput = ref('');
const nouveauMotDePasseInput = ref('');
const messageErreur = ref('');

const estModeInscription = computed({
  get: () => authMode.value === 'inscription',
  set: (val) => { authMode.value = val ? 'inscription' : 'connexion' }
});

// --- WATCHER DE THÈME SUR LE BODY ---
watch(themeActuel, (nouveauTheme) => {
  document.body.className = nouveauTheme;
  // Mettre à jour la balise meta color-scheme pour empêcher l'Auto Dark Mode forcé du navigateur
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaColorScheme) {
    metaColorScheme.setAttribute('content', nouveauTheme === 'theme-sombre' ? 'dark' : 'light');
  }
}, { immediate: true });

// --- EMPÊCHER LE SCROLL DE L'ARRIÈRE-PLAN LORSQUE LE PANIER OU LE BUILDER EST OUVERT ---
watch([panierOuvert, menuBuilderOuvert], ([panierVal, builderVal]) => {
  if (panierVal || builderVal) {
    document.body.classList.add('overflow-locked');
  } else {
    document.body.classList.remove('overflow-locked');
  }
});

// --- FONCTIONS DE BASE ---
const afficherNotification = (texte) => {
  notification.value.message = texte;
  notification.value.active = true;
  setTimeout(() => notification.value.active = false, 3000);
};

const ajouterAuPanier = (article, estProduit = false) => {
  let idUnique, titreComplet, prixFinal;
  if (estProduit) {
    idUnique = `${article.id}-${article.varianteChoisie.nom}`;
    titreComplet = `${article.titre} - ${article.varianteChoisie.nom}`;
    prixFinal = article.varianteChoisie.prix;
  } else {
    idUnique = `${article.id}-${article.dateDebutSelectionnee}_${article.dateFinSelectionnee}`;
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
  afficherNotification(`✅ ${titreComplet} ${t('add_to_cart')}`);
  declencherSecoussePanier.value = true;
  setTimeout(() => {
    declencherSecoussePanier.value = false;
  }, 400);
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

// --- PARAMÈTRES & PROFIL UTILS ---
const chargerStatsUtilisateur = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', userId)
    if (!error) {
      statsNombreCommandes.value = count || 0;
    }
  } catch (err) {
    console.error("Erreur de chargement des stats utilisateur :", err);
  }
};

const recupererProfil = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profils')
      .select('nom, role')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    profilClient.value = data;
    nomProfilInput.value = data.nom || '';
    await chargerStatsUtilisateur(userId);
  } catch (error) {
    console.error("Échec de la récupération des attributs du profil :", error.message);
  }
};

const modifierProfil = async () => {
  try {
    const { error } = await supabase
      .from('profils')
      .update({ nom: nomProfilInput.value })
      .eq('id', utilisateur.value.id);
      
    if (error) throw error;
    profilClient.value.nom = nomProfilInput.value;
    afficherNotification("Votre profil a été mis à jour !");
    afficherParametres.value = false;
  } catch (err) {
    console.error("Erreur de modification du profil :", err.message);
    afficherNotification("Impossible de mettre à jour le profil.");
  }
};

const changerTheme = (nouveauTheme) => {
  themeActuel.value = nouveauTheme;
  localStorage.setItem('app-theme', nouveauTheme);
};

const changerLangue = (nouvelleLangue) => {
  setLang(nouvelleLangue);
  langueChoisie.value = nouvelleLangue;
  let nomLangue = '';
  if (nouvelleLangue === 'fr') nomLangue = 'Français';
  else if (nouvelleLangue === 'sh_officiel') nomLangue = 'Shimaore (Officiel)';
  else if (nouvelleLangue === 'sh_fr') nomLangue = 'Shimaore (Alphabet Fr)';
  afficherNotification(`🌍 Langue modifiée : ${nomLangue}`);
};

const reinitialiserApp = () => {
  if (confirm("Réinitialiser le cache supprimera votre panier en cours et vos préférences de thème. Voulez-vous continuer ?")) {
    localStorage.clear();
    panier.value = [];
    themeActuel.value = 'theme-ecru';
    langueChoisie.value = 'fr';
    window.location.reload();
  }
};

// --- MÉCANISMES D'AUTHENTIFICATION ---
const executerConnexion = async () => {
  try {
    messageErreur.value = '';
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: emailInput.value, 
      password: motDePasseInput.value 
    });
    
    if (error) throw error;

    utilisateur.value = data.user;
    await recupererProfil(data.user.id);
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
      options: { 
        data: { 
          nom: nomInput.value,
          telephone: telephoneInput.value
        } 
      }
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

// Demande de réinitialisation de mot de passe (envoi e-mail)
const executerDemandeMotDePasseOublie = async () => {
  try {
    messageErreur.value = '';
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.value, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    afficherNotification("E-mail de réinitialisation envoyé !");
    authMode.value = 'connexion';
  } catch (error) {
    messageErreur.value = error.message;
  }
};

// Mise à jour finale du mot de passe après clic sur le lien de récupération
const executerMiseAJourMotDePasse = async () => {
  try {
    messageErreur.value = '';
    const { error } = await supabase.auth.updateUser({
      password: nouveauMotDePasseInput.value
    });
    if (error) throw error;
    afficherNotification("Votre mot de passe a été mis à jour !");
    afficherFormulaireAuth.value = false;
    authMode.value = 'connexion';
    nouveauMotDePasseInput.value = '';
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

  // Écouter les changements d'état d'authentification
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      if (session?.user) {
        utilisateur.value = session.user;
        await recupererProfil(session.user.id);
      }
    } else if (event === 'SIGNED_OUT') {
      utilisateur.value = null;
      profilClient.value = null;
    } else if (event === 'PASSWORD_RECOVERY') {
      authMode.value = 'reinitialisation';
      afficherFormulaireAuth.value = true;
    }
  });
});
</script>

<template>
  <div id="app">
    
    <transition name="modal-pop">
      <div v-if="afficherFormulaireAuth && (authMode === 'reinitialisation' || !utilisateur)" class="modal-overlay" @click.self="afficherFormulaireAuth = false">
        <div class="modal-auth">
          <button class="bouton-fermer-auth" @click="afficherFormulaireAuth = false" aria-label="Fermer">✖</button>
          
          <h2 class="titre-modal">
            <span v-if="authMode === 'connexion'">Bon retour</span>
            <span v-else-if="authMode === 'inscription'">Créer un compte</span>
            <span v-else-if="authMode === 'oublie'">Mot de passe oublié</span>
            <span v-else-if="authMode === 'reinitialisation'">Nouveau mot de passe</span>
          </h2>
          <p class="soustitre-modal">
            <span v-if="authMode === 'connexion'">Accédez à votre espace premium</span>
            <span v-else-if="authMode === 'inscription'">Rejoignez notre service de prestige</span>
            <span v-else-if="authMode === 'oublie'">Saisissez votre e-mail de récupération</span>
            <span v-else-if="authMode === 'reinitialisation'">Choisissez votre nouveau mot de passe</span>
          </p>
          
          <div v-if="messageErreur" class="alerte-erreur">⚠️ {{ messageErreur }}</div>
          
          <!-- FORMULAIRE CONNEXION -->
          <form v-if="authMode === 'connexion'" @submit.prevent="executerConnexion()">
            <div class="groupe-champ">
              <label>Email</label>
              <input type="email" v-model="emailInput" placeholder="adresse@email.com" required />
            </div>
            
            <div class="groupe-champ">
              <label>Mot de passe</label>
              <input type="password" v-model="motDePasseInput" placeholder="••••••••" required />
            </div>
            
            <div style="text-align: right; margin-bottom: 12px;">
              <span @click="authMode = 'oublie'" style="font-size: 0.75rem; color: var(--accent-gold-dark); cursor: pointer; font-weight: 600;">Mot de passe oublié ?</span>
            </div>
            
            <button type="submit" class="bouton-valider-auth">
              Se connecter
            </button>
          </form>

          <!-- FORMULAIRE INSCRIPTION -->
          <form v-else-if="authMode === 'inscription'" @submit.prevent="executerInscription()">
            <div class="groupe-champ">
              <label>Nom complet</label>
              <input type="text" v-model="nomInput" placeholder="Votre nom" required />
            </div>
            
            <div class="groupe-champ">
              <label>Téléphone</label>
              <input type="tel" v-model="telephoneInput" placeholder="Ex: 06 39 00 00 00" required />
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
              Créer mon compte
            </button>
          </form>

          <!-- FORMULAIRE MOT DE PASSE OUBLIÉ -->
          <form v-else-if="authMode === 'oublie'" @submit.prevent="executerDemandeMotDePasseOublie()">
            <div class="groupe-champ">
              <label>Adresse e-mail</label>
              <input type="email" v-model="emailInput" placeholder="adresse@email.com" required />
            </div>
            
            <button type="submit" class="bouton-valider-auth">
              Envoyer le lien de récupération
            </button>
          </form>

          <!-- FORMULAIRE RÉINITIALISATION -->
          <form v-else-if="authMode === 'reinitialisation'" @submit.prevent="executerMiseAJourMotDePasse()">
            <div class="groupe-champ">
              <label>Nouveau mot de passe</label>
              <input type="password" v-model="nouveauMotDePasseInput" placeholder="••••••••" required />
            </div>
            
            <button type="submit" class="bouton-valider-auth">
              Enregistrer le mot de passe
            </button>
          </form>
          
          <p v-if="authMode !== 'reinitialisation'" @click="authMode = (authMode === 'connexion' ? 'inscription' : 'connexion')" class="lien-bascule">
            {{ authMode === 'inscription' ? 'Déjà membre ? Connectez-vous' : 'Nouveau ? Créez un compte' }}
          </p>
        </div>
      </div>
    </transition>

    <!-- MODAL DE PARAMÈTRES (THEMES & INFOS) -->
    <transition name="modal-pop">
      <div v-if="afficherParametres" class="modal-overlay" @click.self="afficherParametres = false">
        <div class="modal-auth modal-settings">
          <button class="bouton-fermer-auth" @click="afficherParametres = false" aria-label="Fermer">✖</button>
          
          <h2 class="titre-modal">{{ t('settings_title') }}</h2>
          <p class="soustitre-modal">{{ t('settings_subtitle') }}</p>

          <div class="sections-settings">
            
            <!-- Choix du Thème -->
            <div class="section-settings-bloc">
              <h3 class="titre-section-settings">🎨 {{ t('visual_theme') }}</h3>
              <div class="selecteur-themes-premium">
                <button 
                  class="btn-theme-option ecru"
                  :class="{ actif: themeActuel === 'theme-ecru' }"
                  @click="changerTheme('theme-ecru')"
                >
                  <span class="cercle-couleur" style="background: #faf9f6; border: 1px solid #c5a47e;"></span>
                  Écru
                </button>
                <button 
                  class="btn-theme-option pure-white"
                  :class="{ actif: themeActuel === 'theme-pure-white' }"
                  @click="changerTheme('theme-pure-white')"
                >
                  <span class="cercle-couleur" style="background: #ffffff; border: 1px solid #d1d9e0;"></span>
                  Blanc
                </button>
                <button 
                  class="btn-theme-option sombre"
                  :class="{ actif: themeActuel === 'theme-sombre' }"
                  @click="changerTheme('theme-sombre')"
                >
                  <span class="cercle-couleur" style="background: #0e0c0b; border: 1px solid #d8b88f;"></span>
                  Sombre
                </button>
              </div>
            </div>

            <!-- Infos Profil -->
            <div v-if="utilisateur" class="section-settings-bloc">
              <h3 class="titre-section-settings">👤 {{ t('my_profile') }}</h3>
              <form @submit.prevent="modifierProfil">
                <div class="groupe-champ">
                  <label>Adresse Email (Non modifiable)</label>
                  <input type="email" :value="utilisateur.email" disabled class="input-desactive" />
                </div>
                <div class="groupe-champ">
                  <label>{{ t('fullname') }}</label>
                  <input type="text" v-model="nomProfilInput" required />
                </div>
                <button type="submit" class="bouton-valider-auth" style="margin-top: 8px;">
                  {{ t('save_changes') }}
                </button>
              </form>
            </div>

            <!-- Langues d'affichage -->
            <div class="section-settings-bloc">
              <h3 class="titre-section-settings">🌍 {{ t('lang_label') }}</h3>
              <div class="selecteur-langues-premium">
                <div class="btn-langues-container">
                  <button 
                    class="btn-langue-option"
                    :class="{ actif: langueChoisie === 'fr' }"
                    @click="changerLangue('fr')"
                  >
                    Français
                  </button>
                  <button 
                    class="btn-langue-option"
                    :class="{ actif: langueChoisie === 'sh_officiel' }"
                    @click="changerLangue('sh_officiel')"
                    title="Dialecte de Mayotte avec alphabet officiel (ɓ, ɗ)"
                  >
                    Shimaore (Officiel)
                  </button>
                  <button 
                    class="btn-langue-option"
                    :class="{ actif: langueChoisie === 'sh_fr' }"
                    @click="changerLangue('sh_fr')"
                    title="Dialecte de Mayotte avec alphabet français (b, d)"
                  >
                    Shimaore (Fr)
                  </button>
                </div>
              </div>
            </div>

            <!-- Cache & Stats -->
            <div class="section-settings-bloc stats-cache-container">
              <div v-if="utilisateur" class="stat-badge-premium">
                <span class="stat-chiffre">{{ statsNombreCommandes }}</span>
                <span class="stat-label">Commandes</span>
              </div>
              <button class="btn-clear-cache" @click="reinitialiserApp">
                🧹 {{ t('clear_cache') }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </transition>

    <EnTete 
      :utilisateur="utilisateur" 
      :profilClient="profilClient"
      :panierLength="panier.length"
      :secoussePanier="declencherSecoussePanier"
      @open-panier="panierOuvert = true"
      @open-menu-builder="menuBuilderOuvert = true"
      @deconnexion="executerDeconnexion"
      @open-auth="afficherFormulaireAuth = true" 
      @open-settings="afficherParametres = true"
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
            @open-menu-builder="menuBuilderOuvert = true"
          />
        </transition>
      </router-view>
    </main>

    <TiroirPanier 
      :panier="panier" 
      :panierOuvert="panierOuvert"
      :utilisateur="utilisateur"
      :profilClient="profilClient"
      @close-panier="panierOuvert = false"
      @update-panier="panier = $event"
      @commander-whatsapp="executerCommandeWhatsApp"
    />

    <TiroirMenuBuilder 
      :menuBuilderOuvert="menuBuilderOuvert"
      @close-menu-builder="menuBuilderOuvert = false"
      @ajouter-au-panier="ajouterAuPanier"
    />

    <transition name="notif-bounce">
      <div v-if="notification.active" class="notification">
        <span class="icone-notif">✨</span>
        <span>{{ notification.message }}</span>
      </div>
    </transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

/* --- SÉLECTION DES THÈMES SUR BODY --- */
body.theme-ecru {
  color-scheme: light;
  --bg-app: #faf9f6;
  --bg-carte: #ffffff;
  --bg-nav: rgba(250, 249, 246, 0.85);
  --text-primary: #1f1b18;
  --text-secondary: #6e645e;
  --accent-gold: #c5a47e;
  --accent-gold-light: #f7f3ed;
  --accent-gold-dark: #a6845c;
  --accent-green: #26463c;
  --accent-green-light: #eaf1ee;
  --border-subtile: rgba(197, 164, 126, 0.22);
}

body.theme-sombre {
  color-scheme: dark;
  --bg-app: #0e0c0b;
  --bg-carte: #181513;
  --bg-nav: rgba(14, 12, 11, 0.85);
  --text-primary: #f5f2ee;
  --text-secondary: #b5aaa0;
  --accent-gold: #d8b88f;
  --accent-gold-light: #2d2620;
  --accent-gold-dark: #c5a47e;
  --accent-green: #3d6e5f;
  --accent-green-light: #182823;
  --border-subtile: rgba(216, 184, 143, 0.15);
}

body.theme-pure-white {
  color-scheme: light;
  --bg-app: #f8fafc;
  --bg-carte: #ffffff;
  --bg-nav: rgba(248, 250, 252, 0.85);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --accent-gold: #64748b;
  --accent-gold-light: #f1f5f9;
  --accent-gold-dark: #475569;
  --accent-green: #0f172a;
  --accent-green-light: #e2e8f0;
  --border-subtile: rgba(100, 116, 139, 0.15);
}

html, body, #app, main {
  background-color: var(--bg-app);
  color: var(--text-primary);
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body.overflow-locked {
  overflow: hidden !important;
  height: 100vh;
  width: 100%;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

button, .btn-icone, .chip-premium, .pilule-format, .bouton-ajouter, .bouton-whatsapp, .radio-cache {
  user-select: none;
  -webkit-user-select: none;
}

main {
  min-height: 100vh;
  padding: 24px 20px 60px;
  max-width: 1300px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  main {
    padding-bottom: 120px;
  }
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
  border-radius: var(--radius-input, 16px);
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
  border-color: var(--border-focus, var(--accent-gold));
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
  border-radius: var(--radius-carte, 24px);
  padding: 20px;
  border: 1px solid var(--border-subtile);
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.carte-produit:hover, .carte-equipement:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium, 0 30px 60px rgba(31, 27, 24, 0.06)), var(--shadow-hover, 0 24px 50px rgba(197, 164, 126, 0.12));
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

/* --- MODALE PREMIUM --- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(31, 27, 24, 0.45);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; justify-content: center; align-items: center;
  z-index: 2000; padding: 20px;
}
.modal-auth {
  background: var(--bg-carte); width: 100%; max-width: 440px;
  border-radius: 32px; padding: 40px; position: relative;
  border: 1px solid var(--border-subtile);
  box-shadow: var(--shadow-premium, 0 30px 60px rgba(31, 27, 24, 0.06));
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
.groupe-champ input, .groupe-champ select {
  width: 100%; padding: 14px 18px; border: 1px solid var(--border-subtile);
  border-radius: var(--radius-input, 16px); background: var(--bg-carte); font-size: 1rem;
  color: var(--text-primary); font-family: 'Inter', sans-serif;
  transition: all 0.3s; outline: none;
}
.groupe-champ input:focus, .groupe-champ select:focus {
  border-color: var(--border-focus, var(--accent-gold));
  background: var(--bg-carte);
  box-shadow: 0 0 0 4px rgba(197, 164, 126, 0.12);
}

.bouton-valider-auth {
  width: 100%; padding: 16px; margin-top: 14px; border-radius: var(--radius-input, 16px);
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

/* --- NOTIFICATIONS PREMIUM --- */
.notification {
  position: fixed; 
  left: 50%; 
  bottom: 32px; 
  transform: translateX(-50%);
  background: var(--accent-green); 
  color: white; 
  padding: 16px 28px;
  border-radius: 999px; 
  font-weight: 600; 
  z-index: 2000; 
  display: flex; 
  align-items: center; 
  gap: 10px;
  box-shadow: 0 16px 36px rgba(38, 70, 60, 0.35); 
  border: 1px solid rgba(197, 164, 126, 0.25);
  white-space: nowrap;
}
.icone-notif { font-size: 1.1rem; }

@media (max-width: 600px) {
  .notification {
    bottom: auto;
    top: 24px;
    box-shadow: 0 10px 25px rgba(38, 70, 60, 0.25);
    white-space: normal;
    text-align: center;
    max-width: 90vw;
  }
}

/* Transition de notification rebondissante */
.notif-bounce-enter-active {
  animation: notif-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.notif-bounce-leave-active {
  animation: notif-out 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}

@keyframes notif-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(60px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes notif-out {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(60px); }
}

@media (max-width: 600px) {
  .notif-bounce-enter-active {
    animation: notif-in-mobile 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .notif-bounce-leave-active {
    animation: notif-out-mobile 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
  }
}
@keyframes notif-in-mobile {
  0% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes notif-out-mobile {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
}

/* --- COMPOSANTS PARAMÈTRES (modal-settings) --- */
.modal-settings {
  max-width: 500px !important;
  max-height: 85vh;
  overflow-y: auto;
}
.sections-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.section-settings-bloc {
  border-bottom: 1px solid var(--border-subtile);
  padding-bottom: 20px;
}
.section-settings-bloc:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.titre-section-settings {
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}
.input-desactive {
  background: rgba(128, 128, 128, 0.08) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-subtile) !important;
  cursor: not-allowed;
}

/* Sélecteur de Thèmes */
.selecteur-themes-premium {
  display: flex;
  gap: 12px;
}
.btn-theme-option {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-theme-option:hover {
  border-color: var(--accent-gold);
  background: var(--accent-gold-light);
}
.btn-theme-option.actif {
  border-color: var(--accent-gold-dark);
  background: var(--accent-gold-light);
  box-shadow: 0 4px 12px rgba(197, 164, 126, 0.15);
}
.cercle-couleur {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
}

/* Sélecteur de Langues */
.selecteur-langues-premium {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn-langues-container {
  display: flex;
  gap: 12px;
}
.btn-langue-option {
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-langue-option:hover {
  border-color: var(--accent-gold);
  color: var(--text-primary);
}
.btn-langue-option.actif {
  background: var(--accent-green-light);
  border-color: var(--accent-green);
  color: var(--accent-green);
}

/* Stats et Cache */
.stats-cache-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}
.stat-badge-premium {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--accent-gold-light);
  border: 1px solid var(--border-subtile);
  padding: 10px 16px;
  border-radius: 16px;
}
.stat-chiffre {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--accent-green);
  line-height: 1.1;
}
.stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
.btn-clear-cache {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px dashed #c53030;
  background: transparent;
  color: #c53030;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear-cache:hover {
  background: #fff5f5;
  border-style: solid;
}

/* --- TRANSITIONS --- */
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

/* --- FEEDBACK TACTILE MOBILE (SCALE SUR TAP) --- */
button:active:not(:disabled),
.bouton-ajouter:active:not(:disabled),
.bouton-whatsapp:active:not(:disabled),
.btn-icone:active:not(:disabled),
.pilule-format:active:not(:disabled),
.selecteur-onglets button:active {
  transform: scale(0.96) !important;
  transition: transform 0.1s ease !important;
}
</style>