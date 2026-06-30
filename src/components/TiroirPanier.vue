<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabaseClient'
import { t, currentLang } from '../utils/i18n'

const props = defineProps({
  panier: Array,
  panierOuvert: Boolean,
  utilisateur: Object
})

const emit = defineEmits(['close-panier', 'update-panier', 'commander-whatsapp'])

const codePromo = ref('')
const reductionAppliquee = ref(0)
const codePromoErreur = ref('')
const codePromoSucces = ref(false)

const modeRecup = ref('Retrait')
const zoneLivraison = ref('Petite-Terre')

const nomClient = ref('')
const dateSouhaitee = ref('')

const formaterDate = (d) => new Date(d).toLocaleDateString('fr-FR')

const totalArticles = computed(() => {
  return props.panier.reduce((sum, item) => sum + (item.prix * item.quantite), 0)
})

const fraisLogistiques = computed(() => {
  if (modeRecup.value === 'Retrait') return 0
  return zoneLivraison.value === 'Petite-Terre' ? 2 : 3
})

const totalGeneral = computed(() => {
  const reduction = totalArticles.value * (reductionAppliquee.value / 100)
  return Math.max(0, totalArticles.value - reduction + fraisLogistiques.value)
})

const modifierQuantite = (item, delta) => {
  const index = props.panier.findIndex(x => x.idUnique === item.idUnique)
  if (index !== -1) {
    const pCopy = [...props.panier]
    pCopy[index].quantite += delta
    if (pCopy[index].quantite <= 0) {
      pCopy.splice(index, 1)
    }
    emit('update-panier', pCopy)
  }
}

const verifierCodePromo = async () => {
  codePromoErreur.value = ''
  codePromoSucces.value = false
  reductionAppliquee.value = 0

  const { data, error } = await supabase
    .from('codes_promotionnels')
    .select('*')
    .eq('code', codePromo.value.trim().toUpperCase())
    .single()

  if (error || !data) {
    codePromoErreur.value = 'Code invalide ou expiré'
  } else {
    reductionAppliquee.value = data.valeur
    codePromoSucces.value = true
  }
}

const soumettreCommande = async () => {
  if (!nomClient.value || !dateSouhaitee.value) {
    alert("Veuillez renseigner votre nom et la date souhaitée.")
    return
  }

  // 1. Sauvegarde en base de données via Supabase
  const payloadDb = {
    client_id: props.utilisateur ? props.utilisateur.id : null,
    nom_client: nomClient.value,
    details_panier: props.panier.map(item => ({
      titre: item.titre,
      quantite: item.quantite,
      prix: item.prix,
      dateDebut: item.dateDebut,
      dateFin: item.dateFin
    })),
    mode_recuperation: modeRecup.value === 'Retrait' ? 'Retrait' : `Livraison (${zoneLivraison.value})`,
    frais_logistique: fraisLogistiques.value,
    total_general: totalGeneral.value,
    date_commande: dateSouhaitee.value,
    statut: 'En attente'
  }

  const { data, error } = await supabase
    .from('commandes')
    .insert([payloadDb])
    .select()

  if (error) {
    console.error("Erreur de sauvegarde de la commande :", error.message)
    alert("Erreur lors de la validation de la commande.")
    return
  }

  // 2. Génération du message WhatsApp (Mise en page Premium & Emojis)
  let msg = `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✨ *${t('brand_title')}* ✨\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `👤 *${t('your_info').toUpperCase()}*\n`;
  msg += `▫️ *${t('fullname')} :* ${nomClient.value}\n`;

  const recupLabel = modeRecup.value === 'Retrait' 
    ? (currentLang.value === 'fr' ? 'Retrait sur place (Gratuit)' : 'Utswala mpahalani (Bure)')
    : (currentLang.value === 'fr' ? `Livraison - ${zoneLivraison.value}` : `Upelekwa - ${zoneLivraison.value}`);
    
  msg += `▫️ *${t('recovery_mode')} :* ${recupLabel}\n`;
  msg += `▫️ *${t('pickup_date')}* ${dateSouhaitee.value ? formaterDate(dateSouhaitee.value) : '---'}\n\n`;

  msg += `🛒 *${t('articles').toUpperCase()}*\n`;
  props.panier.forEach(item => {
    msg += `• ${item.quantite}x ${item.titre} — ${(item.prix * item.quantite).toFixed(2)} €\n`;
    if (item.dateDebut) {
      msg += `  ↳ 📅 ${formaterDate(item.dateDebut)} ➔ ${formaterDate(item.dateFin)} (${item.duree} ${t('days')})\n`;
    }
  });
  msg += `\n`;

  msg += `💰 *RÉCAPITULATIF*\n`;
  msg += `▫️ ${t('articles')} : ${totalArticles.value.toFixed(2)} €\n`;
  if (reductionAppliquee.value > 0) {
    msg += `▫️ ${t('reduction')} : -${reductionAppliquee.value}%\n`;
  }
  msg += `▫️ ${t('logistic_fees')} : ${fraisLogistiques.value > 0 ? fraisLogistiques.value.toFixed(2) + ' €' : t('free')}\n`;
  msg += `▶️ *${t('total_to_pay').toUpperCase()} : ${totalGeneral.value.toFixed(2)} €*\n\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💬 *${currentLang.value === 'fr' ? 'Merci pour votre confiance !' : 'Marahaba wadjiri !'}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━`;

  emit('commander-whatsapp', { message: msg })
}
</script>

<template>
  <div class="tiroir-panier-wrapper">
    <transition name="fade-overlay">
      <div v-if="panierOuvert" class="calque-panier" @click="emit('close-panier')"></div>
    </transition>

    <transition name="slide-drawer">
      <div v-if="panierOuvert" class="contenu-tiroir">
        <div class="en-tete-panier">
          <h2>{{ t('your_cart') }}</h2>
          <button @click="emit('close-panier')" class="bouton-fermer-tiroir" aria-label="Fermer">✖</button>
        </div>

        <div v-if="props.panier.length === 0" class="panier-vide">
          <span class="icone-panier-vide">🧺</span>
          <p>{{ t('cart_empty') }}</p>
        </div>

        <div v-else class="panier-rempli-scroll">
          <ul class="liste-panier">
            <li v-for="item in props.panier" :key="item.idUnique" class="item-panier">
              <div class="details-item">
                <span class="titre-item">{{ item.titre }}</span>
                <span v-if="item.dateDebut" class="dates-item">
                  📅 {{ formaterDate(item.dateDebut) }} ➔ {{ formaterDate(item.dateFin) }}
                </span>
                <span class="prix-item">{{ item.prix }} € x {{ item.quantite }}</span>
              </div>
              <div class="actions-item">
                <button @click="modifierQuantite(item, -1)" class="btn-quantite">−</button>
                <span class="quantite-valeur">{{ item.quantite }}</span>
                <button @click="modifierQuantite(item, 1)" class="btn-quantite">+</button>
              </div>
            </li>
          </ul>

          <!-- SECTION CODE PROMO -->
          <div class="section-promo-premium">
            <label class="label-champ-premium">{{ t('promo_code') }}</label>
            <div class="barre-promo">
              <input 
                type="text" 
                v-model="codePromo" 
                :placeholder="t('enter_code')" 
                class="input-promo" 
              />
              <button @click="verifierCodePromo" class="bouton-promo">{{ t('apply') }}</button>
            </div>
            <p v-if="codePromoErreur" class="promo-erreur">{{ codePromoErreur }}</p>
            <p v-if="codePromoSucces" class="promo-succes">🎉 Code appliqué : -{{ reductionAppliquee }}%</p>
          </div>

          <!-- MODE RÉCUPÉRATION -->
          <div class="section-mode-recup">
            <label class="label-champ-premium">{{ t('recovery_mode') }}</label>
            <div class="selecteur-mode-recup">
              <button 
                :class="{ actif: modeRecup === 'Retrait' }" 
                @click="modeRecup = 'Retrait'"
                class="btn-mode-option"
              >
                📥 Retrait ({{ t('free') }})
              </button>
              <button 
                :class="{ actif: modeRecup === 'Livraison' }" 
                @click="modeRecup = 'Livraison'"
                class="btn-mode-option"
              >
                🚚 Livraison ({{ t('from_price') }})
              </button>
            </div>

            <!-- OPTIONS RETRAIT -->
            <div v-if="modeRecup === 'Retrait'" class="details-retrait-livraison info-retrait">
              <span class="titre-bloc-mode">{{ t('pickup_point') }}</span>
              <p>📍 {{ t('pickup_pt') }}</p>
              <p>📍 {{ t('pickup_gt') }}</p>
            </div>

            <!-- OPTIONS LIVRAISON -->
            <div v-if="modeRecup === 'Livraison'" class="details-retrait-livraison info-livraison">
              <span class="titre-bloc-mode">{{ t('delivery_zone') }}</span>
              <div class="selecteur-zone-livraison">
                <button 
                  :class="{ actif: zoneLivraison === 'Petite-Terre' }" 
                  @click="zoneLivraison = 'Petite-Terre'"
                  class="btn-zone-option"
                >
                  {{ t('delivery_pt') }}
                </button>
                <button 
                  :class="{ actif: zoneLivraison === 'Grande-Terre' }" 
                  @click="zoneLivraison = 'Grande-Terre'"
                  class="btn-zone-option"
                >
                  {{ t('delivery_gt') }}
                </button>
              </div>
            </div>
          </div>

          <!-- FORMULAIRE INFORMATIONS CLIENT -->
          <div class="section-infos-client">
            <label class="label-champ-premium">{{ t('your_info') }}</label>
            <div class="formulaire-client">
              <div class="groupe-saisie">
                <label>{{ t('fullname') }}</label>
                <input type="text" v-model="nomClient" placeholder="Ex: Ibrahima" required />
              </div>
              <div class="groupe-saisie">
                <label>{{ t('pickup_date') }}</label>
                <input type="date" v-model="dateSouhaitee" required />
              </div>
            </div>
          </div>

          <!-- RÉCAPITULATIF FINANCIER -->
          <div class="recapitulatif-financier">
            <div class="ligne-financiere">
              <span>{{ t('articles') }}</span>
              <span>{{ totalArticles.toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere" v-if="reductionAppliquee > 0">
              <span>{{ t('reduction') }} (-{{ reductionAppliquee }}%)</span>
              <span class="valeur-reduction">-{{ (totalArticles * (reductionAppliquee / 100)).toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere">
              <span>{{ t('logistic_fees') }}</span>
              <span>{{ fraisLogistiques }} €</span>
            </div>
            <div class="ligne-financiere total-a-payer">
              <span>{{ t('total_to_pay') }}</span>
              <span class="valeur-total">{{ totalGeneral.toFixed(2) }} €</span>
            </div>

            <button @click="soumettreCommande" class="bouton-commander-whatsapp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icone-whatsapp">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              {{ t('validate_whatsapp') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Conteneur principal */
.tiroir-panier-wrapper {
  position: relative;
  z-index: 1500;
}

/* Calque sombre d'arrière-plan */
.calque-panier {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 25, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1501;
}

/* Tiroir (Drawer) de luxe */
.contenu-tiroir {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background-color: rgba(253, 252, 249, 0.96); /* Frosted linen écru */
  border-left: 1px solid var(--border-subtile);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 1502;
  overflow: hidden;
}

.en-tete-panier {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 30px;
  border-bottom: 1px solid var(--border-subtile);
}
.en-tete-panier h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.bouton-fermer-tiroir {
  background: var(--accent-gold-light);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-primary);
  display: grid;
  place-items: center;
  transition: all 0.2s;
  font-size: 0.9rem;
}
.bouton-fermer-tiroir:hover {
  background: var(--accent-gold);
  color: white;
  transform: scale(1.05);
}

/* Scrollable Container */
.panier-rempli-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 30px 40px 30px;
  scrollbar-width: thin;
}

/* Liste des articles */
.liste-panier {
  list-style: none;
  padding: 0;
  margin: 0;
}
.item-panier {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-subtile);
}

.details-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.titre-item {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.dates-item {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-gold-dark);
}
.prix-item {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.actions-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--accent-gold-light);
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
}
.btn-quantite {
  background: transparent;
  border: none;
  width: 20px;
  height: 20px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}
.btn-quantite:hover {
  opacity: 0.7;
}
.quantite-valeur {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Sections de formulaire et d'options */
.section-promo-premium, .section-mode-recup, .section-infos-client {
  margin-top: 28px;
  border-bottom: 1px solid var(--border-subtile);
  padding-bottom: 24px;
}

.label-champ-premium {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

/* Promo Code */
.barre-promo {
  display: flex;
  gap: 10px;
}
.input-promo {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
}
.input-promo:focus {
  border-color: var(--accent-gold);
}
.bouton-promo {
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  background: var(--text-primary);
  color: var(--bg-carte);
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.bouton-promo:hover {
  opacity: 0.9;
}
.promo-erreur { color: #c53030; font-size: 0.8rem; font-weight: 600; margin: 8px 0 0 0; }
.promo-succes { color: #1e8e3e; font-size: 0.8rem; font-weight: 700; margin: 8px 0 0 0; }

/* Mode de récupération */
.selecteur-mode-recup {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.btn-mode-option {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-mode-option:hover {
  border-color: var(--accent-gold);
}
.btn-mode-option.actif {
  background: var(--accent-gold-light);
  border-color: var(--accent-gold-dark);
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(197, 164, 126, 0.1);
}

.details-retrait-livraison {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 16px;
  padding: 16px;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
.titre-bloc-mode {
  display: block;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.details-retrait-livraison p {
  margin: 4px 0;
}

.selecteur-zone-livraison {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.btn-zone-option {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.btn-zone-option.actif {
  background: var(--accent-green-light);
  border-color: var(--accent-green);
  color: var(--accent-green);
}

/* Infos Client */
.formulaire-client {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.groupe-saisie {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.groupe-saisie label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}
.groupe-saisie input {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
}
.groupe-saisie input:focus {
  border-color: var(--accent-gold);
}

/* Récapitulatif financier */
.recapitulatif-financier {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ligne-financiere {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.valeur-reduction {
  color: #c53030;
}
.total-a-payer {
  border-top: 1px solid var(--border-subtile);
  padding-top: 16px;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
}
.valeur-total {
  color: var(--accent-green);
}

.bouton-commander-whatsapp {
  width: 100%;
  padding: 16px;
  background-color: var(--accent-green);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 24px rgba(38, 70, 60, 0.2);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 14px;
}
.bouton-commander-whatsapp:hover {
  background-color: #1e362e;
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(38, 70, 60, 0.3);
}
.bouton-commander-whatsapp:active {
  transform: translateY(0);
}
.icone-whatsapp {
  width: 20px;
  height: 20px;
}

/* Panier vide */
.panier-vide {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  padding: 40px;
}
.icone-panier-vide {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.3;
}

/* --- TRANSITIONS --- */
/* Overlay Fade */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

/* Drawer Slide */
.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-drawer-enter-from,
.slide-drawer-leave-to {
  transform: translateX(100%);
}
</style>