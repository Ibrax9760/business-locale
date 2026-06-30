<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../utils/supabaseClient';
import CarteProduit from '../components/CarteProduit.vue';
import CarteEquipement from '../components/CarteEquipement.vue';
import { t } from '../utils/i18n';

const props = defineProps(['panier']);
const emit = defineEmits(['ajouter-au-panier', 'open-menu-builder']);

const produits = ref([]);
const equipements = ref([]);
const recherche = ref('');
const pageActive = ref('tout');
const avisClients = ref([]);

const dateFiltreGlobal = ref('');
const dateMin = computed(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
});

const chargement = ref(true);

const obtenirDatesEntre = (debutStr, finStr) => {
  const dates = [];
  const debut = new Date(debutStr);
  const fin = new Date(finStr);
  let courante = new Date(debut);
  while (courante <= fin) {
    const yyyy = courante.getFullYear();
    const mm = String(courante.getMonth() + 1).padStart(2, '0');
    const dd = String(courante.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    courante.setDate(courante.getDate() + 1);
  }
  return dates;
};

const chargerDonnees = async () => {
  chargement.value = true;
  try {
    const [resProduits, resEquipements, resReservations] = await Promise.all([
      supabase.from('produits_gastronomie').select('*'),
      supabase.from('equipements_location').select('*'),
      supabase.from('reservations_equipements').select('*')
    ]);

    produits.value = resProduits.data ? resProduits.data.map(x => ({ 
      ...x, 
      type: 'gastronomie', 
      varianteChoisie: x.variantes[0] 
    })) : [];

    const reservations = resReservations.data || [];

    equipements.value = resEquipements.data ? resEquipements.data.map(x => {
      const resPourEq = reservations.filter(r => r.equipement_id === x.id);
      const datesIndisp = [];
      resPourEq.forEach(r => {
        if (r.date_debut && r.date_fin) {
          datesIndisp.push(...obtenirDatesEntre(r.date_debut, r.date_fin));
        }
      });

      return { 
        ...x, 
        typeElement: 'location', 
        prix: x.prix_journalier, 
        nom: x.titre,
        dates_indisponibles: datesIndisp
      };
    }) : [];

    // Récupérer les avis clients de manière sécurisée
    try {
      const { data: resAvis, error: errAvis } = await supabase.from('avis_clients').select('*').order('created_at', { ascending: false }).limit(6);
      if (!errAvis) {
        avisClients.value = resAvis || [];
      }
    } catch (e) {
      console.warn("Table avis_clients non disponible :", e.message);
    }
  } catch (err) {
    console.error("Erreur de chargement :", err);
  } finally {
    chargement.value = false;
  }
};

const listeIdsFavoris = ref(JSON.parse(localStorage.getItem('app-wishlist') || '[]'));
const nbFavoris = computed(() => listeIdsFavoris.value.length);

const produitsFavoris = computed(() => {
  return produits.value.filter(p => listeIdsFavoris.value.includes(p.id));
});
const equipementsFavoris = computed(() => {
  return equipements.value.filter(e => listeIdsFavoris.value.includes(e.id));
});

onMounted(() => {
  chargerDonnees();
  window.addEventListener('wishlist-updated', () => {
    listeIdsFavoris.value = JSON.parse(localStorage.getItem('app-wishlist') || '[]');
  });
});

const produitsFiltrés = computed(() => (pageActive.value === 'location' || pageActive.value === 'favoris') ? [] : produits.value.filter(p => p.titre.toLowerCase().includes(recherche.value.toLowerCase())));
const equipementsFiltrés = computed(() => (pageActive.value === 'gastronomie' || pageActive.value === 'favoris') ? [] : equipements.value.filter(e => e.titre.toLowerCase().includes(recherche.value.toLowerCase())));
</script>

<template>
  <div class="contenu-home"> 
    <section class="recherche-premium">
      <div class="header-intro">
        <span class="tagline">{{ t('tagline') }}</span>
        <h2 class="titre-recherche">{{ t('hero_title') }}</h2>
        <p class="description-recherche">{{ t('hero_desc') }}</p>
      </div>
      
      <div class="barre-recherche-container">
        <svg class="icone-loupe-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          class="champ-recherche-premium" 
          :placeholder="t('search_placeholder')" 
          v-model="recherche" 
        />
      </div>

      <div class="filtres-scrollables">
        <button class="chip-premium" :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">{{ t('filter_all') }}</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">{{ t('filter_gastronomy') }}</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">{{ t('filter_rental') }}</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'favoris' }" @click="pageActive = 'favoris'">Favoris ❤️ ({{ nbFavoris }})</button>
      </div>
    </section>

    <!-- SQUELETTE DE CHARGEMENT PREMIUM -->
    <section v-if="chargement" class="section-catalogue">
      <div class="section-header">
        <div class="skeleton-title pulsing"></div>
        <div class="skeleton-subtitle pulsing"></div>
      </div>
      <div class="grille-produits">
        <div v-for="n in 3" :key="n" class="carte-skeleton-premium">
          <div class="skeleton-image pulsing"></div>
          <div class="skeleton-text-title pulsing"></div>
          <div class="skeleton-text-body pulsing"></div>
          <div class="skeleton-bas">
            <div class="skeleton-prix pulsing"></div>
            <div class="skeleton-btn pulsing"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION GASTRONOMIE -->
    <section v-else-if="produitsFiltrés.length > 0" class="section-catalogue">
      <div class="section-header">
        <h2 class="titre-section">{{ t('sec_gastronomy') }}</h2>
        <p class="soustitre-section">{{ t('sec_gastronomy_sub') }}</p>
      </div>

      <!-- Bannière créateur de menu guidé -->
      <div class="banniere-menu-builder-premium" v-if="pageActive !== 'location'">
        <div class="banniere-texte">
          <h4>🍳 Créez votre Menu Guidé Pas-à-Pas</h4>
          <p>Associez entrées fines, plats cuisinés de fête et douceurs sucrées en quelques étapes simples pour concevoir le repas idéal.</p>
        </div>
        <button @click="emit('open-menu-builder')" class="bouton-banniere-builder">
          Lancer l'assistant ✨
        </button>
      </div>
      
      <div class="grille-produits">
        <CarteProduit 
          v-for="produit in produitsFiltrés" 
          :key="produit.id" 
          :produit="produit"
          @ajouter-produit="emit('ajouter-au-panier', $event, true)"
        />
      </div>
    </section>

    <!-- SECTION LOCATION -->
    <section v-if="!chargement && equipementsFiltrés.length > 0" class="section-catalogue">
      <div class="section-header">
        <h2 class="titre-section">{{ t('sec_rental') }}</h2>
        <p class="soustitre-section">{{ t('sec_rental_sub') }}</p>
      </div>

      <!-- Vérificateur de date pour équipements -->
      <div class="verificateur-date-global" style="margin-top: 0; margin-bottom: 24px;">
        <label>📅 Vérifier la disponibilité des équipements pour votre date :</label>
        <div class="input-date-global-wrapper">
          <input type="date" v-model="dateFiltreGlobal" :min="dateMin" class="input-date-global" />
          <button v-if="dateFiltreGlobal" @click="dateFiltreGlobal = ''" class="btn-effacer-date-global" title="Effacer le filtre">❌</button>
        </div>
      </div>
      
      <div class="grille-equipements">
        <CarteEquipement 
          v-for="equipement in equipementsFiltrés" 
          :key="equipement.id" 
          :equipement="equipement"
          :dateFiltreGlobal="dateFiltreGlobal"
          @ajouter-equipement="emit('ajouter-au-panier', $event, false)"
        />
      </div>
    </section>

    <!-- SECTION FAVORIS -->
    <section v-if="!chargement && pageActive === 'favoris'" class="section-catalogue">
      <div class="section-header">
        <h2 class="titre-section">❤️ Vos Coups de Cœur</h2>
        <p class="soustitre-section">Retrouvez les produits et matériels que vous avez aimés pour votre événement.</p>
      </div>
      
      <div v-if="produitsFavoris.length === 0 && equipementsFavoris.length === 0" class="aucun-produit-favori" style="text-align: center; padding: 40px; color: var(--text-secondary); font-style: italic; font-size: 0.9rem;">
        Aucun coup de cœur pour le moment. Cliquez sur le cœur ❤️ des fiches pour en ajouter !
      </div>
      
      <div class="grille-produits" v-else>
        <CarteProduit 
          v-for="produit in produitsFavoris" 
          :key="produit.id" 
          :produit="produit"
          @ajouter-produit="emit('ajouter-au-panier', $event, true)"
        />
        <CarteEquipement 
          v-for="equipement in equipementsFavoris" 
          :key="equipement.id" 
          :equipement="equipement"
          :dateFiltreGlobal="dateFiltreGlobal"
          @ajouter-equipement="emit('ajouter-au-panier', $event, false)"
        />
      </div>
    </section>

    <!-- SECTION AVIS CLIENTS -->
    <section v-if="!chargement && avisClients.length > 0" class="section-catalogue section-avis-clients">
      <div class="section-header">
        <h2 class="titre-section">✨ Témoignages & Avis Clients</h2>
        <p class="soustitre-section">Ce que pensent nos clients de nos créations prestigieuses et de nos équipements.</p>
      </div>

      <div class="carousel-avis-container">
        <div class="carte-avis" v-for="avis in avisClients" :key="avis.id">
          <div class="note-etoiles">
            <span v-for="n in 5" :key="n" class="etoile">{{ n <= avis.note ? '★' : '☆' }}</span>
          </div>
          <p class="commentaire">« {{ avis.commentaire }} »</p>
          <div class="auteur">
            <strong>{{ avis.nom_client }}</strong>
            <span class="badge-verifie">✔ Client Vérifié</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contenu-home {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-intro {
  margin-bottom: 28px;
  text-align: center;
}

.tagline {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--accent-gold-dark);
  display: inline-block;
  margin-bottom: 12px;
}

.titre-recherche {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text-primary);
  line-height: 1.2;
}

.description-recherche {
  font-size: 0.95rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.section-catalogue {
  margin-top: 48px;
  margin-bottom: 56px;
}

.section-header {
  margin-bottom: 32px;
  border-left: 3px solid var(--accent-gold);
  padding-left: 16px;
}

.titre-section {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: var(--text-primary);
}

.soustitre-section {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 500;
}

@media (max-width: 768px) {
  .titre-recherche {
    font-size: 1.8rem;
  }
  .section-catalogue {
    margin-top: 36px;
    margin-bottom: 40px;
  }
  .section-header {
    margin-bottom: 24px;
  }
  .titre-section {
    font-size: 1.5rem;
  }
}

/* --- CLASSE ET ANIMATIONS SQUELETTE PREMIUM --- */
.carte-skeleton-premium {
  background: var(--bg-carte);
  border-radius: var(--radius-carte, 24px);
  padding: 24px;
  border: 1px solid var(--border-subtile);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  background: var(--accent-gold-light);
}
.skeleton-title {
  width: 200px;
  height: 28px;
  background: var(--accent-gold-light);
  border-radius: 6px;
  margin-bottom: 8px;
}
.skeleton-subtitle {
  width: 320px;
  height: 16px;
  background: var(--accent-gold-light);
  border-radius: 4px;
}
.skeleton-text-title {
  width: 60%;
  height: 22px;
  background: var(--accent-gold-light);
  border-radius: 6px;
}
.skeleton-text-body {
  width: 100%;
  height: 48px;
  background: var(--accent-gold-light);
  border-radius: 8px;
}
.skeleton-bas {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtile);
}
.skeleton-prix {
  width: 70px;
  height: 24px;
  background: var(--accent-gold-light);
  border-radius: 6px;
}
.skeleton-btn {
  width: 110px;
  height: 42px;
  background: var(--accent-gold-light);
  border-radius: 12px;
}
.pulsing {
  animation: pulse-animation 1.5s infinite ease-in-out;
}
@keyframes pulse-animation {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* Bannière Menu Builder Premium */
.banniere-menu-builder-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, var(--accent-gold-light), rgba(255, 255, 255, 0.4));
  border: 1px solid var(--accent-gold);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 32px;
  gap: 20px;
  box-shadow: var(--shadow-douce);
  backdrop-filter: blur(8px);
}
.banniere-texte h4 {
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem;
  margin: 0 0 6px 0;
  color: var(--text-primary);
}
.banniere-texte p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.bouton-banniere-builder {
  background: var(--accent-green);
  color: #fff;
  padding: 12px 24px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.2);
  transition: all 0.3s ease;
}
.bouton-banniere-builder:hover {
  transform: translateY(-2px);
  background: #1e362e;
  box-shadow: 0 6px 16px rgba(38, 70, 60, 0.3);
}

@media (max-width: 600px) {
  .banniere-menu-builder-premium {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    padding: 20px;
  }
  .bouton-banniere-builder {
    text-align: center;
  }
}

/* Vérificateur de Date Global */
.verificateur-date-global {
  margin-top: 18px;
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  padding: 14px 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: var(--shadow-douce);
  flex-wrap: wrap;
}
.verificateur-date-global label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}
.input-date-global-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input-date-global {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  outline: none;
}
.btn-effacer-date-global {
  background: transparent;
  border: none;
  color: #c62828;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px;
}

@media (max-width: 600px) {
  .verificateur-date-global {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    text-align: center;
  }
  .input-date-global-wrapper {
    justify-content: center;
  }
}

/* Section Avis Clients */
.section-avis-clients {
  margin-top: 56px;
  margin-bottom: 56px;
}
.carousel-avis-container {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 10px 4px 24px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: var(--accent-gold) transparent;
}
.carte-avis {
  flex: 0 0 300px;
  scroll-snap-align: start;
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-douce);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s;
}
.carte-avis:hover {
  transform: translateY(-2px);
  border-color: var(--accent-gold);
  box-shadow: var(--shadow-premium);
}
.note-etoiles {
  color: #f59e0b;
  font-size: 1.1rem;
}
.commentaire {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  font-style: italic;
  margin: 0;
  flex-grow: 1;
}
.auteur {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-subtile);
  padding-top: 12px;
  margin-top: auto;
}
.auteur strong {
  font-size: 0.85rem;
  color: var(--text-primary);
}
.badge-verifie {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-green);
  background: var(--accent-green-light);
  padding: 2px 8px;
  border-radius: 99px;
}
</style>