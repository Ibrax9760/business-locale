<script setup>
import { ref, computed } from 'vue';

// On reçoit les données de l'équipement depuis App.vue
const props = defineProps({
  equipement: Object
});

// On déclare l'événement pour envoyer l'article dans le panier
const emit = defineEmits(['ajouter-equipement']);

const dateDebut = ref('');
const dateFin = ref('');

// Date minimale (Aujourd'hui) pour bloquer la sélection de dates passées
const dateAujourdhui = computed(() => new Date().toISOString().split('T')[0]);

// Validation : Les deux dates doivent être remplies et la fin doit être supérieure ou égale au début
const periodeValide = computed(() => {
  if (!dateDebut.value || !dateFin.value) return false;
  return new Date(dateFin.value) >= new Date(dateDebut.value);
});

// Calcul du nombre de jours
const joursLocation = computed(() => {
  if (!periodeValide.value) return 0;
  const diffTemps = new Date(dateFin.value) - new Date(dateDebut.value);
  const diffJours = Math.ceil(diffTemps / (1000 * 60 * 60 * 24));
  return diffJours === 0 ? 1 : diffJours; // Minimum 1 jour facturé
});

const preparerMiseAuPanier = () => {
  if (!periodeValide.value) return;

  // Création du paquet de données envoyé au panier
  const payloadLocation = {
    ...props.equipement,
    typeElement: 'location',
    dateDebutSelectionnee: dateDebut.value,
    dateFinSelectionnee: dateFin.value,
    dureeJours: joursLocation.value,
    // Le prix total est calculé dynamiquement
    prixTotalLocation: props.equipement.prix * joursLocation.value
  };

  emit('ajouter-equipement', payloadLocation);
  
  // Réinitialisation des champs après l'ajout pour la prochaine sélection
  dateDebut.value = '';
  dateFin.value = '';
};
</script>

<template>
  <div class="carte-element">
    <div class="image-container">
      <img :src="equipement.image_url" :alt="equipement.nom" />
    </div>
    
    <div class="contenu-carte">
      <h3>{{ equipement.nom }}</h3>
      <p class="description">{{ equipement.description }}</p>
      <p class="prix">{{ equipement.prix }} € / jour</p>

      <div class="zone-reservation">
        <div class="champ-date">
          <label>Date de début</label>
          <input type="date" v-model="dateDebut" :min="dateAujourdhui" />
        </div>
        <div class="champ-date">
          <label>Date de fin</label>
          <input type="date" v-model="dateFin" :min="dateDebut || dateAujourdhui" />
        </div>
      </div>

      <div v-if="periodeValide" class="recap-prix">
        Total pour {{ joursLocation }} jour(s) : <strong>{{ equipement.prix * joursLocation }} €</strong>
      </div>

      <button 
        @click="preparerMiseAuPanier" 
        :disabled="!periodeValide"
        class="bouton-ajouter"
        :class="{ 'bouton-desactive': !periodeValide }"
      >
        {{ periodeValide ? 'Ajouter au panier' : 'Sélectionnez vos dates' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.carte-element {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
}

.image-container img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.contenu-carte {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: #3b302a;
  margin: 0 0 10px 0;
}

.description {
  font-family: 'Inter', sans-serif;
  color: #6b7b8c;
  font-size: 0.9rem;
  margin-bottom: 15px;
  flex-grow: 1;
}

.prix {
  font-weight: 700;
  color: #bc6c46;
  font-size: 1.2rem;
  margin-bottom: 15px;
}

.zone-reservation {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 10px;
}

.champ-date {
  display: flex;
  flex-direction: column;
  width: 50%;
}

.champ-date label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 6px;
}

.champ-date input {
  padding: 8px;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  outline: none;
}

.champ-date input:focus {
  border-color: #74b4aa;
}

.recap-prix {
  font-size: 0.9rem;
  color: #1a5653;
  background: #eef7f6;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 15px;
  text-align: center;
}

.bouton-ajouter {
  background: #3b302a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 99px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: auto; /* Pousse le bouton vers le bas de la carte */
}

.bouton-ajouter:not(.bouton-desactive):hover {
  background: #2c2520;
}

.bouton-desactive {
  background: #f4f6f8;
  color: #a0aec0;
  cursor: not-allowed;
  border: 1px solid #d1d9e0;
}
</style>