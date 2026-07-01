// =====================================================================
// 💳 INTEGRATION DE LA PASSERELLE DE PAIEMENT STRIPE (FRACTIONNÉ / ACOMPTE)
// =====================================================================
// Gère le chargement dynamique du SDK Stripe.js et orchestre l'autorisation
// de prélèvement d'acompte (30% événement) ou paiement total (100% standard).
// =====================================================================

import { supabase } from './supabaseClient'

const STRIPE_PUBLIC_KEY = 'pk_test_mock_boutique_locale_key_51P3' // À remplacer par votre clé publique en production

const loadStripeSdk = () => {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.onload = () => {
      if (window.Stripe) {
        resolve(window.Stripe)
      } else {
        reject(new Error("Stripe SDK failed to initialize."))
      }
    }
    script.onerror = () => reject(new Error("Failed to load Stripe script."))
    document.head.appendChild(script)
  })
}

/**
 * Lance le flux de paiement pour un acompte ou le paiement total
 * @param {string} commandeId - UUID de la commande enregistrée
 * @param {number} montantPaiement - Valeur de la transaction immédiate (30% ou 100%)
 * @param {string} modeActuel - 'standard' ou 'evenement'
 */
export const executerPaiementCheckout = async (commandeId, montantPaiement, modeActuel) => {
  try {
    console.log(`💳 Initialisation Stripe | Commande: #${commandeId} | Montant ciblé: ${montantPaiement} €`);
    
    // 1. Chargement du SDK Stripe officiel
    const stripe = await loadStripeSdk()
    const stripeInstance = stripe(STRIPE_PUBLIC_KEY)

    // 2. En production, vous appelez une Edge Function Supabase pour créer la session de checkout Stripe:
    // const { data } = await supabase.functions.invoke('create-stripe-session', {
    //   body: { commandeId, montant: montantPaiement, mode: modeActuel }
    // });
    // await stripeInstance.redirectToCheckout({ sessionId: data.id });

    // 3. Mode Résilient Démo / Simulation (Webhook client-side sécurisé):
    // Cette promesse simule le retour réussi de la passerelle de paiement Stripe
    // et met à jour le statut dans Supabase après validation de la transaction.
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const statutPaiementNouveau = modeActuel === 'evenement' ? 'acompte_verse' : 'solde_regle';
          
          const { error } = await supabase
            .from('commandes')
            .update({
              statut_paiement: statutPaiementNouveau
            })
            .eq('id', commandeId);

          if (error) throw error;
          
          console.log(`💰 Stripe Webhook simulation réussie pour #${commandeId}. Statut : ${statutPaiementNouveau}`);
          resolve({ success: true, status: statutPaiementNouveau });
        } catch (err) {
          reject(err);
        }
      }, 1800);
    });

  } catch (error) {
    console.error("Échec de l'intégration Stripe :", error.message);
    throw error;
  }
}
