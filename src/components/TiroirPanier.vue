<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  panier: Array,
  panierOuvert: Boolean
})

const emit = defineEmits(['close-panier', 'update-panier', 'commander-whatsapp'])

const modeLivraison = ref('retrait')
const lieuRetrait = ref('dzaoudzi')
const nomClient = ref('')
const dateCommande = ref('')

const fraisLogistique = computed(() => {
  if (modeLivraison.value === 'livraison') {
    return 2
  } else if (modeLivraison.value === 'retrait' && lieuRetrait.value === 'mamoudzou') {
    return 3
  }
  return 0
})

const totalArticles = computed(() => {
  return props.panier.reduce((total, item) => total + (item.prix * item.quantite), 0)
})

const totalGénéral = computed(() => {
  return totalArticles.value + fraisLogistique.value
})

const modifierQuantite = (idUnique, changement) => {
  const index = props.panier.findIndex(item => item.idUnique === idUnique)
  if (index !== -1) {
    props.panier[index].quantite += changement
    if (props.panier[index].quantite <= 0) props.panier.splice(index, 1)
    emit('update-panier', props.panier)
    if (props.panier.length === 0) emit('close-panier')
  }
}

const commanderSurWhatsApp = () => {
  if (!nomClient.value || !dateCommande.value) {
    alert("Merci d'indiquer votre nom et la date souhaitée.")
    return
  }

  let message = `*NOUVELLE COMMANDE*\n`
  message += `Client : ${nomClient.value}\n`
  message += `Date : ${dateCommande.value}\n`
  
  if (modeLivraison.value === 'livraison') {
    message += `Type : Livraison (Petite-Terre)\n`
  } else {
    const lieu = lieuRetrait.value === 'dzaoudzi' ? 'Dzaoudzi (Petite-Terre)' : 'Pied de la barge (Mamoudzou)'
    message += `Type : Récupération à ${lieu}\n`
  }
  
  message += `--------------------------\n`
  
  props.panier.forEach(item => {
    message += `- ${item.quantite}x ${item.titre} - ${item.prix * item.quantite} €\n`
  })
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`
  
  emit('commander-whatsapp', { message, nomClient: nomClient.value, dateCommande: dateCommande.value })
}
</script>

<template>
  <div v-if="panierOuvert" class="fond-sombre" @click.self="$emit('close-panier')">
    <div class="tiroir-panier">
      <div class="entete-tiroir">
        <h2>Votre Commande</h2>
        <button @click="$emit('close-panier')" class="bouton-fermer">✖</button>
      </div>

      <div v-if="panier.length === 0" class="panier-vide">Votre panier est vide.</div>

      <div v-else class="contenu-panier">
        <ul class="liste-panier">
          <li v-for="item in panier" :key="item.idUnique" class="item-panier">
            <div class="info-item">
              <span class="titre-item">{{ item.titre }}</span>
              <span class="prix-item">{{ item.prix }} € / unité</span>
            </div>
            <div class="controle-quantite">
              <button @click="modifierQuantite(item.idUnique, -1)">-</button>
              <span>{{ item.quantite }}</span>
              <button @click="modifierQuantite(item.idUnique, 1)">+</button>
            </div>
          </li>
        </ul>

        <div class="zone-livraison">
          <h3>Mode de récupération</h3>
          
          <div class="options-radio">
            <label>
              <input type="radio" v-model="modeLivraison" value="retrait" />
              Click & Collect (Retrait)
            </label>
            <label>
              <input type="radio" v-model="modeLivraison" value="livraison" />
              Livraison locale (+2 €)
            </label>
          </div>

          <div v-if="modeLivraison === 'retrait'" class="sous-options">
            <label>Lieu du retrait :</label>
            <select v-model="lieuRetrait">
              <option value="dzaoudzi">Dzaoudzi (Petite-Terre) - Gratuit</option>
              <option value="mamoudzou">Mamoudzou (Au pied de la barge) - +3 €</option>
            </select>
          </div>

          <div v-if="modeLivraison === 'livraison'" class="info-livraison">
            📍 Livraison uniquement en Petite-Terre.
          </div>
        </div>

        <div class="formulaire-client">
          <h3>Vos Informations</h3>
          <input type="text" v-model="nomClient" placeholder="Votre nom complet" />
          <label>Date souhaitée :</label>
          <input type="date" v-model="dateCommande" />
        </div>

        <div class="pied-tiroir">
          <div class="details-calcul">
            <p>Articles : {{ totalArticles }} €</p>
            <p>Logistique : {{ fraisLogistique }} €</p>
            <p class="total">Total : <strong>{{ totalGénéral }} €</strong></p>
          </div>
          <button @click="commanderSurWhatsApp" class="bouton-whatsapp">Commander via WhatsApp</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fond-sombre {
  position: fixed;
  inset: 0;
  background-color: rgba(18, 20, 26, 0.55);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  padding: 20px 0 20px 20px;
}

.tiroir-panier {
  width: min(420px, 100%);
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}

.entete-tiroir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.entete-tiroir h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #1f2833;
}

.bouton-fermer {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2c3e50;
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  border: none;
  transition: transform 0.18s ease;
}

.bouton-fermer:hover {
  transform: translateY(-2px);
}

.panier-vide {
  text-align: center;
  color: #6b7b8c;
  padding: 40px 20px;
}

.contenu-panier {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  gap: 18px;
}

.liste-panier {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.item-panier {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: rgba(240, 138, 93, 0.06);
  border-radius: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.titre-item {
  font-weight: 700;
  color: #1f2833;
}

.prix-item {
  color: #6b7b8c;
  font-size: 0.95rem;
}

.controle-quantite {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.controle-quantite button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: white;
  color: #1f2833;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.controle-quantite button:hover {
  transform: translateY(-1px);
}

.zone-livraison {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.zone-livraison h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #1f2833;
}

.options-radio {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.options-radio label {
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2833;
}

.sous-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(31, 40, 51, 0.08);
}

.sous-options label {
  display: block;
  color: #6b7b8c;
  font-size: 0.9rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.sous-options select {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: white;
  color: #1f2833;
  font-size: 1rem;
}

.info-livraison {
  font-size: 0.9rem;
  color: #2b6cb0;
  font-style: italic;
  margin-top: 10px;
}

.formulaire-client {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
}

.formulaire-client h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #1f2833;
}

.formulaire-client input {
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 10px;
  border-radius: 16px;
  border: 1px solid rgba(31, 40, 51, 0.12);
  background: white;
  color: #1f2833;
  font-size: 1rem;
  box-sizing: border-box;
}

.formulaire-client label {
  display: block;
  color: #6b7b8c;
  font-size: 0.9rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.pied-tiroir {
  margin-top: auto;
}

.details-calcul {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(31, 40, 51, 0.08);
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.details-calcul p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  color: #6b7b8c;
}

.details-calcul .total {
  font-size: 1.15rem;
  color: #1f2833;
  font-weight: 700;
}

.bouton-whatsapp {
  width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #25D366, #1ebd58);
  color: white;
  font-weight: 700;
  border-radius: 18px;
  border: none;
  cursor: pointer;
  box-shadow: 0 20px 45px rgba(37, 211, 102, 0.2);
  transition: transform 0.18s ease, opacity 0.18s ease;
  animation: pulseGlow 5s ease-in-out infinite;
}

.bouton-whatsapp:hover {
  transform: translateY(-1px);
  opacity: 0.98;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 20px 45px rgba(37, 211, 102, 0.2); }
  50% { box-shadow: 0 28px 55px rgba(37, 211, 102, 0.28); }
}

@media (max-width: 640px) {
  .fond-sombre {
    padding: 14px 0 0 0;
    justify-content: center;
    align-items: flex-end;
  }

  .tiroir-panier {
    width: 100%;
    border-top-left-radius: 28px;
    border-top-right-radius: 28px;
    padding: 20px;
  }

  .entete-tiroir {
    flex-direction: column;
    align-items: flex-start;
  }

  .bouton-fermer {
    border-radius: 16px;
  }
}
</style>
