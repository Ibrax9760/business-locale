// =====================================================================
// 🏪 STORE PINIA DE GESTION DE L'ÉTAT UI GLOBAL (DOUBLE-FUNNEL)
// =====================================================================
// Centralise le mode de l'expérience utilisateur actuel ('standard' ou 'evenement').
// Persiste le choix dans le localStorage pour maintenir la cohérence au rafraîchissement.
// =====================================================================

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  // Mode initial lu depuis le localStorage, ou par défaut 'standard'
  const modeActuel = ref(localStorage.getItem('app-mode') || 'standard')

  // Getters computed pour faciliter les vérifications dans les templates
  const estModeEvenement = computed(() => modeActuel.value === 'evenement')
  const estModeStandard = computed(() => modeActuel.value === 'standard')

  // Change le mode actuel et le persiste localement
  function setMode(mode) {
    if (mode === 'standard' || mode === 'evenement') {
      modeActuel.value = mode
      localStorage.setItem('app-mode', mode)
    }
  }

  // Alterne facilement entre le mode standard et le mode événementiel
  function basculerMode() {
    const nouveauMode = modeActuel.value === 'standard' ? 'evenement' : 'standard'
    setMode(nouveauMode)
  }

  return {
    modeActuel,
    estModeEvenement,
    estModeStandard,
    setMode,
    basculerMode
  }
})
