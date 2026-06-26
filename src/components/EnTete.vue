<script setup>
defineProps({
  utilisateur: Object,
  profilClient: Object,
  panierLength: Number
})

defineEmits(['toggle-vendeur', 'open-panier', 'deconnexion', 'open-auth'])
</script>

<template>
  <header class="en-tete">
    <div class="identite-visuelle">
      <div class="logo-container">
        <span class="logo-emoji">🧺</span>
      </div>
      <div class="titre-container">
        <h1>MA BOUTIQUE LOCALE</h1>
        <p class="sous-titre">Une expérience gourmande et pratique, pensée pour mobile : plats locaux, locations faciles et commandes rapides.</p>
      </div>
    </div>

    <div class="actions-entete">
      <template v-if="utilisateur">
        <span class="greeting">Bonjour, <strong>{{ profilClient?.nom || 'Ibrahim' }}</strong></span>
        <button class="bouton-auth" @click="$emit('deconnexion')">Déconnexion</button>
      </template>
      <template v-else>
        <button class="bouton-auth action-principale" @click="$emit('open-auth')">Connexion / Inscription</button>
      </template>

      <button 
  v-if="utilisateur && profilClient?.role === 'super_admin'" 
  class="bouton-vendeur" 
  @click="$emit('toggle-vendeur')"
>
  👨‍💼 ESPACE VENDEUR
</button>
      
      <div class="panier-wrapper">
        <button class="panier-encart" @click="$emit('open-panier')">
          🛒 PANIER
        </button>
        <span class="badge-notification" v-if="panierLength >= 0">{{ panierLength }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

.en-tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.identite-visuelle {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  max-width: 600px;
}

.logo-container {
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

.titre-container h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #3b302a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.titre-container .sous-titre {
  font-family: 'Inter', sans-serif;
  color: #2c2520;
  margin-top: 6px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.actions-entete {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

/* Nouveaux styles pour l'authentification */
.greeting {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: #3b302a;
}

.bouton-auth {
  font-family: 'Inter', sans-serif;
  padding: 10px 20px;
  border-radius: 9999px;
  background: #f4f6f8;
  color: #3b302a;
  font-weight: 600;
  font-size: 0.85rem;
  border: 1px solid #d1d9e0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bouton-auth:hover { background: #e1e8ed; }

.action-principale {
  background: #3b302a;
  color: white;
  border: none;
}
.action-principale:hover { background: #2c2520; }

/* Styles originaux restaurés */
.bouton-vendeur {
  font-family: 'Inter', sans-serif;
  padding: 12px 24px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #bc6c46, #d98f6a);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  box-shadow: 0 8px 24px rgba(188, 108, 70, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bouton-vendeur:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(188, 108, 70, 0.4);
}

.panier-wrapper { position: relative; }

.panier-encart {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #74b4aa, #8bc9bf);
  color: white;
  padding: 12px 24px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  box-shadow: 0 8px 24px rgba(116, 180, 170, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.panier-encart:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(116, 180, 170, 0.4);
}

.badge-notification {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #1a5653;
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #f6f3ef;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

@media (max-width: 640px) {
  .en-tete { flex-direction: column; gap: 20px; }
  .identite-visuelle { flex-direction: column; gap: 12px; }
  .titre-container h1 { font-size: 1.8rem; }
  .actions-entete { width: 100%; justify-content: flex-start; }
}
</style>