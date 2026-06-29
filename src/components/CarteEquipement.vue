<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../utils/supabaseClient'

const props = defineProps({
  equipement: Object
})

const emit = defineEmits(['ajouter-equipement'])

const dateDebut = ref('')
const dateFin = ref('')
const datesIndisponibles = ref([])
const erreurDisponibilite = ref('')

// Génération de l'horodatage actuel (format YYYY-MM-DD) pour bloquer les dates passées
const dateAujourdhui = new Date().toISOString().split('T')[0]

// Phase d'hydratation : Récupération des conflits potentiels
const chargerReservations = async () => {
  const { data, error } = await supabase
    .from('reservations_equipements')
    .select('date_debut, date_fin')
    .eq('equipement_id', props.equipement.id)
    
  if (!error && data) {
    datesIndisponibles.value = data
  }
}

onMounted(() => {
  chargerReservations()
})

// Algorithme d'intersection spatio-temporelle
const verifierChevauchement = () => {
  erreurDisponibilite.value = '';
  if (!dateDebut.value || !dateFin.value) return;

  const debut = new Date(dateDebut.value);
  const fin = new Date(dateFin.value);

  // Vérification de la cohérence chronologique
  if (fin < debut) {
    erreurDisponibilite.value = "La date de fin doit succéder à la date de début.";
    return;
  }

  // Évaluation des vecteurs de réservation
  for (const res of datesIndisponibles.value) {
    const resDebut = new Date(res.date_debut);
    const resFin = new Date(res.date_fin);
    
    // Si l'intervalle sélectionné croise un intervalle existant (StartA <= EndB && EndA >= StartB)
    if (debut <= resFin && fin >= resDebut) {
      erreurDisponibilite.value = "Cet équipement est déjà réservé sur la période sélectionnée.";
      return;
    }
  }
}

// Déclencheur réactif pour l'évaluation temporelle
watch([dateDebut, dateFin], verifierChevauchement);

const dureeLocation = computed(() => {
  if (!dateDebut.value || !dateFin.value || erreurDisponibilite.value !== '') return 0
  const debut = new Date(dateDebut.value)
  const fin = new Date(dateFin.value)
  const diffTemps = fin.getTime() - debut.getTime()
  const diffJours = Math.ceil(diffTemps / (1000 * 3600 * 24))
  return diffJours > 0 ? diffJours : 0
})

const prixTotal = computed(() => {
  return dureeLocation.value * props.equipement.prix_journalier
})

const reserverEquipement = () => {
  if (dureeLocation.value <= 0 || erreurDisponibilite.value !== '') return
  
  emit('ajouter-equipement', {
    ...props.equipement,
    dateDebutSelectionnee: dateDebut.value,
    dateFinSelectionnee: dateFin.value,
    dureeJours: dureeLocation.value,
    prixTotalLocation: prixTotal.value
  })
}
</script>

<template>
  <article class="carte-premium">
    <div class="conteneur-image">
      <img :src="equipement.image_url" :alt="equipement.titre" class="image-produit" loading="lazy" />
      <span class="badge-tag">Location</span>
    </div>
    
    <div class="contenu-carte">
      <h3 class="titre-produit">{{ equipement.titre }}</h3>
      <p class="description-produit">{{ equipement.description }}</p>
      
      <div class="selecteur-dates-premium">
        <div class="champ-date">
          <label>Début</label>
          <input type="date" v-model="dateDebut" :min="dateAujourdhui" class="input-date" />
        </div>
        <div class="diviseur-dates">→</div>
        <div class="champ-date">
          <label>Fin</label>
          <input type="date" v-model="dateFin" :min="dateDebut || dateAujourdhui" class="input-date" />
        </div>
      </div>
      
      <p v-if="erreurDisponibilite" class="alerte-disponibilite">⚠️ {{ erreurDisponibilite }}</p>

      <div class="pied-carte">
        <div class="info-prix">
          <span class="label-prix">Total location</span>
          <div class="recap-prix">
            <span class="prix-affiche">{{ prixTotal > 0 ? prixTotal : equipement.prix_journalier }} €</span>
            <span class="prix-detail">{{ prixTotal > 0 ? `${dureeLocation} jour(s)` : '/ jour' }}</span>
          </div>
        </div>
        
        <button 
          class="bouton-ajouter-premium" 
          :class="{ 'bouton-desactive': dureeLocation <= 0 || erreurDisponibilite !== '' }"
          @click="reserverEquipement" 
          :disabled="dureeLocation <= 0 || erreurDisponibilite !== ''"
          aria-label="Réserver cet équipement"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.carte-premium {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: var(--radius-carte);
  overflow: hidden;
  box-shadow: var(--shadow-douce);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.carte-premium:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-premium), var(--shadow-hover);
  border-color: rgba(197, 164, 126, 0.4);
}

.conteneur-image { width: 100%; aspect-ratio: 4 / 3; overflow: hidden; position: relative; background-color: #f7f6f2; }
.image-produit { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.carte-premium:hover .image-produit {
  transform: scale(1.05);
}

.badge-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-gold-dark);
  border: 1px solid rgba(197, 164, 126, 0.15);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.contenu-carte { padding: 24px; display: flex; flex-direction: column; flex-grow: 1; }
.titre-produit { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; margin: 0 0 10px 0; color: var(--text-primary); line-height: 1.3; }
.description-produit { font-family: 'Inter', sans-serif; font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.6; flex-grow: 1; }

.selecteur-dates-premium {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  background-color: var(--accent-gold-light);
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid var(--border-subtile);
}

.champ-date { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.champ-date label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px; }
.input-date { background: transparent; border: none; padding: 0; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); width: 100%; outline: none; cursor: pointer; }
.diviseur-dates { font-size: 1.1rem; color: var(--accent-gold); font-weight: 700; }

.alerte-disponibilite {
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c53030;
  background-color: #fff5f5;
  padding: 10px 14px;
  border-radius: 10px;
  margin: 0 0 16px 0;
  border: 1px solid #fed7d7;
}

.pied-carte { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 18px; border-top: 1px solid var(--border-subtile); }
.info-prix { display: flex; flex-direction: column; gap: 2px; }
.label-prix {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}
.recap-prix { display: flex; align-items: baseline; gap: 6px; }
.prix-affiche { font-family: 'Inter', sans-serif; font-size: 1.35rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
.prix-detail { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; }

.bouton-ajouter-premium { 
  width: 46px; 
  height: 46px; 
  border-radius: 14px; 
  background-color: var(--btn-primary); 
  color: var(--btn-primary-text); 
  border: none; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  box-shadow: 0 6px 16px rgba(38, 70, 60, 0.2);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.bouton-ajouter-premium svg { width: 20px; height: 20px; }
.bouton-ajouter-premium:hover { 
  background-color: #1e362e;
  transform: scale(1.08) translateY(-2px); 
  box-shadow: 0 8px 20px rgba(38, 70, 60, 0.3);
}
.bouton-ajouter-premium:active { transform: scale(0.95); }

.bouton-desactive { 
  background-color: #f1efeb; 
  color: #a09790; 
  cursor: not-allowed; 
  box-shadow: none;
  border: 1px solid var(--border-subtile);
}
.bouton-desactive:hover {
  background-color: #f1efeb;
  transform: none;
  box-shadow: none;
}
.bouton-desactive:active { transform: none; }

@media (max-width: 768px) {
  .conteneur-image { margin: 12px 12px 0 12px; width: calc(100% - 24px); border-radius: 16px; }
  .contenu-carte { padding: 18px; }
}
</style>