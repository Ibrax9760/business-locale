<script setup>
import { ref, computed } from 'vue'
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabaseClient' // Import du connecteur backend

const props = defineProps({
  panier: Array,
  panierOuvert: Boolean,
  utilisateur: Object // Ajout nécessaire pour identifier le client en base
})

const emit = defineEmits(['close-panier', 'update-panier', 'commander-whatsapp'])

const modeLivraison = ref('retrait')
// Deux variables distinctes pour mémoriser les choix selon le mode
const lieuRetrait = ref('labattoir') 
const lieuLivraison = ref('domicile_pt') 

const nomClient = ref('')
const dateCommande = ref('')

// Nouveau moteur de calcul des frais
const fraisLogistique = computed(() => {
  if (modeLivraison.value === 'livraison') {
    return lieuLivraison.value === 'mamoudzou' ? 3 : 2
  }
  return 0 // Le retrait est toujours gratuit, peu importe le lieu
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

// Générateur du ticket de caisse WhatsApp mis à jour
// Fonction devenue asynchrone pour gérer l'interaction serveur
const commanderSurWhatsApp = async () => {
  if (!nomClient.value || !dateCommande.value) {
    alert("Merci d'indiquer votre nom et la date souhaitée.")
    return
  }

  // 1. Préparation de la chaîne de caractères pour WhatsApp
  let message = `*NOUVELLE COMMANDE*\n`
  message += `Client : ${nomClient.value}\n`
  message += `Date : ${dateCommande.value}\n`
  
  let modeRecupTexte = ""
  if (modeLivraison.value === 'livraison') {
    modeRecupTexte = lieuLivraison.value === 'mamoudzou' 
      ? 'Livraison : Pied de la barge (Mamoudzou)' 
      : 'Livraison : À domicile (Petite-Terre)'
  } else {
    modeRecupTexte = lieuRetrait.value === 'labattoir' 
      ? 'Click & Collect : 16A Rue Du Stade, Labattoir' 
      : 'Click & Collect : Pied de la barge (Dzaoudzi)'
  }
  message += `Type : ${modeRecupTexte}\n`
  message += `--------------------------\n`
  
  props.panier.forEach(item => {
    message += `- ${item.quantite}x ${item.titre} - ${item.prix * item.quantite} €\n`
    if (item.typeElement === 'location') {
      message += `  📅 Du ${item.dateDebutSelectionnee} au ${item.dateFinSelectionnee}\n`
      message += `  ⏳ Durée : ${item.dureeJours} jour(s)\n`
    }
  })
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`

  // 2. Construction de l'objet de données (Payload) pour Supabase
  const chargeUtileCommande = {
    client_id: props.utilisateur ? props.utilisateur.id : null,
    nom_client: nomClient.value,
    details_panier: props.panier, // Sauvegarde en format JSONB natif
    mode_recuperation: modeRecupTexte,
    frais_logistique: fraisLogistique.value,
    total_general: totalGénéral.value,
    date_commande: dateCommande.value
  }

  try {
    // 3. Exécution de la requête d'insertion (POST) vers la base de données
    const { error } = await supabase
      .from('commandes')
      .insert([chargeUtileCommande])

    if (error) throw error

    // 4. Si l'enregistrement réussit, déclenchement de l'événement vers App.vue
    emit('commander-whatsapp', { message, nomClient: nomClient.value, dateCommande: dateCommande.value })

  } catch (erreur) {
    console.error("Erreur d'enregistrement de la commande :", erreur.message)
    alert("Une erreur de connexion a empêché l'enregistrement de la commande. Veuillez réessayer.")
  }
}
</script>

<template>
  <div v-if="panierOuvert" class="panier-overlay" @click.self="$emit('close-panier')">
    <div class="panier-tiroir">
      
      <div class="en-tete-tiroir">
        <h2>Votre Commande</h2>
        <button class="bouton-fermer" @click="$emit('close-panier')" aria-label="Fermer le panier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div v-if="panier.length === 0" class="panier-vide">
        <span class="emoji-vide">🛒</span>
        <p>Votre panier est actuellement vide.</p>
      </div>

      <div v-else class="contenu-panier">
        
        <div class="liste-articles">
          <div v-for="item in panier" :key="item.idUnique" class="article-item">
            <div class="infos-article">
              <h4 class="titre-item">{{ item.titre }}</h4>
              <div v-if="item.typeElement === 'location'" class="details-location">
                📅 Du {{ item.dateDebutSelectionnee }} au {{ item.dateFinSelectionnee }}<br>
                ⏳ Durée : {{ item.dureeJours }} jour(s)
              </div>
              <p class="prix-unitaire">{{ item.prix }} € / unité</p>
            </div>
            <div class="actions-quantite">
              <button @click="modifierQuantite(item.idUnique, -1)" class="btn-quantite">-</button>
              <span class="quantite-texte">{{ item.quantite }}</span>
              <button @click="modifierQuantite(item.idUnique, 1)" class="btn-quantite">+</button>
            </div>
          </div>
        </div>

        <!-- Options de Logistique Dynamiques -->
        <div class="section-formulaire">
          <h3>Mode de récupération</h3>
          
          <div class="grille-options">
            <label class="carte-option" :class="{ 'option-active': modeLivraison === 'retrait' }">
              <input type="radio" v-model="modeLivraison" value="retrait" class="radio-cache" />
              <span class="emoji-option">📦</span>
              <div class="texte-option">
                <strong>Click & Collect</strong>
                <span>Gratuit</span>
              </div>
            </label>
            
            <label class="carte-option" :class="{ 'option-active': modeLivraison === 'livraison' }">
              <input type="radio" v-model="modeLivraison" value="livraison" class="radio-cache" />
              <span class="emoji-option">🛵</span>
              <div class="texte-option">
                <strong>Livraison</strong>
                <span>À partir de 2 €</span>
              </div>
            </label>
          </div>

          <!-- Si le client choisit Click & Collect -->
          <div v-if="modeLivraison === 'retrait'" class="champ-supp">
            <label>Point de retrait (Gratuit) :</label>
            <select v-model="lieuRetrait" class="input-premium">
              <option value="labattoir">Pour Petite-Terre : 16A Rue Du Stade, Labattoir</option>
              <option value="dzaoudzi">Pour Grande-Terre : Pied de la barge (Dzaoudzi)</option>
            </select>
          </div>

          <!-- Si le client choisit Livraison -->
          <div v-if="modeLivraison === 'livraison'" class="champ-supp">
            <label>Zone de livraison :</label>
            <select v-model="lieuLivraison" class="input-premium">
              <option value="domicile_pt">Petite-Terre : À domicile (+2 €)</option>
              <option value="mamoudzou">Grande-Terre : Pied de la barge Mamoudzou (+3 €)</option>
            </select>
          </div>
        </div>

        <!-- Informations Client -->
        <div class="section-formulaire">
          <h3>Vos Informations</h3>
          <div class="groupe-input">
            <label>Nom complet</label>
            <input type="text" v-model="nomClient" placeholder="Ex: Ibrahim Ali" class="input-premium" />
          </div>
          <div class="groupe-input">
            <label>Date de récupération souhaitée :</label>
            <input type="date" v-model="dateCommande" class="input-premium" />
          </div>
        </div>

        <!-- Récapitulatif -->
        <div class="zone-validation">
          <div class="recapitulatif">
            <div class="ligne-recap">
              <span>Articles</span>
              <span>{{ totalArticles }} €</span>
            </div>
            <div class="ligne-recap">
              <span>Frais logistiques</span>
              <span>{{ fraisLogistique }} €</span>
            </div>
            <div class="ligne-recap total-final">
              <span>Total Général</span>
              <span>{{ totalGénéral }} €</span>
            </div>
          </div>

          <button class="bouton-whatsapp" @click="commanderSurWhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            Valider sur WhatsApp
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panier-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 25, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
}

.panier-tiroir {
  width: 100%;
  max-width: 420px;
  background: #fdfdfb;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 40px rgba(0,0,0,0.1);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
  background: #ffffff;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.en-tete-tiroir h2 {
  font-family: 'Playfair Display', serif;
  margin: 0;
  font-size: 1.5rem;
  color: #3b302a;
}

.bouton-fermer {
  background: #f4f6f8;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: #3b302a;
  display: grid;
  place-items: center;
  transition: background 0.2s;
}

.bouton-fermer:active {
  background: #e1e8ed;
}

.bouton-fermer svg {
  width: 18px;
  height: 18px;
}

.panier-vide {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7b8c;
  font-family: 'Inter', sans-serif;
}

.emoji-vide {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.contenu-panier {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  gap: 24px;
}

/* Design des articles */
.liste-articles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.titre-item {
  margin: 0 0 6px 0;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #1f2833;
}

.prix-unitaire {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #6b7b8c;
}

.details-location {
  font-size: 0.8rem;
  color: #2b4c40;
  background: rgba(43, 76, 64, 0.08);
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}

/* Contrôleurs de quantité */
.actions-quantite {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.05);
}

.btn-quantite {
  border: none;
  background: #ffffff;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #3b302a;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.btn-quantite:active {
  transform: scale(0.9);
}

.quantite-texte {
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  min-width: 20px;
  text-align: center;
}

/* Sections Formulaires */
.section-formulaire {
  background: #ffffff;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.section-formulaire h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  margin: 0 0 16px 0;
  color: #3b302a;
}

/* Cartes interactives pour la logistique */
.grille-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.carte-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.radio-cache {
  position: absolute;
  opacity: 0;
}

.emoji-option {
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.texte-option strong {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  color: #1f2833;
}

.texte-option span {
  font-size: 0.75rem;
  color: #6b7b8c;
  margin-top: 4px;
}

.carte-option.option-active {
  background: rgba(43, 76, 64, 0.05);
  border-color: #2b4c40;
}

/* Inputs Premium */
.groupe-input, .champ-supp {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.groupe-input label, .champ-supp label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
}

.input-premium {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  background: #f8fafc;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: #1f2833;
  transition: all 0.2s;
  appearance: none;
  -webkit-appearance: none;
}

.input-premium:focus {
  outline: none;
  border-color: #2b4c40;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(43, 76, 64, 0.1);
}

/* Zone Finale */
.zone-validation {
  margin-top: auto;
  padding-top: 10px;
}

.recapitulatif {
  background: #ffffff;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(0,0,0,0.04);
}

.ligne-recap {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #6b7b8c;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
}

.total-final {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e2e8f0;
  font-weight: 800;
  font-size: 1.2rem;
  color: #2b4c40;
  margin-bottom: 0;
}

.bouton-whatsapp {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #25D366;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bouton-whatsapp:active {
  transform: scale(0.98);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
}
</style>