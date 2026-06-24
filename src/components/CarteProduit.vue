<script setup>
const props = defineProps({
  produit: Object
})
const emit = defineEmits(['ajouter-panier'])

// Fonction pour ajouter au panier
const ajouter = () => {
  emit('ajouter-panier', {
    ...props.produit,
    idUnique: `${props.produit.id}-${props.produit.varianteChoisie?.id || 'default'}`,
    titre: `${props.produit.titre}${props.produit.varianteChoisie ? ' - ' + props.produit.varianteChoisie.nom : ''}`,
    prix: props.produit.varianteChoisie?.prix || props.produit.prix || 0
  })
}
</script>

<template>
  <div class="carte-produit">
    <img :src="produit.image_url" :alt="produit.titre" class="image-produit" />
    
    <div class="contenu-carte">
      <h3>{{ produit.titre }}</h3>
      <p class="description">{{ produit.description }}</p>
      
      <div class="pied-carte">
        <div class="info-prix">
          <span class="prix">{{ produit.varianteChoisie?.prix || produit.prix }} €</span>
        </div>
        <button @click="ajouter" class="bouton-ajout">
          AJOUTER AU PANIER
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.carte-produit {
  background: #ffffff;
  border-radius: 28px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
}

.image-produit {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 20px;
  margin-bottom: 16px;
}

h3 {
  font-family: 'Playfair Display', serif;
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #3b302a;
}

.description {
  font-family: 'Inter', sans-serif;
  color: #6b7b8c;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 16px;
}

.info-prix {
  margin-bottom: 12px;
}

.prix {
  font-weight: 700;
  font-size: 1.2rem;
  color: #2b4c40;
}

.bouton-ajout {
  width: 100%;
  padding: 14px;
  background: #2b4c40;
  color: white;
  border: none;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.bouton-ajout:hover {
  background: #1a3028;
}
</style>