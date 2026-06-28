<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'

const ongletActif = ref('commandes')
const listeCommandes = ref([])
const listeUtilisateurs = ref([])
const chargement = ref(true)

const modalCommandeOuverte = ref(false)
const modeEditionCommande = ref(false)
const commandeEnEdition = ref(null)

const formulaireCommande = ref({
  nom_client: '',
  mode_recuperation: 'Manuelle (Admin)',
  total_general: 0,
  statut: 'En attente',
  details_panier: []
})

const chargerCommandes = async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    listeCommandes.value = data
  } catch (erreur) { console.error(erreur) } 
  finally { chargement.value = false }
}

const chargerUtilisateurs = async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase.from('profils').select('*').order('date_creation', { ascending: false })
    if (error) throw error
    listeUtilisateurs.value = data
  } catch (erreur) { console.error(erreur) } 
  finally { chargement.value = false }
}

const libererDatesEquipements = async (commande) => {
  if (!commande.details_panier || !Array.isArray(commande.details_panier)) return;
  const equipements = commande.details_panier.filter(item => item.typeElement === 'location');
  for (const eq of equipements) {
    if (eq.idBase && eq.dateDebut && eq.dateFin) {
      await supabase.from('reservations_equipements')
        .delete()
        .match({ equipement_id: eq.idBase, date_debut: eq.dateDebut, date_fin: eq.dateFin });
    }
  }
}

const ouvrirAjoutCommande = () => {
  modeEditionCommande.value = false
  formulaireCommande.value = { nom_client: '', mode_recuperation: 'Saisie Manuelle', total_general: 0, statut: 'En attente', details_panier: [] }
  modalCommandeOuverte.value = true
}

const ouvrirEditionCommande = (commande) => {
  modeEditionCommande.value = true
  commandeEnEdition.value = commande
  formulaireCommande.value = { ...commande } // L'auto-correction a été supprimée (BDD saine)
  modalCommandeOuverte.value = true
}

const sauvegarderCommande = async () => {
  try {
    const { id, created_at, ...payload } = formulaireCommande.value

    if (modeEditionCommande.value) {
      const { error } = await supabase.from('commandes').update(payload).eq('id', commandeEnEdition.value.id)
      if (error) throw error
      if (payload.statut === 'Annulée') await libererDatesEquipements(commandeEnEdition.value)
    } else {
      const { error } = await supabase.from('commandes').insert([payload])
      if (error) throw error
    }
    modalCommandeOuverte.value = false
    await chargerCommandes()
  } catch (erreur) { 
    console.error(erreur)
    alert("Erreur lors de l'enregistrement.")
  }
}

const annulerCommande = async (commande) => {
  if (!confirm(`Annuler la commande de ${commande.nom_client} ?`)) return
  try {
    await libererDatesEquipements(commande)
    await supabase.from('commandes').update({ statut: 'Annulée' }).eq('id', commande.id)
    await chargerCommandes()
  } catch (erreur) { console.error(erreur) }
}

const supprimerCommande = async (commande) => {
  if (!confirm(`⚠️ SUPPRESSION DÉFINITIVE : Effacer la commande de ${commande.nom_client} ?`)) return
  try {
    await libererDatesEquipements(commande)
    await supabase.from('commandes').delete().eq('id', commande.id)
    await chargerCommandes()
  } catch (erreur) { console.error(erreur) }
}

const mettreAJourProfil = async (id, champ, nouvelleValeur) => {
  try {
    const { error } = await supabase.from('profils').update({ [champ]: nouvelleValeur }).eq('id', id)
    if (error) throw error
    alert('Mise à jour effectuée avec succès.')
  } catch (erreur) { alert("Échec de la modification.") }
}

const formaterDate = (chaineDate) => {
  if (!chaineDate) return '';
  const dateObj = new Date(chaineDate);
  return isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(dateObj);
};

// MATRICE COULEURS STRICTE
const getCouleurStatut = (statut) => {
  if (statut === 'Validée') return 'badge-succes'
  if (statut === 'Annulée') return 'badge-erreur'
  if (statut === 'En préparation') return 'badge-preparation'
  return 'badge-attente'
}

onMounted(() => { chargerCommandes() })

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
      <div class="barre-actions">
        <button class="bouton-action principal" @click="ouvrirAjoutCommande">+ Créer une commande manuelle</button>
      </div>
      
      <div class="table-responsive">
        <table class="table-premium">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cmd in listeCommandes" :key="cmd.id">
              <td>{{ formaterDate(cmd.created_at) }}</td>
              <td class="cellule-forte">{{ cmd.nom_client }}</td>
              <td class="cellule-prix">{{ cmd.total_general }} €</td>
              <td><span class="badge-statut" :class="getCouleurStatut(cmd.statut)">{{ cmd.statut || 'En attente' }}</span></td>
              <td class="cellule-actions">
                <button @click="ouvrirEditionCommande(cmd)" class="btn-icone">✏️</button>
                <button v-if="cmd.statut !== 'Annulée'" @click="annulerCommande(cmd)" class="btn-icone" title="Annuler">🚫</button>
                <button @click="supprimerCommande(cmd)" class="btn-icone danger" title="Supprimer définitivement">🗑️</button>
              </td>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in listeUtilisateurs" :key="user.id">
              <td><input type="text" v-model="user.nom" class="input-admin" /></td>
              <td>
                <select v-model="user.role" class="input-admin">
                  <option value="client">Client</option>
                  <option value="vendeur">Vendeur</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
              <td>
                <button class="bouton-sauvegarder" @click="mettreAJourProfil(user.id, 'nom', user.nom); mettreAJourProfil(user.id, 'role', user.role)">
                  Appliquer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalCommandeOuverte" class="modal-overlay" @click.self="modalCommandeOuverte = false">
      <div class="modal-auth">
        <button class="bouton-fermer-auth" @click="modalCommandeOuverte = false">✖</button>
        <h2>{{ modeEditionCommande ? 'Éditer la commande' : 'Nouvelle commande' }}</h2>
        
        <form @submit.prevent="sauvegarderCommande">
          <div class="groupe-champ">
            <label>Nom du client</label>
            <input type="text" v-model="formulaireCommande.nom_client" required />
          </div>
          <div class="groupe-champ">
            <label>Mode de récupération</label>
            <input type="text" v-model="formulaireCommande.mode_recuperation" required />
          </div>
          <div class="groupe-champ">
            <label>Total Général (€)</label>
            <input type="number" step="0.01" v-model="formulaireCommande.total_general" required />
          </div>
          <div class="groupe-champ">
            <label>Statut</label>
            <select v-model="formulaireCommande.statut" class="input-admin">
              <option value="En attente">En attente</option>
              <option value="En préparation">En préparation</option>
              <option value="Validée">Validée</option>
              <option value="Annulée">Annulée</option>
            </select>
          </div>
          
          <button type="submit" class="bouton-valider-auth">Enregistrer</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panneau-admin-container { max-width: 1200px; margin: 40px auto; padding: 0 20px; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.en-tete-admin { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
.en-tete-admin h2 { font-family: 'Playfair Display', serif; font-size: 2rem; color: #1a1d20; margin: 0; }
.selecteur-onglets { display: flex; gap: 12px; background: #f4f6f8; padding: 6px; border-radius: 12px; width: fit-content; }
.selecteur-onglets button { padding: 10px 24px; border: none; background: transparent; border-radius: 8px; font-family: 'Inter', sans-serif; font-weight: 600; color: #6b7b8c; cursor: pointer; transition: all 0.2s; }
.selecteur-onglets button.actif { background: #ffffff; color: #1a1d20; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.barre-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }
.bouton-action { padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; font-family: 'Inter', sans-serif; }
.bouton-action.principal { background: #1a1d20; color: white; }

.table-responsive { width: 100%; overflow-x: auto; background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.table-premium { width: 100%; border-collapse: collapse; text-align: left; font-family: 'Inter', sans-serif; }
.table-premium th { background: #f8fafc; padding: 16px 20px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7b8c; border-bottom: 1px solid rgba(0,0,0,0.05); }
.table-premium td { padding: 20px; border-bottom: 1px solid rgba(0,0,0,0.03); font-size: 0.95rem; color: #1a1d20; vertical-align: middle; }
.cellule-forte { font-weight: 600; }
.cellule-prix { font-weight: 800; color: #2b4c40; }
.cellule-actions { display: flex; gap: 8px; }

.btn-icone { background: #f4f6f8; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.btn-icone:hover { background: #e2e8f0; }
.btn-icone.danger:hover { background: #ffebee; }

.badge-statut { padding: 6px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; display: inline-block; white-space: nowrap; }
.badge-attente { background: #f3e8ff; color: #7e22ce; }       /* Violet */
.badge-preparation { background: #fff7ed; color: #ea580c; }   /* Orange */
.badge-succes { background: #e6f4ea; color: #1e8e3e; }        /* Vert */
.badge-erreur { background: #ffebee; color: #c62828; }        /* Rouge */

.input-admin { width: 100%; padding: 10px; border: 1px solid #d1d9e0; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
.bouton-sauvegarder { background: #2b4c40; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }

.modal-overlay { position: fixed; inset: 0; background: rgba(15, 20, 25, 0.65); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px; }
.modal-auth { background: #ffffff; width: 100%; max-width: 400px; border-radius: 24px; padding: 32px; position: relative; box-shadow: 0 24px 60px rgba(0,0,0,0.2); }
.bouton-fermer-auth { position: absolute; top: 20px; right: 20px; background: #f4f6f8; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
.modal-auth h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin: 0 0 20px 0; }
.groupe-champ { margin-bottom: 16px; }
.groupe-champ label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: #4a5568; }
.groupe-champ input, .groupe-champ select { width: 100%; padding: 12px; border: 1px solid #d1d9e0; border-radius: 12px; font-size: 1rem; }
.bouton-valider-auth { width: 100%; padding: 14px; margin-top: 10px; border-radius: 14px; background: #3b302a; color: #ffffff; font-weight: 700; border: none; cursor: pointer; }
</style>