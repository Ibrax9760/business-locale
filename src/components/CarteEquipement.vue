<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  equipement: Object
})

const emit = defineEmits(['ajouter-equipement'])

const dateDebut = ref('')
const dateFin = ref('')

const dureeLocation = computed(() => {
  if (!dateDebut.value || !dateFin.value) return 0
  const debut = new Date(dateDebut.value)
  const fin = new Date(dateFin.value)
  const diffTemps = fin.getTime() - debut.getTime()
  const diffJours = Math.ceil(diffTemps / (1000 * 3600 * 24))
  return diffJours > 0 ? diffJours : 0
})

const prixTotal = computed(() => {
  return dureeLocation.value * props.equipement.prix_journalier
})

const reserverEquipement = () => {
  if (dureeLocation.value <= 0) {
    alert("Veuillez sélectionner des dates valides pour la location.")
    return
  }
  emit('ajouter-equipement', {
    ...props.equipement,
    dateDebutSelectionnee: dateDebut.value,
    dateFinSelectionnee: dateFin.value,
    dureeJours: dureeLocation.value,
    prixTotalLocation: prixTotal.value
  })
}
</script>

<template>
  <article class="carte-premium">
    <div class="conteneur-image">
      <img :src="equipement.image_url" :alt="equipement.titre" class="image-produit" loading="lazy" />
    </div>
    
    <div class="contenu-carte">
      <h3 class="titre-produit">{{ equipement.titre }}</h3>
      <p class="description-produit">{{ equipement.description }}</p>
      
      <div class="selecteur-dates-premium">
        <div class="champ-date">
          <label>Début</label>
          <input type="date" v-model="dateDebut" class="input-date" />
        </div>
        <div class="champ-date">
          <label>Fin</label>
          <input type="date" v-model="dateFin" class="input-date" />
        </div>
      </div>

      <div class="pied-carte">
        <div class="info-prix">
          <span class="prix-affiche">{{ prixTotal > 0 ? prixTotal : equipement.prix_journalier }} €</span>
          <span class="prix-detail">{{ prixTotal > 0 ? `${dureeLocation} jour(s)` : '/ jour' }}</span>
        </div>
        
        <button 
          class="bouton-ajouter-premium" 
          :class="{ 'bouton-desactive': dureeLocation <= 0 }"
          @click="reserverEquipement" 
          :disabled="dureeLocation <= 0"
          aria-label="Réserver cet équipement"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Socle partagé avec la carte gastronomie */
.carte-premium {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: var(--radius-carte);
  overflow: hidden;
  box-shadow: var(--shadow-douce);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.carte-premium:active {
  transform: scale(0.98);
}

.conteneur-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: rgba(128, 128, 128, 0.1);
}

.image-produit {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.contenu-carte {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.titre-produit {
  font-family: 'Playfair Display', serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: inherit;
}

.description-produit {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
  flex-grow: 1;
}

/* Design spécifique du sélecteur de dates */
.selecteur-dates-premium {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  background-color: var(--bg-input);
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-subtile);
}

.champ-date {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.champ-date label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.input-date {
  background: transparent;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: inherit;
  width: 100%;
}

.input-date:focus {
  outline: none;
  box-shadow: none;
}

/* Zone d'action finale */
.pied-carte {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtile);
}

.info-prix {
  display: flex;
  flex-direction: column;
}

.prix-affiche {
  font-family: 'Inter', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: inherit;
  line-height: 1;
}

.prix-detail {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-weight: 500;
}

.bouton-ajouter-premium {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: var(--text-accent);
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bouton-ajouter-premium svg {
  width: 20px;
  height: 20px;
}

.bouton-ajouter-premium:active {
  transform: scale(0.85);
}

.bouton-desactive {
  background-color: var(--border-subtile);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.bouton-desactive:active {
  transform: none;
}
</style>