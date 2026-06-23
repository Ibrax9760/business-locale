<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  produit: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['ajouter-panier'])

const varianteChoisie = ref(null)

// Initialiser avec la première variante
if (props.produit.variantes && props.produit.variantes.length > 0) {
  varianteChoisie.value = props.produit.variantes[0]
}

const prixAffiche = computed(() => varianteChoisie.value?.prix ?? props.produit.variantes[0].prix)

const ajouterAuPanier = () => {
  const idUnique = `${props.produit.id}-${varianteChoisie.value.id}`
  const titreComplet = `${props.produit.titre} - ${varianteChoisie.value.nom}`
  const prixFinal = varianteChoisie.value.prix
  
  emit('ajouter-panier', {
    idUnique,
    titre: titreComplet,
    prix: prixFinal,
    quantite: 1
  })
}
</script>

<template>
  <div class="carte-produit">
    <img :src="produit.image_url" :alt="produit.titre" class="image-produit" />
    <h3>{{ produit.titre }}</h3>
    <p>{{ produit.description }}</p>
    <div class="selecteur-variante" v-if="produit.variantes?.length > 1">
      <label>Choisir la taille :</label>
      <select v-model="varianteChoisie">
        <option v-for="v in produit.variantes" :key="v.id" :value="v">{{ v.nom }} - {{ v.prix }} €</option>
      </select>
    </div>
    <p v-else class="prix-unique">{{ produit.variantes[0].nom }} - {{ produit.variantes[0].prix }} €</p>
    <button @click="ajouterAuPanier" class="bouton-ajout">Ajouter au panier ({{ prixAffiche }} €)</button>
  </div>
</template>

<style scoped>
.carte-produit {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 24px 70px rgba(31, 40, 51, 0.08);
  backdrop-filter: blur(12px);
}

.carte-produit::after {
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

.carte-produit:hover {
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

.carte-produit h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: #1f2833;
}

.carte-produit p {
  color: #6b7b8c;
  line-height: 1.6;
}

.selecteur-variante {
  margin: 16px 0 10px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 18px;
  padding: 14px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.selecteur-variante label {
  font-size: 0.9rem;
  color: #1f2833;
  display: block;
  margin-bottom: 8px;
}

.selecteur-variante select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  font-size: 1rem;
  color: #1f2833;
  background: white;
}

.prix-unique {
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
  .carte-produit {
    border-radius: 24px;
    padding: 16px;
  }
}
</style>
