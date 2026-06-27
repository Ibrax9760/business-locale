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
      <h2 class="titre-recherche">Explorez notre carte</h2>
      
      <div class="barre-recherche-container">
        <svg class="icone-loupe-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          class="champ-recherche-premium" 
          placeholder="Rechercher un plat, un équipement..." 
          v-model="recherche" 
        />
      </div>

      <div class="filtres-scrollables">
        <button class="chip-premium" :class="{ actif: pageActive === 'tout' }" @click="pageActive = 'tout'">Tout</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'gastronomie' }" @click="pageActive = 'gastronomie'">Gastronomie</button>
        <button class="chip-premium" :class="{ actif: pageActive === 'location' }" @click="pageActive = 'location'">Locations</button>
      </div>
    </section>

    <section v-if="produitsFiltrés.length > 0">
      <div class="grille-produits">
        <CarteProduit 
          v-for="produit in produitsFiltrés" 
          :key="produit.id" 
          :produit="produit"
          @ajouter-produit="emit('ajouter-au-panier', $event, true)"
        />
      </div>
    </section>

    <section v-if="equipementsFiltrés.length > 0">
      <h2>Location d'Équipements</h2>
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