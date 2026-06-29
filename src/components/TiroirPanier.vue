<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabaseClient'

const props = defineProps({
  panier: Array,
  panierOuvert: Boolean,
  utilisateur: Object
})

const emit = defineEmits(['close-panier', 'update-panier', 'commander-whatsapp'])

const modeLivraison = ref('retrait')
const lieuRetrait = ref('labattoir') 
const lieuLivraison = ref('domicile_pt') 

const nomClient = ref('')
const dateCommande = ref('')

// --- GESTION PROMO ---
const codePromoInput = ref('')
const codeApplique = ref(null)

const fraisLogistique = computed(() => {
  if (modeLivraison.value === 'livraison') {
    return lieuLivraison.value === 'mamoudzou' ? 3 : 2
  }
  return 0 
})

const totalArticles = computed(() => {
  return props.panier.reduce((total, item) => total + (item.prix * item.quantite), 0)
})

const calculerReduction = computed(() => {
  if (!codeApplique.value) return 0
  if (codeApplique.value.type_reduction === 'pourcentage') {
    return totalArticles.value * (codeApplique.value.valeur / 100)
  }
  return codeApplique.value.valeur
})

const totalGénéral = computed(() => {
  return totalArticles.value - calculerReduction.value + fraisLogistique.value
})

const verifierCodePromo = async () => {
  const { data, error } = await supabase
    .from('codes_promotionnels')
    .select('*')
    .eq('code', codePromoInput.value.toUpperCase())
    .eq('est_actif', true)
    .single()
    
  if (error || !data) {
    alert("Code invalide ou expiré.")
    codeApplique.value = null
  } else {
    codeApplique.value = data
    alert(`Code appliqué ! -${data.valeur} ${data.type_reduction === 'pourcentage' ? '%' : '€'}`)
  }
}

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

const commanderSurWhatsApp = async () => {
  if (!nomClient.value || !dateCommande.value) {
    alert("Merci d'indiquer votre nom et la date souhaitée.")
    return
  }

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
      message += `  📅 Du ${item.dateDebut} au ${item.dateFin}\n`
      message += `  ⏳ Durée : ${item.duree} jour(s)\n`
    }
  })
  
  if (codeApplique.value) {
    message += `Code promo : ${codeApplique.value.code} (-${calculerReduction.value} €)\n`
  }
  
  message += `--------------------------\n`
  message += `Sous-total : ${totalArticles.value} €\n`
  message += `Frais logistique : ${fraisLogistique.value} €\n`
  message += `*TOTAL À PAYER : ${totalGénéral.value} €*`

  const chargeUtileCommande = {
    client_id: props.utilisateur ? props.utilisateur.id : null,
    nom_client: nomClient.value,
    details_panier: props.panier,
    mode_recuperation: modeRecupTexte,
    frais_logistique: fraisLogistique.value,
    total_general: totalGénéral.value,
    date_commande: dateCommande.value,
    statut: 'En attente'
  }

  try {
    const { error } = await supabase.from('commandes').insert([chargeUtileCommande])
    if (error) throw error
    emit('commander-whatsapp', { message, nomClient: nomClient.value, dateCommande: dateCommande.value })
  } catch (erreur) {
    console.error("Erreur d'enregistrement :", erreur.message)
    alert("Une erreur de connexion a empêché l'enregistrement.")
  }
}
</script>

<template>
  <transition name="slide-drawer">
    <div v-if="panierOuvert" class="panier-overlay" @click.self="$emit('close-panier')">
      <div class="panier-tiroir">
        
        <div class="en-tete-tiroir">
          <h2>Votre Panier</h2>
          <button class="bouton-fermer" @click="$emit('close-panier')" aria-label="Fermer le panier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="panier.length === 0" class="panier-vide">
          <span class="emoji-vide">🧺</span>
          <p>Votre panier est actuellement vide.</p>
        </div>

        <div v-else class="contenu-panier">
          
          <div class="liste-articles">
            <div v-for="item in panier" :key="item.idUnique" class="article-item">
              <div class="infos-article">
                <h4 class="titre-item">{{ item.titre }}</h4>
                
                <div v-if="item.typeElement === 'location'" class="details-location">
                  📅 Du {{ item.dateDebut }} au {{ item.dateFin }}<br>
                  ⏳ Durée : {{ item.duree }} jour(s)
                </div>
                
                <p class="prix-unitaire">{{ item.prix }} € / unité</p>
              </div>
              <div class="actions-quantite">
                <button @click="modifierQuantite(item.idUnique, -1)" class="btn-quantite" aria-label="Moins">-</button>
                <span class="quantite-texte">{{ item.quantite }}</span>
                <button @click="modifierQuantite(item.idUnique, 1)" class="btn-quantite" aria-label="Plus">+</button>
              </div>
            </div>
          </div>

          <div class="section-formulaire">
            <h3>Code Privilège</h3>
            <div style="display: flex; gap: 10px;">
              <input type="text" v-model="codePromoInput" placeholder="Saisir un code" class="input-premium uppercase-input" />
              <button @click="verifierCodePromo" class="bouton-sauvegarder">Appliquer</button>
            </div>
          </div>

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

            <div v-if="modeLivraison === 'retrait'" class="champ-supp animate-slide-down">
              <label>Point de retrait (Gratuit) :</label>
              <select v-model="lieuRetrait" class="input-premium">
                <option value="labattoir">Pour Petite-Terre : 16A Rue Du Stade, Labattoir</option>
                <option value="dzaoudzi">Pour Grande-Terre : Pied de la barge (Dzaoudzi)</option>
              </select>
            </div>

            <div v-if="modeLivraison === 'livraison'" class="champ-supp animate-slide-down">
              <label>Zone de livraison :</label>
              <select v-model="lieuLivraison" class="input-premium">
                <option value="domicile_pt">Petite-Terre : À domicile (+2 €)</option>
                <option value="mamoudzou">Grande-Terre : Pied de la barge Mamoudzou (+3 €)</option>
              </select>
            </div>
          </div>

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

          <div class="zone-validation">
            <div class="recapitulatif">
              <div class="ligne-recap">
                <span>Articles</span>
                <span class="valeur-recap">{{ totalArticles }} €</span>
              </div>
              <div class="ligne-recap" v-if="codeApplique">
                <span>Réduction ({{ codeApplique.code }})</span>
                <span style="color: #1e8e3e; font-weight: 700;">-{{ calculerReduction }} €</span>
              </div>
              <div class="ligne-recap">
                <span>Frais logistiques</span>
                <span class="valeur-recap">{{ fraisLogistique }} €</span>
              </div>
              <div class="ligne-recap total-final">
                <span>Total à régler</span>
                <span>{{ totalGénéral }} €</span>
              </div>
            </div>

            <button class="bouton-whatsapp" @click="commanderSurWhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              <span>Valider sur WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.panier-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(31, 27, 24, 0.4); 
  backdrop-filter: blur(12px); 
  -webkit-backdrop-filter: blur(12px); 
  z-index: 3000; 
  display: flex; 
  justify-content: flex-end; 
}

.panier-tiroir { 
  width: 100%; 
  max-width: 440px; 
  background: rgba(253, 252, 249, 0.98); 
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  box-shadow: -16px 0 50px rgba(31, 27, 24, 0.08); 
  border-left: 1px solid var(--border-subtile);
}

.en-tete-tiroir { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 28px 24px; 
  background: rgba(255, 255, 255, 0.8); 
  border-bottom: 1px solid var(--border-subtile); 
}

.en-tete-tiroir h2 { 
  font-family: 'Playfair Display', serif; 
  margin: 0; 
  font-size: 1.6rem; 
  font-weight: 700;
  color: var(--text-primary); 
}

.bouton-fermer { 
  background: var(--accent-gold-light); 
  border: 1px solid var(--border-subtile); 
  width: 38px; 
  height: 38px; 
  border-radius: 50%; 
  cursor: pointer; 
  color: var(--text-primary); 
  display: grid; 
  place-items: center; 
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.bouton-fermer:hover { 
  background: var(--accent-gold); 
  color: white;
  transform: scale(1.05);
}
.bouton-fermer svg { width: 16px; height: 16px; }

.panier-vide { 
  flex-grow: 1; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  color: var(--text-secondary); 
  padding: 40px;
}
.emoji-vide { font-size: 4rem; margin-bottom: 20px; opacity: 0.7; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.04)); }
.panier-vide p { font-size: 1rem; font-weight: 500; font-family: 'Inter', sans-serif; text-align: center; }

.contenu-panier { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
  overflow-y: auto; 
  padding: 24px; 
  gap: 28px; 
}

.liste-articles { display: flex; flex-direction: column; gap: 14px; }
.article-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 18px; 
  background: var(--bg-carte); 
  border-radius: 20px; 
  border: 1px solid var(--border-subtile); 
  box-shadow: var(--shadow-douce); 
}
.titre-item { 
  margin: 0 0 6px 0; 
  font-family: 'Inter', sans-serif; 
  font-size: 0.95rem; 
  font-weight: 700;
  color: var(--text-primary); 
}
.prix-unitaire { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.details-location { 
  font-size: 0.75rem; 
  color: var(--accent-green); 
  background: var(--accent-green-light); 
  padding: 6px 12px; 
  border-radius: 10px; 
  margin-bottom: 10px; 
  font-weight: 600; 
  display: inline-block;
  line-height: 1.4;
  border: 1px solid rgba(38, 70, 60, 0.1);
}

.actions-quantite { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  background: #fdfdfd; 
  padding: 4px; 
  border-radius: 12px; 
  border: 1px solid var(--border-subtile); 
}
.btn-quantite { 
  border: none; 
  background: var(--bg-carte); 
  width: 28px; 
  height: 28px; 
  border-radius: 8px; 
  cursor: pointer; 
  font-weight: 700; 
  color: var(--text-primary); 
  box-shadow: 0 2px 5px rgba(0,0,0,0.05); 
  border: 1px solid var(--border-subtile);
  transition: all 0.2s;
}
.btn-quantite:active { transform: scale(0.9); }
.quantite-texte { font-weight: 700; font-family: 'Inter', sans-serif; min-width: 22px; text-align: center; font-size: 0.9rem; }

.section-formulaire { 
  background: var(--bg-carte); 
  padding: 24px; 
  border-radius: 24px; 
  border: 1px solid var(--border-subtile); 
  box-shadow: var(--shadow-douce); 
}
.section-formulaire h3 { 
  font-family: 'Playfair Display', serif; 
  font-size: 1.15rem; 
  font-weight: 700;
  margin: 0 0 18px 0; 
  color: var(--text-primary); 
}

.grille-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.carte-option { 
  position: relative; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  padding: 18px 10px; 
  background: #fdfdfd; 
  border: 1px solid var(--border-subtile); 
  border-radius: 20px; 
  cursor: pointer; 
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
  text-align: center; 
}
.radio-cache { position: absolute; opacity: 0; }
.emoji-option { font-size: 2rem; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05)); }
.texte-option strong { display: block; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--text-primary); }
.texte-option span { font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; display: block; font-weight: 500; }
.carte-option.option-active { 
  background: var(--accent-gold-light); 
  border-color: var(--accent-gold); 
  box-shadow: 0 6px 16px rgba(197, 164, 126, 0.12);
}

.groupe-input, .champ-supp { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.groupe-input label, .champ-supp label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); }

.input-premium { 
  width: 100%; 
  padding: 14px 18px; 
  border: 1px solid var(--border-subtile); 
  border-radius: var(--radius-input); 
  background: #fdfdfd; 
  font-family: 'Inter', sans-serif; 
  font-size: 0.95rem; 
  color: var(--text-primary); 
  transition: all 0.3s; 
  appearance: none; 
  -webkit-appearance: none; 
  outline: none;
}
.input-premium:focus { 
  border-color: var(--border-focus); 
  background: #ffffff; 
  box-shadow: 0 0 0 4px rgba(197, 164, 126, 0.12); 
}
.uppercase-input { text-transform: uppercase; }

.bouton-sauvegarder { 
  background: var(--accent-green); 
  color: white; 
  border: none; 
  padding: 12px 20px; 
  border-radius: 12px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: all 0.3s ease; 
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.15);
  font-size: 0.9rem;
}
.bouton-sauvegarder:hover {
  background: #1e362e;
  transform: translateY(-1px);
}

.zone-validation { margin-top: auto; padding-top: 10px; }
.recapitulatif { 
  background: var(--bg-carte); 
  padding: 24px; 
  border-radius: 24px; 
  margin-bottom: 20px; 
  border: 1px solid var(--border-subtile); 
  box-shadow: var(--shadow-douce);
}
.ligne-recap { display: flex; justify-content: space-between; margin-bottom: 14px; color: var(--text-secondary); font-size: 0.95rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.valeur-recap { color: var(--text-primary); font-weight: 600; }
.total-final { 
  margin-top: 18px; 
  padding-top: 18px; 
  border-top: 1px dashed var(--border-subtile); 
  font-weight: 800; 
  font-size: 1.3rem; 
  color: var(--accent-green); 
  margin-bottom: 0; 
}

.bouton-whatsapp { 
  width: 100%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 12px; 
  background: #25D366; 
  color: white; 
  border: none; 
  padding: 18px; 
  border-radius: var(--radius-input); 
  font-weight: 700; 
  font-size: 1.05rem; 
  font-family: 'Inter', sans-serif; 
  cursor: pointer; 
  box-shadow: 0 10px 28px rgba(37, 211, 102, 0.3); 
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.bouton-whatsapp:hover {
  background: #20bc5a;
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(37, 211, 102, 0.4);
}
.bouton-whatsapp:active { 
  transform: scale(0.98); 
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.25); 
}

/* Animations CSS */
.animate-slide-down {
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- TRANSITIONS --- */
.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-drawer-enter-active .panier-tiroir,
.slide-drawer-leave-active .panier-tiroir {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-drawer-enter-from,
.slide-drawer-leave-to {
  opacity: 0;
}

.slide-drawer-enter-from .panier-tiroir,
.slide-drawer-leave-to .panier-tiroir {
  transform: translateX(100%);
}
</style>