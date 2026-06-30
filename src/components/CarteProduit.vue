<script setup>
import { ref } from 'vue';
import { t } from '../utils/i18n';

const props = defineProps(['produit']);
const emit = defineEmits(['ajouter-produit']);
</script>

<template>
  <div class="carte-produit">
    <div class="badge-type-gastronomie">{{ t('gastronomy_badge') }}</div>
    <div class="image-wrapper">
      <img :src="produit.image_url" :alt="produit.titre" class="image-produit" />
    </div>
    <h3>{{ produit.titre }}</h3>
    <p class="description">{{ produit.description }}</p>
    
    <div class="selecteur-pilules">
      <button 
        v-for="variante in produit.variantes" 
        :key="variante.nom"
        class="pilule-format"
        :class="{ active: produit.varianteChoisie.nom === variante.nom }"
        @click="produit.varianteChoisie = variante"
      >
        {{ variante.nom }}
      </button>
    </div>

    <div class="bas-carte">
      <div class="conteneur-prix">
        <span class="label-prix">{{ t('price_label') }}</span>
        <span class="valeur-prix">{{ produit.varianteChoisie.prix }} €</span>
      </div>
      <button @click="emit('ajouter-produit', produit)" class="bouton-ajouter">
        {{ t('add_to_cart') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.carte-produit {
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

.carte-produit:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium, 0 30px 60px rgba(31, 27, 24, 0.06)), var(--shadow-hover, 0 24px 50px rgba(197, 164, 126, 0.12));
  border-color: rgba(197, 164, 126, 0.4);
}

/* Badge Traiteur */
.badge-type-gastronomie {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(38, 70, 60, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
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

.image-produit {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-produit:hover .image-produit {
  transform: scale(1.08);
}

.carte-produit h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.description {
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

/* Style ACTIF commun (opacité totale, légère ombre) */
.pilule-format.active {
  opacity: 1;
  border-color: transparent;
  background-color: var(--accent-green);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(38, 70, 60, 0.15);
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

.bouton-ajouter:hover {
  background: #1e362e;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(38, 70, 60, 0.25);
}

.bouton-ajouter:active {
  transform: translateY(0);
}
</style>