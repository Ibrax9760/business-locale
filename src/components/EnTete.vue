<script setup>
defineProps({
  modeVendeur: Boolean,
  panierLength: Number
})

defineEmits(['toggle-vendeur', 'open-panier'])
</script>

<template>
  <header class="en-tete">
    <div>
      <h1>Ma Boutique Locale</h1>
      <p class="sous-titre">Une expérience gourmande et pratique, pensée pour mobile : plats locaux, locations faciles et commandes rapides.</p>
    </div>
    <div class="actions-entete">
      <button class="bouton-vendeur" @click="$emit('toggle-vendeur')">
        {{ modeVendeur ? 'Quitter Mode Vendeur' : '👨‍💼 Accès Vendeur' }}
      </button>
      <button class="panier-encart" @click="$emit('open-panier')">
        🛒 Panier : {{ panierLength }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.en-tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 26px;
}

.en-tete h1 {
  font-size: 2rem;
  line-height: 1.05;
  margin: 0;
  letter-spacing: -0.03em;
}

.en-tete .sous-titre {
  color: #6b7b8c;
  margin-top: 8px;
  font-size: 1rem;
  max-width: 420px;
  line-height: 1.6;
}

.actions-entete {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  justify-content: flex-end;
}

.bouton-vendeur,
.panier-encart {
  border: none;
  border-radius: 20px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.bouton-vendeur {
  padding: 14px 20px;
  background: linear-gradient(135deg, #f08a5d, #f7b872);
  color: white;
  font-weight: 700;
  box-shadow: 0 16px 32px rgba(240, 138, 93, 0.24);
  cursor: pointer;
}

.bouton-vendeur:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

.panier-encart {
  background: linear-gradient(135deg, #2abf84, #34d9a5);
  color: white;
  padding: 14px 18px;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(42, 191, 132, 0.18);
  cursor: pointer;
}

.panier-encart:hover {
  transform: translateY(-2px);
  opacity: 0.97;
}

@media (max-width: 640px) {
  .bouton-vendeur,
  .panier-encart {
    border-radius: 16px;
  }

  .actions-entete {
    justify-content: space-between;
  }
}
</style>
