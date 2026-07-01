<script setup>
import { ref, computed, onMounted } from 'vue';
import { t } from '../utils/i18n';

const props = defineProps(['equipement', 'dateFiltreGlobal']);
const emit = defineEmits(['ajouter-equipement']);

const estFavori = ref(false)

onMounted(() => {
  const list = JSON.parse(localStorage.getItem('app-wishlist') || '[]')
  estFavori.value = list.includes(props.equipement.id)
})

const basculerFavori = () => {
  let list = JSON.parse(localStorage.getItem('app-wishlist') || '[]')
  if (estFavori.value) {
    list = list.filter(id => id !== props.equipement.id)
    estFavori.value = false
  } else {
    list.push(props.equipement.id)
    estFavori.value = true
  }
  localStorage.setItem('app-wishlist', JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('wishlist-updated'))
}

const dateDebut = ref('');
const dateFin = ref('');

const estIndisponibleDateFiltre = computed(() => {
  if (!props.dateFiltreGlobal) return false;
  const indispo = props.equipement.dates_indisponibles || [];
  return indispo.includes(props.dateFiltreGlobal);
});

const datesInvalides = computed(() => {
  if (!dateDebut.value || !dateFin.value) return false;
  return new Date(dateFin.value) <= new Date(dateDebut.value);
});

const dureeJours = computed(() => {
  if (!dateDebut.value || !dateFin.value || datesInvalides.value) return 0;
  const diffTime = Math.abs(new Date(dateFin.value) - new Date(dateDebut.value));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const prixTotal = computed(() => {
  return dureeJours.value * props.equipement.prix_journalier;
});

const estDejaReserve = computed(() => {
  if (!dateDebut.value || !dateFin.value || datesInvalides.value) return false;
  const debut = new Date(dateDebut.value);
  const fin = new Date(dateFin.value);
  
  const indispo = props.equipement.dates_indisponibles || [];
  return indispo.some(dateStr => {
    const d = new Date(dateStr);
    return d >= debut && d <= fin;
  });
});

const dateMin = computed(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
});

const dateFinMin = computed(() => {
  return dateDebut.value ? dateDebut.value : dateMin.value;
});

const ajouterSiValide = (event) => {
  if (dureeJours.value > 0 && !estDejaReserve.value) {
    emit('ajouter-equipement', {
      ...props.equipement,
      dateDebutSelectionnee: dateDebut.value,
      dateFinSelectionnee: dateFin.value,
      dureeJours: dureeJours.value,
      prixTotalLocation: prixTotal.value
    }, event);
  }
};
</script>

<template>
  <div class="carte-equipement" style="position: relative;">
    <div class="badge-type-location">{{ t('rental_badge') }}</div>
    <button @click="basculerFavori" class="bouton-favori-absolu" :class="{ favori: estFavori }" aria-label="Ajouter aux favoris">
      ❤️
    </button>
    <div class="image-wrapper">
      <img :src="props.equipement.image_url" :alt="props.equipement.titre" class="image-equipement" />
    </div>
    <h3>{{ props.equipement.titre }}</h3>
    <p class="description">{{ props.equipement.description }}</p>
    
    <div class="details-specifications">
      <ul>
        <li v-for="spec in props.equipement.specifications_techniques" :key="spec">{{ spec }}</li>
      </ul>
    </div>

    <!-- Section Réservation Spécifique location -->
    <div class="selecteur-dates-container">
      <div class="champ-date">
        <label>{{ t('date_start') }}</label>
        <input type="date" v-model="dateDebut" :min="dateMin" class="input-date-premium" />
      </div>
      <div class="champ-date">
        <label>{{ t('date_end') }}</label>
        <input type="date" v-model="dateFin" :min="dateFinMin" class="input-date-premium" />
      </div>
    </div>

    <div v-if="datesInvalides" class="alerte-erreur-date">
      ⚠️ {{ t('err_chronology') }}
    </div>

    <div v-if="estDejaReserve" class="alerte-erreur-date">
      ⚠️ {{ t('err_reserved') }}
    </div>

    <div v-if="estIndisponibleDateFiltre" class="alerte-erreur-date" style="background: #fff5f5; color: #c53030; border-color: #fed7d7;">
      🔴 Indisponible pour votre date globale de recherche.
    </div>

    <div class="bas-carte">
      <div class="conteneur-prix">
        <span class="label-prix">
          {{ dureeJours > 0 ? t('total_rental') : t('price_label') }}
        </span>
        <span class="valeur-prix">
          {{ dureeJours > 0 ? prixTotal : props.equipement.prix_journalier }} €
          <span class="suffixe-jour" v-if="dureeJours === 0">{{ t('per_day') }}</span>
          <span class="suffixe-jour" v-else>({{ dureeJours }} {{ t('days') }})</span>
        </span>
      </div>
      <button 
        @click="ajouterSiValide($event)" 
        class="bouton-ajouter" 
        :disabled="dureeJours === 0 || estDejaReserve || datesInvalides"
      >
        {{ t('add_to_cart') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.carte-equipement {
  background: var(--bg-carte);
  border-radius: var(--radius-carte, 24px);
  padding: 24px;
  border: 1px solid var(--border-subtile);
  box-shadow: var(--shadow-douce);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-equipement:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium, 0 30px 60px rgba(31, 27, 24, 0.06)), var(--shadow-hover, 0 24px 50px rgba(197, 164, 126, 0.12));
  border-color: rgba(197, 164, 126, 0.4);
}

/* Badge Location */
.badge-type-location {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(197, 164, 126, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #1f1b18;
  padding: 6px 14px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

/* Conteneur d'image & Effet Zoom */
.image-wrapper {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
}

.image-equipement {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-equipement:hover .image-equipement {
  transform: scale(1.08);
}

.carte-equipement h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.details-specifications {
  margin-bottom: 20px;
}
.details-specifications ul {
  padding-left: 20px;
  margin: 0;
  list-style-type: square;
}
.details-specifications li {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

/* Sélecteur de Dates de prestige */
.selecteur-dates-container {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  background: var(--accent-gold-light);
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--border-subtile);
}

.champ-date {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.champ-date label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.input-date-premium {
  border: 1px solid var(--border-subtile);
  border-radius: 8px;
  padding: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  background: var(--bg-carte);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.input-date-premium:focus {
  border-color: var(--accent-gold);
}

/* Alertes Erreurs */
.alerte-erreur-date {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
}

/* Section Bas de Carte */
.bas-carte {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-subtile);
  padding-top: 18px;
  margin-top: auto;
}

.conteneur-prix {
  display: flex;
  flex-direction: column;
}

.label-prix {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.valeur-prix {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--accent-green);
}

.suffixe-jour {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.bouton-ajouter {
  background: var(--accent-green);
  color: #ffffff;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.15);
}

.bouton-ajouter:hover:not(:disabled) {
  background: #1e362e;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(38, 70, 60, 0.25);
}

.bouton-ajouter:disabled {
  background: #d1d9e0;
  color: #868e96;
  cursor: not-allowed;
  box-shadow: none;
}

.bouton-ajouter:active:not(:disabled) {
  transform: translateY(0);
}

@media (max-width: 420px) {
  .selecteur-dates-container {
    flex-direction: column;
    gap: 10px;
  }
}

.bouton-favori-absolu {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  font-size: 1rem;
  filter: grayscale(1);
}
.bouton-favori-absolu.favori {
  filter: grayscale(0);
  background: #ffffff;
  transform: scale(1.1);
  box-shadow: 0 6px 14px rgba(220, 38, 38, 0.2);
}
</style>