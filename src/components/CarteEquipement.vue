<script setup>
const props = defineProps({
  equipement: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['ajouter-panier'])

const ajouterAuPanier = () => {
  emit('ajouter-panier', {
    idUnique: props.equipement.id,
    titre: props.equipement.titre,
    prix: props.equipement.prix_journalier,
    quantite: 1
  })
}
</script>

<template>
  <div class="carte-equipement">
    <img :src="equipement.image_url" :alt="equipement.titre" class="image-produit" />
    <h3>{{ equipement.titre }}</h3>
    <p>{{ equipement.description }}</p>
    <p class="prix"><strong>Prix par jour :</strong> {{ equipement.prix_journalier }} €</p>
    <button @click="ajouterAuPanier" class="bouton-ajout">Réserver</button>
  </div>
</template>

<style scoped>
.carte-equipement {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 24px 70px rgba(31, 40, 51, 0.08);
  backdrop-filter: blur(12px);
}

.carte-equipement::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(240, 138, 93, 0.12);
  top: -30px;
  right: -30px;
  pointer-events: none;
}

.carte-equipement:hover {
  transform: translateY(-2px);
}

.image-produit {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 24px;
  margin-bottom: 14px;
  box-shadow: inset 0 2px 16px rgba(0, 0, 0, 0.08);
}

.carte-equipement h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: #1f2833;
}

.carte-equipement p {
  color: #6b7b8c;
  line-height: 1.6;
}

.prix {
  margin: 12px 0;
  font-weight: 600;
  color: #b35034;
}

.bouton-ajout {
  width: 100%;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18);
  margin-top: 12px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
  animation: pulseGlow 5s ease-in-out infinite;
}

.bouton-ajout:hover {
  transform: translateY(-1px);
  opacity: 0.98;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 18px 40px rgba(240, 138, 93, 0.18); }
  50% { box-shadow: 0 24px 50px rgba(240, 138, 93, 0.24); }
}

@media (max-width: 640px) {
  .carte-equipement {
    border-radius: 24px;
    padding: 16px;
  }
}
</style>
