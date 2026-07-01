<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '../utils/supabaseClient'
import Chart from 'chart.js/auto'

// Déclaration stricte des propriétés transmises par le routeur
const props = defineProps({
  utilisateur: Object,
  profilClient: Object
})

const ongletActif = ref('commandes')
const listeCommandes = ref([])
const listeUtilisateurs = ref([])
const listePromos = ref([])
const chargement = ref(true)

// Stats dashboard states
const stats = ref({
  chiffre_affaires: 0,
  panier_moyen: 0,
  volume_activite: 0,
  evolution: []
})
const chargementStats = ref(false)

let lineChartInstance = null
let barChartInstance = null

const modalCommandeOuverte = ref(false)
const modalPromoOuverte = ref(false)
const modeEditionCommande = ref(false)
const commandeEnEdition = ref(null)

const formulaireCommande = ref({ nom_client: '', mode_recuperation: 'Manuelle', total_general: 0, statut: 'En attente', details_panier: [] })
const nouvellePromo = ref({ code: '', type_reduction: 'pourcentage', valeur: 0 })

const chargerCommandes = async () => {
  chargement.value = true
  const { data } = await supabase.from('commandes').select('*').order('created_at', { ascending: false })
  if (data) listeCommandes.value = data
  chargement.value = false
}

const chargerUtilisateurs = async () => {
  chargement.value = true
  const { data } = await supabase.from('profils').select('*')
  if (data) listeUtilisateurs.value = data
  chargement.value = false
}

const chargerPromos = async () => {
  chargement.value = true
  const { data } = await supabase.from('codes_promotionnels').select('*')
  if (data) listePromos.value = data
  chargement.value = false
}

const sauvegarderCommande = async () => {
  const { id, created_at, ...payload } = formulaireCommande.value
  if (modeEditionCommande.value) {
    await supabase.from('commandes').update(payload).eq('id', commandeEnEdition.value.id)
  } else {
    await supabase.from('commandes').insert([payload])
  }
  modalCommandeOuverte.value = false
  chargerCommandes()
}

const ouvrirEditionCommande = (cmd) => {
  commandeEnEdition.value = cmd
  formulaireCommande.value = { ...cmd }
  modeEditionCommande.value = true
  modalCommandeOuverte.value = true
}

const modifierRoleUtilisateur = async (userId, nouveauRole) => {
  try {
    const { error } = await supabase
      .from('profils')
      .update({ role: nouveauRole })
      .eq('id', userId)
      
    if (error) throw error
    alert("Rôle de l'utilisateur mis à jour avec succès !")
    chargerUtilisateurs()
  } catch (error) {
    console.error("Échec de la modification du rôle :", error.message)
    alert("Erreur lors de la mise à jour du rôle.")
  }
}

const supprimerCommande = async (cmd) => {
  if (!confirm("Supprimer ?")) return
  await supabase.from('commandes').delete().eq('id', cmd.id)
  chargerCommandes()
}

const ajouterPromo = async () => {
  await supabase.from('codes_promotionnels').insert([{ 
    code: nouvellePromo.value.code.toUpperCase(), 
    type_reduction: nouvellePromo.value.type_reduction, 
    valeur: nouvellePromo.value.valeur 
  }])
  nouvellePromo.value = { code: '', type_reduction: 'pourcentage', valeur: 0 }
  modalPromoOuverte.value = false
  chargerPromos()
}

const supprimerPromo = async (id) => {
  await supabase.from('codes_promotionnels').delete().eq('id', id)
  chargerPromos()
}

const getCouleurStatut = (statut) => {
  if (statut === 'Validée') return 'badge-succes'
  if (statut === 'Annulée') return 'badge-erreur'
  if (statut === 'En préparation') return 'badge-preparation'
  return 'badge-attente'
}

const formaterDate = (d) => new Date(d).toLocaleDateString('fr-FR')

const chargerStats = async () => {
  chargementStats.value = true
  try {
    const { data, error } = await supabase.rpc('get_admin_stats')
    if (error) {
      console.warn("RPC non disponible, calcul local...", error.message)
      await chargerStatsLocal()
    } else {
      stats.value = data || { chiffre_affaires: 0, panier_moyen: 0, volume_activite: 0, evolution: [] }
    }
    
    await nextTick()
    initialiserGraphiques()
  } catch (err) {
    console.error("Erreur stats :", err)
  } finally {
    chargementStats.value = false
  }
}

const chargerStatsLocal = async () => {
  const { data } = await supabase
    .from('commandes')
    .select('total_general, created_at')
    .in('statut', ['Validée', 'Terminée'])
  
  if (!data) return
  
  const ca = data.reduce((sum, c) => sum + (c.total_general || 0), 0)
  const count = data.length
  const pm = count > 0 ? ca / count : 0
  
  const evoMap = {}
  data.forEach(c => {
    const d = new Date(c.created_at).toLocaleDateString('fr-FR')
    evoMap[d] = (evoMap[d] || 0) + (c.total_general || 0)
  })
  
  const evolution = Object.keys(evoMap).map(k => ({
    date_vente: k,
    ca_jour: evoMap[k],
    count_jour: data.filter(c => new Date(c.created_at).toLocaleDateString('fr-FR') === k).length
  })).sort((a,b) => new Date(a.date_vente.split('/').reverse().join('-')) - new Date(b.date_vente.split('/').reverse().join('-')))
  
  stats.value = {
    chiffre_affaires: ca,
    panier_moyen: pm,
    volume_activite: count,
    evolution
  }
}

const initialiserGraphiques = () => {
  if (lineChartInstance) lineChartInstance.destroy()
  if (barChartInstance) barChartInstance.destroy()
  
  const ctxLine = document.getElementById('lineChartCA')
  const ctxBar = document.getElementById('barChartCA')
  
  const labels = stats.value.evolution.map(x => x.date_vente || 'Date')
  const values = stats.value.evolution.map(x => x.ca_jour || 0)
  const counts = stats.value.evolution.map(x => x.count_jour || 0)
  
  if (ctxLine) {
    lineChartInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: "Chiffre d'Affaires (€)",
          data: values,
          borderColor: '#c5a47e',
          backgroundColor: 'rgba(197, 164, 126, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    })
  }
  
  if (ctxBar) {
    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nombre de Ventes',
          data: counts,
          backgroundColor: '#26463c',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    })
  }
}

const changerOnglet = (o) => {
  ongletActif.value = o
  if (o === 'commandes') chargerCommandes()
  if (o === 'utilisateurs') chargerUtilisateurs()
  if (o === 'promotions') chargerPromos()
  if (o === 'stats') chargerStats()
}

onMounted(chargerCommandes)

onUnmounted(() => {
  if (lineChartInstance) lineChartInstance.destroy()
  if (barChartInstance) barChartInstance.destroy()
})
</script>

<template>
  <div class="panneau-admin-container">
    <div class="en-tete-admin">
      <h2>Console d'Administration</h2>
      <div class="selecteur-onglets">
        <button :class="{ actif: ongletActif === 'commandes' }" @click="changerOnglet('commandes')">Commandes</button>
        <button :class="{ actif: ongletActif === 'utilisateurs' }" @click="changerOnglet('utilisateurs')">Utilisateurs</button>
        <button v-if="props.profilClient?.role === 'super_admin'" :class="{ actif: ongletActif === 'promotions' }" @click="changerOnglet('promotions')">Promotions</button>
        <button :class="{ actif: ongletActif === 'stats' }" @click="changerOnglet('stats')">📈 Statistiques</button>
      </div>
    </div>

    <!-- ONGLET COMMANDES -->
    <div v-if="ongletActif === 'commandes'" class="contenu-onglet">
      <div v-if="chargement" class="chargement-premium">
        Chargement des commandes en cours...
      </div>
      <div v-else class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Client</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cmd in listeCommandes" :key="cmd.id">
              <td class="cellule-forte">{{ cmd.nom_client }}</td>
              <td class="cellule-prix">{{ cmd.total_general }} €</td>
              <td><span class="badge-statut" :class="getCouleurStatut(cmd.statut)">{{ cmd.statut }}</span></td>
              <td class="cellule-actions">
                <button @click="ouvrirEditionCommande(cmd)" class="btn-icone" title="Modifier le statut">✏️</button>
                <button @click="supprimerCommande(cmd)" class="btn-icone danger" title="Supprimer">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ONGLET PROMOTIONS -->
    <div v-if="ongletActif === 'promotions'" class="contenu-onglet">
      <div class="barre-actions">
        <button @click="modalPromoOuverte = true" class="bouton-action principal">
          ✨ Nouveau Code Promo
        </button>
      </div>
      <div class="table-responsive">
        <table class="table-premium">
          <thead><tr><th>Code</th><th>Valeur</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="promo in listePromos" :key="promo.id">
              <td class="cellule-forte">{{ promo.code }}</td>
              <td class="cellule-prix">{{ promo.valeur }} {{ promo.type_reduction === 'pourcentage' ? '%' : '€' }}</td>
              <td><button @click="supprimerPromo(promo.id)" class="btn-icone danger">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ONGLET UTILISATEURS -->
    <div v-if="ongletActif === 'utilisateurs'" class="contenu-onglet">
      <div v-if="chargement" class="chargement-premium">
        Chargement des utilisateurs en cours...
      </div>
      <div v-else class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Modifier Rôle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in listeUtilisateurs" :key="user.id">
              <td class="cellule-forte">{{ user.nom || 'Client sans nom' }}</td>
              <td>
                <span class="badge-statut" :class="user.role === 'super_admin' ? 'badge-attente' : 'badge-succes'">
                  {{ user.role || 'client' }}
                </span>
              </td>
              <td>
                <select 
                  :value="user.role || 'client'" 
                  @change="modifierRoleUtilisateur(user.id, $event.target.value)"
                  class="input-admin-select"
                >
                  <option value="client">Client</option>
                  <option value="vendeur">Vendeur</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ONGLET STATISTIQUES -->
    <div v-if="ongletActif === 'stats'" class="contenu-onglet">
      <div v-if="chargementStats" class="chargement-premium">
        Calcul et chargement des statistiques en cours...
      </div>
      <div v-else class="conteneur-stats-dashboard">
        <!-- KPI Cards Grid -->
        <div class="grille-kpi-stats">
          <div class="carte-kpi-stats">
            <span class="label-kpi">💰 Chiffre d'Affaires</span>
            <span class="valeur-kpi">{{ stats.chiffre_affaires.toFixed(2) }} €</span>
            <p class="desc-kpi">Ventes cumulées validées</p>
          </div>
          
          <div class="carte-kpi-stats">
            <span class="label-kpi">🧺 Panier Moyen</span>
            <span class="valeur-kpi">{{ stats.panier_moyen.toFixed(2) }} €</span>
            <p class="desc-kpi">Moyenne par commande</p>
          </div>
          
          <div class="carte-kpi-stats">
            <span class="label-kpi">📈 Commandes Traitées</span>
            <span class="valeur-kpi">{{ stats.volume_activite }}</span>
            <p class="desc-kpi">Volume total de commandes</p>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grille-graphiques-stats">
          <div class="carte-graphique">
            <h3>📈 Évolution temporelle du Chiffre d'Affaires</h3>
            <div class="chart-wrapper">
              <canvas id="lineChartCA"></canvas>
            </div>
          </div>
          
          <div class="carte-graphique">
            <h3>📊 Volume quotidien des transactions</h3>
            <div class="chart-wrapper">
              <canvas id="barChartCA"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL D'ÉDITION DE STATUT DE COMMANDE -->
    <transition name="modal-pop">
      <div v-if="modalCommandeOuverte" class="modal-overlay" @click.self="modalCommandeOuverte = false">
        <div class="modal-auth">
          <button class="bouton-fermer-auth" @click="modalCommandeOuverte = false">✖</button>
          <h2>Modifier la Commande</h2>
          
          <form @submit.prevent="sauvegarderCommande">
            <div class="groupe-champ">
              <label>Statut de la commande</label>
              <select v-model="formulaireCommande.statut">
                <option value="En attente">En attente</option>
                <option value="En préparation">En préparation</option>
                <option value="Validée">Validée</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>

            <div class="groupe-champ">
              <label>Nom du Client</label>
              <input type="text" v-model="formulaireCommande.nom_client" required />
            </div>

            <div class="groupe-champ">
              <label>Total Général (€)</label>
              <input type="number" v-model="formulaireCommande.total_general" step="0.01" required />
            </div>

            <div class="groupe-champ">
              <label>Mode de récupération</label>
              <input type="text" v-model="formulaireCommande.mode_recuperation" required />
            </div>

            <button type="submit" class="bouton-valider-auth">
              Sauvegarder les modifications
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- MODAL D'AJOUT DE CODE PROMO (FORME BULLE) -->
    <transition name="modal-pop">
      <div v-if="modalPromoOuverte" class="modal-overlay" @click.self="modalPromoOuverte = false">
        <div class="modal-auth">
          <button class="bouton-fermer-auth" @click="modalPromoOuverte = false">✖</button>
          <h2>Nouveau Code Promo</h2>
          <p style="font-size: 0.85rem; color: #6b7b8c; margin-bottom: 20px;">Créez un code privilège pour vos clients</p>
          
          <form @submit.prevent="ajouterPromo">
            <div class="groupe-champ">
              <label>Code de réduction</label>
              <input v-model="nouvellePromo.code" placeholder="EX: BIENVENUE10" class="input-admin" style="text-transform: uppercase;" required />
            </div>

            <div class="groupe-champ">
              <label>Type de réduction</label>
              <select v-model="nouvellePromo.type_reduction" class="input-admin">
                <option value="pourcentage">Pourcentage (%)</option>
                <option value="fixe">Valeur Fixe (€)</option>
              </select>
            </div>

            <div class="groupe-champ">
              <label>Valeur de réduction</label>
              <input type="number" v-model="nouvellePromo.valeur" class="input-admin" required />
            </div>

            <button type="submit" class="bouton-valider-auth">
              Créer le code promo
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.panneau-admin-container { max-width: 1200px; margin: 40px auto; padding: 0 20px; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.en-tete-admin { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
.en-tete-admin h2 { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--text-primary); margin: 0; }

.selecteur-onglets { display: flex; gap: 12px; background: var(--accent-gold-light); padding: 6px; border-radius: 12px; width: fit-content; }
.selecteur-onglets button { padding: 10px 24px; border: none; background: transparent; border-radius: 8px; font-family: 'Inter', sans-serif; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.selecteur-onglets button.actif { background: var(--bg-carte); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.barre-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }
.bouton-action { padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; font-family: 'Inter', sans-serif; }
.bouton-action.principal { background: var(--accent-green); color: white; }

.formulaire-promo { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 24px; background: var(--bg-carte); padding: 20px; border-radius: 16px; border: 1px solid var(--border-subtile); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.bouton-promo { height: 42px; margin-bottom: 2px; }

.table-responsive { width: 100%; overflow-x: auto; background: var(--bg-carte); border-radius: 16px; border: 1px solid var(--border-subtile); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.table-premium { width: 100%; border-collapse: collapse; text-align: left; font-family: 'Inter', sans-serif; min-width: 600px; }
.table-premium th { background: var(--bg-app); padding: 16px 20px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtile); }
.table-premium td { padding: 20px; border-bottom: 1px solid var(--border-subtile); font-size: 0.95rem; color: var(--text-primary); vertical-align: middle; }
.cellule-forte { font-weight: 600; }
.cellule-prix { font-weight: 800; color: var(--accent-green); }
.cellule-actions { display: flex; gap: 8px; }

.btn-icone { background: var(--accent-gold-light); border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: var(--text-primary); transition: 0.2s; }
.btn-icone:hover { background: var(--border-subtile); }
.btn-icone.danger:hover { background: #ffebee; color: #c62828; }

.badge-statut { padding: 6px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; display: inline-block; white-space: nowrap; }
.badge-attente { background: #f3e8ff; color: #7e22ce; }       
.badge-preparation { background: #fff7ed; color: #ea580c; }   
.badge-succes { background: #e6f4ea; color: #1e8e3e; }        
.badge-erreur { background: #ffebee; color: #c62828; }        

.input-admin { width: 100%; padding: 10px; border: 1px solid var(--border-subtile); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.9rem; background: var(--bg-app); color: var(--text-primary); }
.bouton-sauvegarder { background: var(--accent-green); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }

.modal-overlay { position: fixed; inset: 0; background: rgba(15, 20, 25, 0.65); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px; }
.modal-auth { background: var(--bg-carte); width: 100%; max-width: 400px; border-radius: 24px; padding: 32px; position: relative; border: 1px solid var(--border-subtile); box-shadow: var(--shadow-premium); }
.bouton-fermer-auth { position: absolute; top: 20px; right: 20px; background: var(--accent-gold-light); color: var(--text-primary); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
.modal-auth h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin: 0 0 20px 0; color: var(--text-primary); }
.groupe-champ { margin-bottom: 16px; display: flex; flex-direction: column; }
.groupe-champ label { font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;}
.groupe-champ input, .groupe-champ select { width: 100%; padding: 12px; border: 1px solid var(--border-subtile); border-radius: 12px; font-size: 1rem; background: var(--bg-app); color: var(--text-primary); }
.bouton-valider-auth { width: 100%; padding: 14px; margin-top: 10px; border-radius: 14px; background: var(--accent-green); color: #ffffff; font-weight: 700; border: none; cursor: pointer; }

/* --- INPUT SELECTION ROLE --- */
.input-admin-select {
  padding: 8px 12px;
  border: 1px solid var(--border-subtile);
  border-radius: 8px;
  background: var(--bg-app);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}
.input-admin-select:focus {
  border-color: var(--accent-green);
}

.chargement-premium {
  padding: 40px;
  text-align: center;
  font-family: 'Inter', sans-serif;
  color: var(--text-secondary);
  font-weight: 500;
}

/* --- TRANSITIONS MODALE (modal-pop) --- */
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity 0.3s ease;
}
.modal-pop-enter-active .modal-auth,
.modal-pop-leave-active .modal-auth {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}
.modal-pop-enter-from .modal-auth,
.modal-pop-leave-to .modal-auth {
  transform: scale(0.95) translateY(10px);
}

/* --- SECTION STATISTIQUES DASHBOARD --- */
.conteneur-stats-dashboard {
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: fadeIn 0.4s ease;
}
.grille-kpi-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
.carte-kpi-stats {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
}
.carte-kpi-stats:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(197, 164, 126, 0.15);
  border-color: var(--accent-gold);
}
.carte-kpi-stats .label-kpi {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.carte-kpi-stats .valeur-kpi {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--accent-green);
  font-family: 'Playfair Display', serif;
}
.carte-kpi-stats .desc-kpi {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}
.grille-graphiques-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}
.carte-graphique {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.carte-graphique h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}
.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

@media (max-width: 600px) {
  .grille-graphiques-stats {
    grid-template-columns: 1fr;
  }
}
</style>