<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'

const ongletActif = ref('commandes')
const listeCommandes = ref([])
const listeUtilisateurs = ref([])
const chargement = ref(true)

// Récupération de l'historique des transactions
const chargerCommandes = async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    listeCommandes.value = data
  } catch (erreur) {
    console.error("Erreur lecture commandes :", erreur.message)
  } finally {
    chargement.value = false
  }
}

// Récupération du registre des utilisateurs
const chargerUtilisateurs = async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase
      .from('profils')
      .select('*')
      .order('date_creation', { ascending: false })
    
    if (error) throw error
    listeUtilisateurs.value = data
  } catch (erreur) {
    console.error("Erreur lecture profils :", erreur.message)
  } finally {
    chargement.value = false
  }
}

// Mutation de données (Mise à jour d'un profil par le super_admin)
const mettreAJourProfil = async (id, champ, nouvelleValeur) => {
  try {
    const { error } = await supabase
      .from('profils')
      .update({ [champ]: nouvelleValeur })
      .eq('id', id)
    
    if (error) throw error
    alert('Mise à jour effectuée avec succès.')
  } catch (erreur) {
    console.error("Erreur de mise à jour :", erreur.message)
    alert("Échec de la modification. Vérifiez les droits RLS.")
  }
}

// Formatage temporel
const formaterDate = (chaineDate) => {
  // 1. Interception des valeurs absentes ou nulles
  if (!chaineDate) return 'Date non renseignée';

  // 2. Instanciation de l'objet temporel
  const dateObj = new Date(chaineDate);

  // 3. Contrôle d'intégrité de l'objet (Évite le retour "Invalid Date")
  if (isNaN(dateObj.getTime())) return 'Format temporel illisible';

  // 4. Application de la norme de formatage locale française
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

// Cycle de vie : Chargement initial
onMounted(() => {
  chargerCommandes()
})

// Écouteur sur les onglets pour charger les données à la demande
const changerOnglet = (onglet) => {
  ongletActif.value = onglet
  if (onglet === 'commandes' && listeCommandes.value.length === 0) chargerCommandes()
  if (onglet === 'utilisateurs' && listeUtilisateurs.value.length === 0) chargerUtilisateurs()
}
</script>

<template>
  <div class="panneau-admin-container">
    <div class="en-tete-admin">
      <h2>Console d'Administration</h2>
      <div class="selecteur-onglets">
        <button :class="{ actif: ongletActif === 'commandes' }" @click="changerOnglet('commandes')">Commandes</button>
        <button :class="{ actif: ongletActif === 'utilisateurs' }" @click="changerOnglet('utilisateurs')">Utilisateurs</button>
      </div>
    </div>

    <div v-if="chargement" class="indicateur-chargement">Extraction des données en cours...</div>

    <div v-if="!chargement && ongletActif === 'commandes'" class="contenu-onglet">
      <div class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Mode de Récupération</th>
              <th>Total</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cmd in listeCommandes" :key="cmd.id">
              <td>{{ formaterDate(cmd.created_at) }}</td>
              <td class="cellule-forte">{{ cmd.nom_client }}</td>
              <td>{{ cmd.mode_recuperation }}</td>
              <td class="cellule-prix">{{ cmd.total_general }} €</td>
              <td><span class="badge-statut">{{ cmd.statut }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!chargement && ongletActif === 'utilisateurs'" class="contenu-onglet">
      <div class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Nom complet</th>
              <th>Rôle système</th>
              <th>Action / Sauvegarde</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in listeUtilisateurs" :key="user.id">
              <td>
                <input type="text" v-model="user.nom" class="input-admin" />
              </td>
              <td>
                <select v-model="user.role" class="input-admin">
                  <option value="client">Client</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
              <td>
                <button class="bouton-sauvegarder" @click="mettreAJourProfil(user.id, 'nom', user.nom); mettreAJourProfil(user.id, 'role', user.role)">
                  Appliquer les modifications
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panneau-admin-container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.en-tete-admin {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.en-tete-admin h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: #1a1d20;
  margin: 0;
}

.selecteur-onglets {
  display: flex;
  gap: 12px;
  background: #f4f6f8;
  padding: 6px;
  border-radius: 12px;
  width: fit-content;
}

.selecteur-onglets button {
  padding: 10px 24px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: #6b7b8c;
  cursor: pointer;
  transition: all 0.2s;
}

.selecteur-onglets button.actif {
  background: #ffffff;
  color: #1a1d20;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

.table-premium {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-family: 'Inter', sans-serif;
}

.table-premium th {
  background: #f8fafc;
  padding: 16px 20px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7b8c;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.table-premium td {
  padding: 20px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  font-size: 0.95rem;
  color: #1a1d20;
  vertical-align: middle;
}

.table-premium tr:last-child td { border-bottom: none; }

.cellule-forte { font-weight: 600; }
.cellule-prix { font-weight: 800; color: #2b4c40; }

.badge-statut {
  background: #e6f4ea;
  color: #1e8e3e;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
}

.input-admin {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
}

.bouton-sauvegarder {
  background: #2b4c40;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.bouton-sauvegarder:active { opacity: 0.8; }
</style>