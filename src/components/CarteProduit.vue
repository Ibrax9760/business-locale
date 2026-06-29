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
      <span class="badge-tag">Gastronomie</span>
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
        <div class="zone-prix">
          <span class="label-prix">Prix</span>
          <span class="prix-affiche">
            {{ varianteActive ? varianteActive.prix : (produit.variantes?.[0]?.prix || 0) }} €
          </span>
        </div>
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
.carte-premium {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: var(--radius-carte);
  overflow: hidden;
  box-shadow: var(--shadow-douce);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-premium:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium), var(--shadow-hover);
  border-color: rgba(197, 164, 126, 0.4);
}

.conteneur-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  position: relative;
  background-color: #f7f6f2;
}

.image-produit {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-premium:hover .image-produit {
  transform: scale(1.05);
}

.badge-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-green);
  border: 1px solid rgba(197, 164, 126, 0.15);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.contenu-carte {
  padding: 24px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.titre-produit {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: var(--text-primary);
  line-height: 1.3;
}

.description-produit {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.6;
  flex-grow: 1;
}

/* Architecture des Pilules (Formats) - Haute Visibilité */
.selecteur-pilules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.pilule-format {
  flex: 1;
  min-width: 80px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

.pilule-format:hover {
  border-color: var(--accent-gold);
  color: var(--text-primary);
  background: var(--accent-gold-light);
}

.pilule-format.active {
  background-color: var(--accent-green);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 16px rgba(38, 70, 60, 0.15);
}

/* Zone d'action finale */
.pied-carte {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtile);
}

.zone-prix {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-prix {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.prix-affiche {
  font-family: 'Inter', sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.bouton-ajouter-premium {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background-color: var(--btn-primary);
  color: var(--btn-primary-text);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(38, 70, 60, 0.2);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bouton-ajouter-premium svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.bouton-ajouter-premium:hover {
  background-color: #1e362e;
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 8px 20px rgba(38, 70, 60, 0.3);
}

.bouton-ajouter-premium:active {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .conteneur-image {
    margin: 12px 12px 0 12px;
    width: calc(100% - 24px);
    border-radius: 16px;
  }
  
  .contenu-carte {
    padding: 18px;
  }
}
</style>