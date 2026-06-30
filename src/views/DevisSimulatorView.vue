<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { t } from '../utils/i18n'

const router = useRouter()
const emit = defineEmits(['ajouter-au-panier'])

const typeEvenement = ref('Mariage')
const nbInvites = ref(50)
const standing = ref('Premium') // Classic, Premium, Luxe

// Services additionnels par défaut
const inclurePersonnel = ref(true)
const inclureMontage = ref(true)

// Liste des spécialités simulées
const estimations = computed(() => {
  let prixPlatAdulte = 12
  let coeffEquipement = 5
  
  if (standing.value === 'Classic') {
    prixPlatAdulte = 10
    coeffEquipement = 4
  } else if (standing.value === 'Luxe') {
    prixPlatAdulte = 22
    coeffEquipement = 12
  }

  const traiteurEstimation = nbInvites.value * prixPlatAdulte
  const equipementEstimation = nbInvites.value * coeffEquipement
  
  let personnelFrais = 0
  if (inclurePersonnel.value) {
    personnelFrais = Math.ceil(nbInvites.value / 30) * 150 // 1 serveur pour 30 pers
  }

  let montageFrais = 0
  if (inclureMontage.value) {
    montageFrais = 90 + (nbInvites.value * 0.5)
  }

  const totalProjete = traiteurEstimation + equipementEstimation + personnelFrais + montageFrais
  const cautionEstimee = Math.round(equipementEstimation * 0.4)

  return {
    traiteur: traiteurEstimation,
    equipement: equipementEstimation,
    personnel: personnelFrais,
    montage: montageFrais,
    caution: cautionEstimee,
    total: totalProjete
  }
})

const ajouterAuPanierDeSimulateur = () => {
  // Ajouter un package d'événement simulé au panier
  const packagePredefini = {
    id: `pack-${Date.now()}`,
    titre: `Package ${typeEvenement.value} (${standing.value}) — ${nbInvites.value} Pers.`,
    prixTotalLocation: estimations.value.total,
    dateDebutSelectionnee: '',
    dateFinSelectionnee: '',
    typeElement: 'location',
    idBase: null
  }
  
  emit('ajouter-au-panier', packagePredefini, false)
  alert("Le package d'estimation événementielle a été ajouté à votre panier avec succès !")
  router.push('/')
}
</script>

<template>
  <div class="simulator-view animate-fade">
    <div class="header-sim">
      <span class="tagline-sim">✨ SIMULATEUR INSTANTANÉ ✨</span>
      <h2>Simulateur de Budget Événementiel</h2>
      <p class="desc-sim">Estimez en quelques secondes le budget traiteur et matériel pour votre réception à Mayotte.</p>
    </div>

    <div class="grille-devis">
      <!-- CONFIGURATEUR -->
      <div class="boite-config">
        <h3>Configurez votre réception</h3>
        
        <div class="champ-sim">
          <label>Type d'événement</label>
          <select v-model="typeEvenement">
            <option value="Mariage">Mariage</option>
            <option value="Cocktail Pro">Cocktail d'entreprise</option>
            <option value="Dîner Privé">Dîner Privé</option>
            <option value="Fête Familiale">Fête Familiale</option>
          </select>
        </div>

        <div class="champ-sim">
          <label>Nombre d'invités ({{ nbInvites }} personnes)</label>
          <input type="range" min="10" max="300" step="5" v-model.number="nbInvites" class="range-sim" />
          <div class="bornes-range">
            <span>10 pers.</span>
            <span>300 pers.</span>
          </div>
        </div>

        <div class="champ-sim">
          <label>Niveau de Standing</label>
          <div class="selecteur-boutons">
            <button 
              :class="{ actif: standing === 'Classic' }" 
              @click="standing = 'Classic'"
            >
              Classic
            </button>
            <button 
              :class="{ actif: standing === 'Premium' }" 
              @click="standing = 'Premium'"
            >
              Premium
            </button>
            <button 
              :class="{ actif: standing === 'Luxe' }" 
              @click="standing = 'Luxe'"
            >
              Luxe / Prestige
            </button>
          </div>
        </div>

        <div class="champ-checkbox-sim">
          <label class="switch-premium">
            <input type="checkbox" v-model="inclurePersonnel" />
            <span class="slider"></span>
            <span class="txt">Inclure le personnel de service (serveurs)</span>
          </label>
        </div>

        <div class="champ-checkbox-sim">
          <label class="switch-premium">
            <input type="checkbox" v-model="inclureMontage" />
            <span class="slider"></span>
            <span class="txt">Inclure la livraison et le montage du matériel</span>
          </label>
        </div>
      </div>

      <!-- ESTIMATIONS FINANCIÈRES -->
      <div class="boite-recap-sim">
        <h3>Estimation budgétaire</h3>
        
        <div class="ligne-detail-sim">
          <span>Partie Traiteur (Gastronomie) :</span>
          <span class="val">{{ estimations.traiteur }} €</span>
        </div>

        <div class="ligne-detail-sim">
          <span>Partie Matériel de réception (Chaises, tables, tentes) :</span>
          <span class="val">{{ estimations.equipement }} €</span>
        </div>

        <div class="ligne-detail-sim" v-if="inclurePersonnel">
          <span>Personnel de service :</span>
          <span class="val">{{ estimations.personnel }} €</span>
        </div>

        <div class="ligne-detail-sim" v-if="inclureMontage">
          <span>Installation & Logistique :</span>
          <span class="val">{{ estimations.montage }} €</span>
        </div>

        <div class="ligne-detail-sim caution-ligne">
          <span>Caution à déposer (remboursable) :</span>
          <span class="val">{{ estimations.caution }} €</span>
        </div>

        <hr class="separateur-sim" />

        <div class="total-sim">
          <span>Total Estimé :</span>
          <span class="total-val">{{ estimations.total.toFixed(2) }} €</span>
        </div>

        <button @click="ajouterAuPanierDeSimulateur" class="btn-ajouter-sim">
          🧺 Importer le pack entier
        </button>
        <p class="mention-loi">*Cette estimation est donnée à titre indicatif et sera validée par le vendeur après examen des spécificités.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simulator-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 10px 80px;
}
.header-sim {
  text-align: center;
  margin-bottom: 40px;
}
.tagline-sim {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-gold-dark);
  letter-spacing: 2px;
  display: block;
  margin-bottom: 8px;
}
.header-sim h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 10px;
}
.desc-sim {
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 550px;
  margin: 0 auto;
  line-height: 1.6;
}

.grille-devis {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 30px;
}

.boite-config, .boite-recap-sim {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 24px;
  padding: 30px;
  box-shadow: var(--shadow-douce);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.boite-config h3, .boite-recap-sim h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem;
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.champ-sim {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.champ-sim label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}
.champ-sim select {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  outline: none;
}

.range-sim {
  width: 100%;
  accent-color: var(--accent-green);
  cursor: pointer;
}
.bornes-range {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.selecteur-boutons {
  display: flex;
  gap: 10px;
}
.selecteur-boutons button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}
.selecteur-boutons button.actif {
  background: var(--accent-gold-light);
  border-color: var(--accent-gold-dark);
  color: var(--text-primary);
}

/* Switch */
.switch-premium {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.switch-premium input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  width: 40px;
  height: 20px;
  background-color: var(--border-subtile);
  transition: .4s;
  border-radius: 20px;
  position: relative;
}
.slider:before {
  content: "";
  position: absolute;
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
.switch-premium input:checked + .slider {
  background-color: var(--accent-green);
}
.switch-premium input:checked + .slider:before {
  transform: translateX(20px);
}

/* Recap */
.ligne-detail-sim {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}
.caution-ligne {
  font-style: italic;
  font-size: 0.85rem;
}
.separateur-sim {
  border: none;
  border-top: 1px dashed var(--border-subtile);
}
.total-sim {
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--text-primary);
}
.total-val {
  color: var(--accent-green);
}
.btn-ajouter-sim {
  width: 100%;
  padding: 16px;
  background: var(--accent-green);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(38, 70, 60, 0.2);
  transition: background 0.2s;
}
.btn-ajouter-sim:hover {
  background: #1e362e;
}
.mention-loi {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .grille-devis {
    grid-template-columns: 1fr;
  }
}
</style>
