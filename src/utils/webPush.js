// =====================================================================
// 🔔 PROTOCOLE DE SOUSCRIPTION AUX NOTIFICATIONS PUSH (WEB PUSH API)
// =====================================================================
// Demande l'autorisation de notification au client, enregistre le jeton
// PushSubscription auprès du navigateur et le persiste dans Supabase.
// =====================================================================

import { supabase } from './supabaseClient'

// Clé publique VAPID fictive pour l'initialisation du service de push
const VAPID_PUBLIC_KEY = 'BJ6WzY8o44b9vR2U3_g9t65xN1_vS7mC3L1MvV_rO4T5z8p7i1Q2a3b4c5d6e7f8'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Enregistre le client actuel aux notifications push contextuelles
 * @param {string|null} userId - ID UUID de l'utilisateur authentifié
 */
export const souscrireAuxNotificationsPush = async (userId = null) => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("Web Push : Notifications non supportées sur ce navigateur.");
      return null;
    }

    // 1. Demande d'autorisation système de notification
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn("Web Push : Autorisation refusée par l'utilisateur.");
      return null;
    }

    // 2. Attente de la préparation du Service Worker
    const registration = await navigator.serviceWorker.ready

    // 3. Souscription auprès du Push Service du navigateur
    const options = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }
    
    const subscription = await registration.pushManager.subscribe(options)
    console.log("🔔 Token de souscription push généré :", subscription.toJSON());

    // 4. Persistence de l'abonnement push dans Supabase
    // Nous vérifions d'abord si cet abonnement existe déjà pour éviter les doublons
    const rawSub = subscription.toJSON()
    const { data: existants } = await supabase
      .from('abonnements_push')
      .select('id')
      .eq('subscription->endpoint', rawSub.endpoint)

    if (existants && existants.length > 0) {
      console.log("💾 Abonnement push déjà référencé dans Supabase.");
      return existants[0];
    }

    const { data, error } = await supabase
      .from('abonnements_push')
      .insert([{
        user_id: userId || null,
        subscription: rawSub
      }])
      .select()

    if (error) throw error

    console.log("💾 Abonnement push enregistré avec succès sur Supabase.");
    return data[0];

  } catch (error) {
    console.error("Erreur lors de la souscription Web Push :", error.message);
    return null;
  }
}
