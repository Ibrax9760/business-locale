<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../utils/supabaseClient';
import CarteProduit from '../components/CarteProduit.vue';
import CarteEquipement from '../components/CarteEquipement.vue';
import { t } from '../utils/i18n';

const props = defineProps(['panier']);
const emit = defineEmits(['ajouter-au-panier']);

const produits = ref([]);
const equipements = ref([]);
const recherche = ref('');
const pageActive = ref('tout');

const chargement = ref(true);

const chargerDonnees = async () => {
  chargement.value = true;
  try {
    const { data: p } = await supabase.from('produits_gastronomie').select('*');
    produits.value = p ? p.map(x => ({ ...x, type: 'gastronomie', varianteChoisie: x.variantes[0] })) : [];
    const { data: e } = await supabase.from('equipements_location').select('*');
    equipements.value = e ? e.map(x => ({ ...x, typeElement: 'location', prix: x.prix_journalier, nom: x.titre })) : [];
  } catch (err) {
    console.error("Erreur de chargement :", err);
  } finally {
    chargement.value = false;
  }
};

onMounted(chargerDonnees);

const produitsFiltrés = computed(() => pageActive.value === 'location' ? [] : produits.value.filter(p => p.titre.toLowerCase().includes(recherche.value.toLowerCase())));
const equipementsFiltrés = computed(() => pageActive.value === 'gastronomie' ? [] : equipements.value.filter(e => e.titre.toLowerCase().includes(recherche.value.toLowerCase())));
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
      
      <div class="grille-equipements">
        <CarteEquipement 
          v-for="equipement in equipementsFiltrés" 
          :key="equipement.id" 
          :equipement="equipement"
          @ajouter-equipement="emit('ajouter-au-panier', $event, false)"
        />
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
</style>