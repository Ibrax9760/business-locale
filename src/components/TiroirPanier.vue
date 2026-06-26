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
    const nouveauPanier = [...props.panier]
    const nouvelleQuantite = nouveauPanier[index].quantite + changement
    
    if (nouvelleQuantite <= 0) {
      nouveauPanier.splice(index, 1)
    } else {
      nouveauPanier[index] = { ...nouveauPanier[index], quantite: nouvelleQuantite }
    }
    
    emit('update-panier', nouveauPanier)
    if (nouveauPanier.length === 0) emit('close-panier')
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
    // Utilisation de item.titre ou item.nom pour garantir la compatibilité
    message += `- ${item.quantite}x ${item.titre || item.nom} - ${item.prix * item.quantite} €\n`
    
    // Ajout spécifique si l'article est un équipement en location
    if (item.typeElement === 'location') {
      message += `  📅 Du ${item.dateDebutSelectionnee} au ${item.dateFinSelectionnee}\n`
      message += `  ⏳ Durée : ${item.dureeJours} jour(s)\n`
    }
  })
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`
  
  emit('commander-whatsapp', { message, nomClient: nomClient.value, dateCommande: dateCommande.value })
}
</script>

<template>
  <div v-if="panierOuvert" class="panier-overlay" @click.self="$emit('close-panier')">
    <div class="panier-tiroir">
      
      <div class="en-tete-tiroir">
        <h2>Votre Panier</h2>
        <button class="bouton-fermer" @click="$emit('close-panier')">✖</button>
      </div>

      <div v-if="panier.length === 0" class="panier-vide">
        <span class="emoji-vide">🛒</span>
        <p>Votre panier est actuellement vide.</p>
      </div>

      <div v-else class="contenu-panier">
        <div class="liste-articles">
          <div v-for="item in panier" :key="item.idUnique" class="article-item">
            <div class="infos-article">
              <h4>{{ item.titre || item.nom }}</h4>
              
              <div v-if="item.typeElement === 'location'" class="details-location">
                📅 Du {{ item.dateDebutSelectionnee }} au {{ item.dateFinSelectionnee }}<br>
                ⏳ Durée : {{ item.dureeJours }} jour(s)
              </div>
              
              <p class="prix-unitaire">{{ item.prix }} € / unité</p>
            </div>
            
            <div class="actions-quantite">
              <button @click="modifierQuantite(item.idUnique, -1)">-</button>
              <span class="quantite-texte">{{ item.quantite }}</span>
              <button @click="modifierQuantite(item.idUnique, 1)">+</button>
            </div>
          </div>
        </div>

        <div class="formulaire-logistique">
          <div class="groupe-champ">
            <label>Nom complet</label>
            <input type="text" v-model="nomClient" placeholder="Ex: Ibrahim Ali" />
          </div>
          
          <div class="groupe-champ">
            <label>Date souhaitée (Récupération)</label>
            <input type="date" v-model="dateCommande" />
          </div>

          <div class="groupe-champ">
            <label>Mode de réception</label>
            <select v-model="modeLivraison">
              <option value="retrait">Retrait au point de rendez-vous</option>
              <option value="livraison">Livraison (+2€)</option>
            </select>
          </div>

          <div v-if="modeLivraison === 'retrait'" class="groupe-champ">
            <label>Lieu de retrait</label>
            <select v-model="lieuRetrait">
              <option value="dzaoudzi">Dzaoudzi (Petite-Terre) - Gratuit</option>
              <option value="mamoudzou">Pied de la barge (Mamoudzou) - Navette +3€</option>
            </select>
          </div>
        </div>

        <div class="recapitulatif">
          <div class="ligne-recap">
            <span>Sous-total</span>
            <span>{{ totalArticles }} €</span>
          </div>
          <div class="ligne-recap">
            <span>Frais logistiques</span>
            <span>{{ fraisLogistique }} €</span>
          </div>
          <div class="ligne-recap total-final">
            <span>Total à payer</span>
            <span>{{ totalGénéral }} €</span>
          </div>
        </div>

        <button class="bouton-commander" @click="commanderSurWhatsApp">
          📱 Commander via WhatsApp
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panier-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 25, 0.65);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
}

.panier-tiroir {
  width: 100%;
  max-width: 450px;
  background: #ffffff;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0,0,0,0.1);
  animation: slideLeft 0.3s ease-out;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.en-tete-tiroir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.en-tete-tiroir h2 {
  font-family: 'Playfair Display', serif;
  margin: 0;
  color: #3b302a;
}

.bouton-fermer {
  background: #f4f6f8;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7b8c;
  display: grid;
  place-items: center;
}

.panier-vide {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7b8c;
}

.emoji-vide {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.contenu-panier {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.liste-articles {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #eff2f5;
}

.infos-article h4 {
  margin: 0 0 6px 0;
  font-family: 'Inter', sans-serif;
  color: #1f2833;
}

.details-location {
  font-size: 0.85em;
  color: #74b4aa;
  margin-bottom: 8px;
  font-weight: 600;
  background: #eef7f6;
  padding: 6px 10px;
  border-radius: 6px;
}

.prix-unitaire {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7b8c;
}

.actions-quantite {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid #d1d9e0;
}

.actions-quantite button {
  border: none;
  background: none;
  cursor: pointer;
  font-weight: bold;
  color: #3b302a;
}

.quantite-texte {
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.formulaire-logistique {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.groupe-champ {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.groupe-champ label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
}

.groupe-champ input, .groupe-champ select {
  padding: 12px;
  border: 1px solid #d1d9e0;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  background: #ffffff;
}

.recapitulatif {
  background: #f4f6f8;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.ligne-recap {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #4a5568;
  font-size: 0.95rem;
}

.total-final {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #e1e8ed;
  font-weight: 700;
  font-size: 1.2rem;
  color: #3b302a;
  margin-bottom: 0;
}

.bouton-commander {
  background: #3b302a;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 24px;
}

.bouton-commander:hover {
  background: #2c2520;
}
</style>