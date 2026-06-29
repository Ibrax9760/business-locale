<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../utils/supabaseClient';
import CarteProduit from '../components/CarteProduit.vue';
import CarteEquipement from '../components/CarteEquipement.vue';

const props = defineProps(['panier']);
const emit = defineEmits(['ajouter-au-panier']);

const produits = ref([]);
const equipements = ref([]);
const recherche = ref('');
const pageActive = ref('tout');

const chargerDonnees = async () => {
  const { data: p } = await supabase.from('produits_gastronomie').select('*');
  produits.value = p.map(x => ({ ...x, type: 'gastronomie', varianteChoisie: x.variantes[0] }));
  const { data: e } = await supabase.from('equipements_location').select('*');
  equipements.value = e.map(x => ({ ...x, typeElement: 'location', prix: x.prix_journalier, nom: x.titre }));
};

onMounted(chargerDonnees);

const produitsFiltrés = computed(() => pageActive.value === 'location' ? [] : produits.value.filter(p => p.titre.toLowerCase().includes(recherche.value.toLowerCase())));
const equipementsFiltrés = computed(() => pageActive.value === 'gastronomie' ? [] : equipements.value.filter(e => e.titre.toLowerCase().includes(recherche.value.toLowerCase())));
</script>

<template>
  <div class="contenu-home"> 
    <section class="recherche-premium">
      <div class="header-intro">
        <span class="tagline">Traiteur de Prestige &amp; Location d'Équipements</span>
        <h2 class="titre-recherche">L'Art de Recevoir sur Mesure</h2>
        <p class="description-recherche">Découvrez nos créations culinaires raffinées et notre matériel haut de gamme pour vos événements à Mayotte.</p>
      </div>
      
      <div class="barre-recherche-container">
        <svg class="icone-loupe-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          class="champ-recherche-premium" 
          placeholder="Rechercher une saveur, un équipement..." 
          v-model="recherche" 
        />
      </div>

      <div class="filtres-scrollables">
        <button class="chip-premium" :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">Toutes nos offres</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">Gastronomie Fine</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">Matériel de Réception</button>
      </div>
    </section>

    <!-- SECTION GASTRONOMIE -->
    <section v-if="produitsFiltrés.length > 0" class="section-catalogue">
      <div class="section-header">
        <h2 class="titre-section">Créations Gastronomiques</h2>
        <p class="soustitre-section">Saveurs locales authentiques &amp; dressage d'exception</p>
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
    <section v-if="equipementsFiltrés.length > 0" class="section-catalogue">
      <div class="section-header">
        <h2 class="titre-section">Matériel en Location</h2>
        <p class="soustitre-section">Équipez vos événements avec notre matériel professionnel sélectionné</p>
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
</style>