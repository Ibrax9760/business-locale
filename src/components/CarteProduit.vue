<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  produit: Object
})

const emit = defineEmits(['ajouter-produit'])

// État réactif local pour gérer la sélection du format sans impacter App.vue
const varianteActive = ref(null)

// Initialisation au chargement du composant
onMounted(() => {
  if (props.produit?.variantes?.length > 0) {
    varianteActive.value = props.produit.variantes[0]
  }
})

// Déclencheur tactile pour les pilules
const selectionnerVariante = (variante) => {
  varianteActive.value = variante
}

// Construction de l'objet transactionnel avant l'envoi au parent
const ajouterAuPanier = () => {
  const produitACommander = {
    ...props.produit,
    varianteChoisie: varianteActive.value
  }
  emit('ajouter-produit', produitACommander)
}
</script>

<template>
  <article class="carte-premium">
    <div class="conteneur-image">
      <img :src="produit.image_url" :alt="produit.titre" class="image-produit" loading="lazy" />
    </div>
    
    <div class="contenu-carte">
      <h3 class="titre-produit">{{ produit.titre }}</h3>
      <p class="description-produit">{{ produit.description }}</p>
      
      <div class="selecteur-pilules" v-if="produit.variantes?.length > 1">
        <button 
          v-for="variante in produit.variantes" 
          :key="variante.id"
          class="pilule-format"
          :class="{ active: varianteActive?.id === variante.id }"
          @click="selectionnerVariante(variante)"
        >
          {{ variante.nom }}
        </button>
      </div>

      <div class="pied-carte">
        <span class="prix-affiche">
          {{ varianteActive ? varianteActive.prix : (produit.variantes?.[0]?.prix || 0) }} €
        </span>
        <button class="bouton-ajouter-premium" @click="ajouterAuPanier" aria-label="Ajouter au panier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Héritage dynamique des couleurs globales de App.vue */
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
  aspect-ratio: 4 / 3; /* Ratio standard photographique */
  overflow: hidden;
  position: relative;
  background-color: rgba(128, 128, 128, 0.1); /* Squelette de chargement visuel */
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
  margin: 0 0 16px 0;
  line-height: 1.5;
  flex-grow: 1;
}

/* Architecture des Pilules (Formats) */
.selecteur-pilules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.pilule-format {
  flex: 1;
  min-width: 80px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtile);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.pilule-format.active {
  background-color: var(--text-accent);
  border-color: var(--text-accent);
}

/* Gestion chromatique stricte du texte sur la pilule active */
@media (prefers-color-scheme: light) {
  .pilule-format.active { color: #ffffff; }
}
@media (prefers-color-scheme: dark) {
  .pilule-format.active { color: #090a0f; }
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

.prix-affiche {
  font-family: 'Inter', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: inherit;
}

.bouton-ajouter-premium {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: var(--btn-primary);
  color: var(--btn-primary-text);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bouton-ajouter-premium svg {
  width: 22px;
  height: 22px;
}

.bouton-ajouter-premium:active {
  transform: scale(0.85);
}

@media (max-width: 768px) {
  .conteneur-image {
    margin: 12px 12px 0 12px;          /* Isole l'image des bords de la carte */
    width: calc(100% - 24px);          /* Réduit proportionnellement la largeur */
    border-radius: 14px;               /* Arrondit les 4 angles de l'image */
  }
  
  .contenu-carte {
    padding: 16px;                     /* Ajuste les espacements textuels */
  }
}
</style>