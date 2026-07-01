<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '../utils/supabaseClient'
import { t, currentLang } from '../utils/i18n'
import { useUIStore } from '../stores/ui'

const props = defineProps({
  panier: Array,
  panierOuvert: Boolean,
  utilisateur: Object,
  profilClient: Object
})

const emit = defineEmits(['close-panier', 'update-panier', 'commander-whatsapp'])
const uiStore = useUIStore()

const codePromo = ref('')
const reductionAppliquee = ref(0)
const codePromoErreur = ref('')
const codePromoSucces = ref(false)

const modeRecup = ref('Retrait')
const zoneLivraison = ref('Petite-Terre')

const nomClient = ref('')
const dateSouhaitee = ref('')

// Champs Smart Checkout (Standard vs Événement)
const prenomClient = ref('')
const telephoneClient = ref('')
const emailClient = ref('')
const creneauRetrait = ref('11:30 - 12:30')

const dateEvenement = ref('')
const adresseEvenement = ref('')
const nbInvites = ref(10)
const detailsLogistiques = ref('')

// Addons & Referral refs
const garantieCasseActive = ref(false)
const serviceMontageActif = ref(false)
const serviceServeursActif = ref(false)
const nbServeurs = ref(1)
const dureeServeurs = ref(4)
const nomParrain = ref('')

const dateMin = computed(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
});

watch(() => props.profilClient, (profil) => {
  if (profil) {
    if (profil.nom && !nomClient.value) nomClient.value = profil.nom;
    if (profil.prenom && !prenomClient.value) prenomClient.value = profil.prenom || '';
    if (profil.telephone && !telephoneClient.value) telephoneClient.value = profil.telephone || '';
    if (profil.email && !emailClient.value) emailClient.value = profil.email || '';
  }
}, { immediate: true });

const formaterDate = (d) => new Date(d).toLocaleDateString('fr-FR')

const totalArticles = computed(() => {
  return props.panier.reduce((sum, item) => sum + (item.prix * item.quantite), 0)
})

const panierContientLocation = computed(() => {
  return props.panier.some(item => item.typeElement === 'location')
})

const cautionTotale = computed(() => {
  return props.panier
    .filter(item => item.typeElement === 'location')
    .reduce((sum, item) => sum + ((item.montant_caution || 50) * item.quantite), 0)
})

const coutGarantieCasse = computed(() => {
  if (!garantieCasseActive.value) return 0
  const totalLocation = props.panier
    .filter(item => item.typeElement === 'location')
    .reduce((sum, item) => sum + (item.prix * item.quantite), 0)
  return totalLocation * 0.05
})

const coutMontage = computed(() => {
  return serviceMontageActif.value ? 50 : 0
})

const coutServeurs = computed(() => {
  return serviceServeursActif.value ? nbServeurs.value * dureeServeurs.value * 25 : 0
})

const fraisLogistiques = computed(() => {
  let base = 0
  if (modeRecup.value !== 'Retrait') {
    base = zoneLivraison.value === 'Petite-Terre' ? 2 : 3
  }
  return base + coutMontage.value + coutServeurs.value
})

const totalGeneral = computed(() => {
  const reduction = totalArticles.value * (reductionAppliquee.value / 100)
  return Math.max(0, totalArticles.value - reduction + fraisLogistiques.value + coutGarantieCasse.value)
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

const viderPanier = () => {
  if (confirm("Voulez-vous vraiment vider votre panier ?")) {
    emit('update-panier', [])
  }
}

const verifierCodePromo = async () => {
  codePromoErreur.value = ''
  codePromoSucces.value = false
  reductionAppliquee.value = 0
  nomParrain.value = ''

  const codeSaisi = codePromo.value.trim().toUpperCase()
  
  // Vérification dynamique du code de parrainage (ex: IBRA-5, MAEL-10)
  const regexParrainage = /^([A-Z0-9]+)-(5|10|15)$/
  const match = codeSaisi.match(regexParrainage)
  
  if (match) {
    nomParrain.value = match[1]
    reductionAppliquee.value = parseInt(match[2])
    codePromoSucces.value = true
    return
  }

  // Fallback sur la base de données
  const { data, error } = await supabase
    .from('codes_promotionnels')
    .select('*')
    .eq('code', codeSaisi)
    .single()

  if (error || !data) {
    codePromoErreur.value = 'Code invalide ou expiré'
  } else {
    reductionAppliquee.value = data.valeur
    codePromoSucces.value = true
  }
}

const soumettreCommande = async () => {
  // Validation conditionnelle intelligente
  if (uiStore.estModeStandard) {
    if (!nomClient.value || !prenomClient.value || !telephoneClient.value || !emailClient.value || !dateSouhaitee.value || !creneauRetrait.value) {
      alert("Veuillez renseigner tous les champs obligatoires (Nom, Prénom, Téléphone, E-mail, Date et Créneau de retrait).")
      return
    }
  } else {
    if (!nomClient.value || !telephoneClient.value || !emailClient.value || !dateEvenement.value || !adresseEvenement.value || !nbInvites.value) {
      alert("Veuillez renseigner tous les champs obligatoires (Nom de famille, Téléphone, E-mail, Date de l'événement, Adresse et Nombre d'invités).")
      return
    }
  }

  const dateFinale = uiStore.estModeStandard ? dateSouhaitee.value : dateEvenement.value;

  // 1. Sauvegarde en base de données via Supabase
  const payloadDb = {
    client_id: props.utilisateur ? props.utilisateur.id : null,
    nom_client: uiStore.estModeStandard ? `${nomClient.value} ${prenomClient.value}` : nomClient.value,
    details_panier: [
      ...props.panier.map(item => ({
        idBase: item.idBase,
        typeElement: item.typeElement,
        titre: item.titre,
        quantite: item.quantite,
        prix: item.prix,
        dateDebut: item.dateDebut || dateFinale,
        dateFin: item.dateFin || dateFinale
      })),
      {
        typeElement: 'metadata',
        parrain: nomParrain.value || null,
        garantieCasse: garantieCasseActive.value,
        serviceMontage: serviceMontageActif.value,
        serviceServeurs: serviceServeursActif.value ? `${nbServeurs.value} serveurs x ${dureeServeurs.value}h` : null,
        cautionCalculee: cautionTotale.value,
        modeActuel: uiStore.modeActuel,
        prenomClient: prenomClient.value || null,
        telephoneClient: telephoneClient.value || null,
        emailClient: emailClient.value || null,
        creneauRetrait: uiStore.estModeStandard ? creneauRetrait.value : null,
        adresseEvenement: uiStore.estModeEvenement ? adresseEvenement.value : null,
        nbInvites: uiStore.estModeEvenement ? nbInvites.value : null,
        detailsLogistiques: uiStore.estModeEvenement ? detailsLogistiques.value : null
      }
    ],
    mode_recuperation: uiStore.estModeStandard 
      ? (modeRecup.value === 'Retrait' ? 'Retrait' : `Livraison (${zoneLivraison.value})`)
      : `Événement (Livraison: ${adresseEvenement.value})`,
    frais_logistique: fraisLogistiques.value,
    total_general: totalGeneral.value,
    date_commande: dateFinale,
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

  // Stocker l'identifiant de la commande localement pour le suivi en temps réel
  if (data && data[0]) {
    try {
      const commandeId = data[0].id;
      const commandesExistantes = JSON.parse(localStorage.getItem('app-commandes') || '[]');
      commandesExistantes.push(commandeId);
      localStorage.setItem('app-commandes', JSON.stringify(commandesExistantes));
    } catch (e) {
      console.error("Impossible d'enregistrer l'ID de commande localement :", e);
    }
  }

  // 1.5 Bloquer les dates de location dans reservations_equipements pour éviter les conflits
  const equipements = props.panier.filter(item => item.typeElement === 'location');
  for (const eq of equipements) {
    if (eq.idBase && eq.dateDebut && eq.dateFin) {
      const { error: errRes } = await supabase
        .from('reservations_equipements')
        .insert([{
          equipement_id: eq.idBase,
          date_debut: eq.dateDebut,
          date_fin: eq.dateFin
        }]);
      if (errRes) {
        console.error("Erreur lors du blocage des dates pour l'équipement :", errRes.message);
      }
    }
  }

  // 2. Génération du message WhatsApp (Mise en page Premium & Emojis)
  let msg = `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (uiStore.estModeStandard) {
    msg += `✨ *${t('brand_title')} — NOUVELLE COMMANDE* ✨\n`;
  } else {
    msg += `🏰 *${t('brand_title')} — DEMANDE DE DEVIS* 🏰\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `👤 *INFORMATIONS CLIENT*\n`;
  if (uiStore.estModeStandard) {
    msg += `▫️ *Client :* ${prenomClient.value} ${nomClient.value}\n`;
    msg += `▫️ *Téléphone :* ${telephoneClient.value}\n`;
    msg += `▫️ *E-mail :* ${emailClient.value}\n`;
    msg += `▫️ *Type :* Vente Standard (Boutique)\n`;
    const recupLabel = modeRecup.value === 'Retrait' 
      ? 'Retrait sur place (Gratuit)'
      : `Livraison - ${zoneLivraison.value}`;
    msg += `▫️ *Mode :* ${recupLabel}\n`;
    msg += `▫️ *Date de retrait :* ${formaterDate(dateSouhaitee.value)} (Créneau : ${creneauRetrait.value})\n\n`;
  } else {
    msg += `▫️ *Client :* ${nomClient.value}\n`;
    msg += `▫️ *Téléphone :* ${telephoneClient.value}\n`;
    msg += `▫️ *E-mail :* ${emailClient.value}\n`;
    msg += `▫️ *Type :* Événement de Prestige (Devis)\n`;
    msg += `▫️ *Date de l'événement :* ${formaterDate(dateEvenement.value)}\n`;
    msg += `▫️ *Nombre d'invités :* ${nbInvites.value} personnes\n`;
    msg += `▫️ *Adresse de réception :* ${adresseEvenement.value}\n`;
    if (detailsLogistiques.value) {
      msg += `▫️ *Notes logistiques :* ${detailsLogistiques.value}\n`;
    }
    msg += `\n`;
  }

  msg += `🛒 *DÉTAILS DES ARTICLES*\n`;
  props.panier.forEach(item => {
    msg += `• ${item.quantite}x ${item.titre} — ${(item.prix * item.quantite).toFixed(2)} €\n`;
    if (item.dateDebut) {
      msg += `  ↳ 📅 ${formaterDate(item.dateDebut)} ➔ ${formaterDate(item.dateFin)} (${item.duree} j.)\n`;
    }
  });
  msg += `\n`;

  msg += `💰 *RÉCAPITULATIF FINANCIER*\n`;
  msg += `▫️ Sous-total : ${totalArticles.value.toFixed(2)} €\n`;
  if (reductionAppliquee.value > 0) {
    msg += `▫️ Réduction : -${reductionAppliquee.value}% ${nomParrain.value ? '(Parrain: ' + nomParrain.value + ')' : ''}\n`;
  }
  if (coutGarantieCasse.value > 0) {
    msg += `▫️ Garantie Casse : +${coutGarantieCasse.value.toFixed(2)} €\n`;
  }
  if (serviceMontageActif.value) {
    msg += `▫️ Service Montage : +50.00 €\n`;
  }
  if (serviceServeursActif.value) {
    msg += `▫️ Service Personnel : ${nbServeurs.value} serveurs x ${dureeServeurs.value}h (+${coutServeurs.value.toFixed(2)} €)\n`;
  }
  if (!uiStore.estModeStandard) {
    msg += `▫️ Frais de livraison/logistique : ${fraisLogistiques.value > 0 ? fraisLogistiques.value.toFixed(2) + ' €' : 'Gratuit'}\n`;
  } else if (modeRecup.value !== 'Retrait') {
    msg += `▫️ Frais de livraison : ${fraisLogistiques.value.toFixed(2)} €\n`;
  }
  msg += `▶️ *${uiStore.estModeStandard ? 'TOTAL À PAYER' : 'TOTAL ESTIMÉ DU DEVIS'} : ${totalGeneral.value.toFixed(2)} €*\n`;
  if (cautionTotale.value > 0) {
    msg += `⚠️ *Caution (remboursable) : ${cautionTotale.value} €*\n`;
  }
  msg += `\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💬 *${uiStore.estModeStandard ? 'Merci pour votre commande !' : 'Demande de devis soumise avec succès !'}*\n`;
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
          <div class="actions-en-tete-panier">
            <button 
              v-if="props.panier.length > 0" 
              @click="viderPanier" 
              class="bouton-vider-panier"
              title="Vider le panier"
            >
              🗑️ Vider
            </button>
            <button @click="emit('close-panier')" class="bouton-fermer-tiroir" aria-label="Fermer">✖</button>
          </div>
        </div>

        <div v-if="props.panier.length === 0" class="panier-vide">
          <span class="icone-panier-vide">🧺</span>
          <p>{{ t('cart_empty') }}</p>
          <button @click="emit('close-panier')" class="bouton-explorer-premium">
            ✨ {{ t('filter_all') }}
          </button>
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

          <!-- MODE RÉCUPÉRATION (STANDARD UNIQUEMENT) -->
          <div v-if="uiStore.estModeStandard" class="section-mode-recup">
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

          <!-- FORMULAIRE INFORMATIONS CLIENT DYNAMIQUE -->
          <div class="section-infos-client">
            <label class="label-champ-premium">{{ uiStore.estModeStandard ? t('your_info') : '📋 Informations Devis Projet' }}</label>
            
            <!-- FORMULAIRE STANDARD (BOUTIQUE) -->
            <div v-if="uiStore.estModeStandard" class="formulaire-client">
              <div class="groupe-saisie-ligne">
                <div class="groupe-saisie">
                  <label>Nom *</label>
                  <input type="text" v-model="nomClient" placeholder="Nom" required />
                </div>
                <div class="groupe-saisie">
                  <label>Prénom *</label>
                  <input type="text" v-model="prenomClient" placeholder="Prénom" required />
                </div>
              </div>
              <div class="groupe-saisie-ligne">
                <div class="groupe-saisie">
                  <label>Téléphone *</label>
                  <input type="tel" v-model="telephoneClient" placeholder="0639 XX XX XX" required />
                </div>
                <div class="groupe-saisie">
                  <label>E-mail *</label>
                  <input type="email" v-model="emailClient" placeholder="exemple@mail.com" required />
                </div>
              </div>
              <div class="groupe-saisie">
                <label>Date de retrait *</label>
                <input type="date" v-model="dateSouhaitee" :min="dateMin" required />
              </div>
              <div class="groupe-saisie">
                <label>Créneau horaire de retrait *</label>
                <select v-model="creneauRetrait" class="select-creneau-premium">
                  <option value="11:30 - 12:30">Midi (11h30 - 12h30)</option>
                  <option value="12:30 - 13:30">Midi (12h30 - 13h30)</option>
                  <option value="18:30 - 19:30">Soir (18h30 - 19h30)</option>
                  <option value="19:30 - 20:30">Soir (19h30 - 20h30)</option>
                </select>
              </div>
            </div>

            <!-- FORMULAIRE ÉVÉNEMENTIEL (DEVIS) -->
            <div v-else class="formulaire-client">
              <div class="groupe-saisie">
                <label>Nom ou Organisation de l'événement *</label>
                <input type="text" v-model="nomClient" placeholder="Ex: Mariage Famille X / Entreprise Y" required />
              </div>
              <div class="groupe-saisie-ligne">
                <div class="groupe-saisie">
                  <label>Téléphone de contact *</label>
                  <input type="tel" v-model="telephoneClient" placeholder="0639 XX XX XX" required />
                </div>
                <div class="groupe-saisie">
                  <label>E-mail de contact *</label>
                  <input type="email" v-model="emailClient" placeholder="adresse@email.com" required />
                </div>
              </div>
              <div class="groupe-saisie-ligne">
                <div class="groupe-saisie">
                  <label>Date précise de l'événement *</label>
                  <input type="date" v-model="dateEvenement" :min="dateMin" required />
                </div>
                <div class="groupe-saisie">
                  <label>Nombre d'invités attendus *</label>
                  <input type="number" v-model="nbInvites" min="1" required />
                </div>
              </div>
              <div class="groupe-saisie">
                <label>Adresse exacte de la réception à Mayotte *</label>
                <input type="text" v-model="adresseEvenement" placeholder="Ex: Plage de Sakouli, Bandrélé" required />
              </div>
              <div class="groupe-saisie">
                <label>Contraintes & Spécifications logistiques</label>
                <textarea 
                  v-model="detailsLogistiques" 
                  placeholder="Ex: Régimes spécifiques, accès PMR, tentes supplémentaires, logistique d'accès..."
                  rows="3"
                  class="textarea-logistique-premium"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- OPTIONS & SERVICES ADDITIONNELS -->
          <div class="section-options-additionnelles" v-if="props.panier.length > 0" style="margin-top: 24px;">
            <label class="label-champ-premium">✨ Services & Garanties Événementielles</label>
            
            <div class="options-additionnelles-grille">
              <!-- Garantie Casse -->
              <label class="option-addon-checkbox" v-if="panierContientLocation">
                <input type="checkbox" v-model="garantieCasseActive" />
                <span class="addon-detail">
                  <span class="nom">🛡️ Garantie Tranquillité Casse (+5% location)</span>
                  <span class="cout">+{{ coutGarantieCasse.toFixed(2) }} €</span>
                </span>
              </label>

              <!-- Montage & Livraison -->
              <label class="option-addon-checkbox" v-if="panierContientLocation">
                <input type="checkbox" v-model="serviceMontageActif" />
                <span class="addon-detail">
                  <span class="nom">⛺ Service Montage & Installation</span>
                  <span class="cout">+{{ coutMontage.toFixed(2) }} €</span>
                </span>
              </label>

              <!-- Serveurs -->
              <label class="option-addon-checkbox">
                <input type="checkbox" v-model="serviceServeursActif" />
                <span class="addon-detail">
                  <span class="nom">🧑‍🍳 Personnel de service (25 €/h par serveur)</span>
                  <span class="cout">+{{ coutServeurs.toFixed(2) }} €</span>
                </span>
              </label>

              <div class="options-serveurs-details" v-if="serviceServeursActif">
                <div class="selecteur-qte-addon">
                  <label>Nombre de serveurs :</label>
                  <div class="boutons-compteur">
                    <button @click="nbServeurs = Math.max(1, nbServeurs - 1)">−</button>
                    <span>{{ nbServeurs }}</span>
                    <button @click="nbServeurs++">+</button>
                  </div>
                </div>
                <div class="selecteur-qte-addon">
                  <label>Durée du service (heures) :</label>
                  <div class="boutons-compteur">
                    <button @click="dureeServeurs = Math.max(1, dureeServeurs - 1)">−</button>
                    <span>{{ dureeServeurs }}</span>
                    <button @click="dureeServeurs++">+</button>
                  </div>
                </div>
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
              <span>{{ t('reduction') }} (-{{ reductionAppliquee }}%) <span v-if="nomParrain" style="font-size: 0.75rem; color: var(--accent-gold-dark);">[Parrain: {{ nomParrain }}]</span></span>
              <span class="valeur-reduction">-{{ (totalArticles * (reductionAppliquee / 100)).toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere" v-if="coutGarantieCasse > 0">
              <span>🛡️ Garantie Tranquillité Casse</span>
              <span>{{ coutGarantieCasse.toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere">
              <span>{{ t('logistic_fees') }} <span v-if="serviceMontageActif || serviceServeursActif" style="font-size: 0.75rem; color: var(--text-secondary);">(avec services)</span></span>
              <span>{{ fraisLogistiques.toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere total-a-payer">
              <span>{{ t('total_to_pay') }}</span>
              <span class="valeur-total">{{ totalGeneral.toFixed(2) }} €</span>
            </div>
            <div class="ligne-financiere caution-recap" v-if="cautionTotale > 0" style="font-size: 0.8rem; font-style: italic; opacity: 0.85;">
              <span>⚠️ Caution à déposer (remboursable)</span>
              <span>{{ cautionTotale }} €</span>
            </div>

            <button @click="soumettreCommande" class="bouton-commander-whatsapp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icone-whatsapp">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              {{ uiStore.estModeStandard ? 'Confirmer ma commande' : 'Demander mon devis gratuit' }}
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
  background-color: var(--bg-app);
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
.bouton-explorer-premium {
  margin-top: 20px;
  background: transparent;
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold-dark);
  padding: 10px 24px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}
.bouton-explorer-premium:hover {
  background: var(--accent-gold-light);
  transform: scale(1.05);
}

/* Services additionnels styles */
.section-options-additionnelles {
  margin-top: 24px;
}
.options-additionnelles-grille {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 16px;
  padding: 16px;
}
.option-addon-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  user-select: none;
}
.option-addon-checkbox input {
  margin-top: 4px;
  accent-color: var(--accent-green);
  cursor: pointer;
}
.addon-detail {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.85rem;
}
.addon-detail .nom {
  font-weight: 600;
  color: var(--text-primary);
}
.addon-detail .cout {
  font-weight: 700;
  color: var(--accent-green);
}
.options-serveurs-details {
  border-top: 1px dashed var(--border-subtile);
  padding-top: 12px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.selecteur-qte-addon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.boutons-compteur {
  display: flex;
  align-items: center;
  gap: 10px;
}
.boutons-compteur button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.boutons-compteur span {
  font-weight: 700;
  font-size: 0.85rem;
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

/* SMART CHECKOUT FIELDS */
.groupe-saisie-ligne {
  display: flex;
  gap: 12px;
  width: 100%;
}
.groupe-saisie-ligne .groupe-saisie {
  flex: 1;
}
.select-creneau-premium {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  box-shadow: var(--shadow-douce);
  transition: border-color 0.2s;
}
.select-creneau-premium:focus {
  border-color: var(--accent-gold);
}
.textarea-logistique-premium {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-carte);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  box-shadow: var(--shadow-douce);
  transition: border-color 0.2s;
}
.textarea-logistique-premium:focus {
  border-color: var(--accent-gold);
}
@media (max-width: 480px) {
  .groupe-saisie-ligne {
    flex-direction: column;
    gap: 0px; /* will stack vertically with standard margins */
  }
}

/* ACTIONS EN-TÊTE PANIER */
.actions-en-tete-panier {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bouton-vider-panier {
  background: transparent;
  border: 1px solid rgba(197, 164, 126, 0.35);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.bouton-vider-panier:hover {
  background: #c53030;
  color: #ffffff;
  border-color: transparent;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(197, 48, 48, 0.2);
}
</style>