<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../utils/supabaseClient'
import { t } from '../utils/i18n'

const route = useRoute()

const rechercheId = ref('')
const commandeTrouvee = ref(null)
const historiqueCommandes = ref([])
const chargement = ref(false)
const messageRecherche = ref('')

// Avis clients refs
const noteAvis = ref(5)
const commentaireAvis = ref('')
const avisSoumis = ref(false)

// Canal Realtime
let canalSuivi = null

const brancherNotificationReel = (uuid) => {
  if (canalSuivi) {
    supabase.removeChannel(canalSuivi)
  }
  
  if (typeof window !== 'undefined' && 'Notification' in window) {
    Notification.requestPermission()
  }

  canalSuivi = supabase
    .channel(`suivi-${uuid}`)
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'commandes', 
      filter: `id=eq.${uuid}` 
    }, payload => {
      if (payload.new) {
        const ancienStatut = commandeTrouvee.value?.statut
        const nouveauStatut = payload.new.statut
        
        commandeTrouvee.value = payload.new
        
        if (ancienStatut && ancienStatut !== nouveauStatut) {
          alert(`🔔 Statut mis à jour : Votre commande est maintenant "${nouveauStatut}" !`)
          if (Notification.permission === 'granted') {
            new Notification("Ma Boutique Locale 🧺", {
              body: `Le statut de votre commande a changé : ${nouveauStatut}`
            })
          }
        }
      }
    })
    .subscribe()
}

onUnmounted(() => {
  if (canalSuivi) {
    supabase.removeChannel(canalSuivi)
  }
})

const chargerHistorique = async () => {
  const ids = JSON.parse(localStorage.getItem('app-commandes') || '[]')
  if (ids.length === 0) return

  chargement.value = true
  try {
    const { data, error } = await supabase
      .from('commandes')
      .select('id, created_at, total_general, statut, nom_client')
      .in('id', ids)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    historiqueCommandes.value = data || []
  } catch (err) {
    console.error("Erreur de chargement de l'historique :", err)
  } finally {
    chargement.value = false
  }
}

const rechercherCommande = async (idCible) => {
  const idStr = idCible || rechercheId.value.trim()
  if (!idStr) return

  chargement.value = true
  commandeTrouvee.value = null
  messageRecherche.value = ''
  avisSoumis.value = false
  commentaireAvis.value = ''

  try {
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', idStr)
      .single()

    if (error || !data) {
      messageRecherche.value = "Aucune commande trouvée avec cet identifiant."
    } else {
      commandeTrouvee.value = data
      rechercheId.value = idStr
      brancherNotificationReel(idStr)
    }
  } catch (err) {
    messageRecherche.value = "Identifiant invalide ou erreur réseau."
    console.error(err)
  } finally {
    chargement.value = false
  }
}

const soumettreAvis = async () => {
  if (!commentaireAvis.value.trim()) {
    alert("Veuillez saisir votre avis.")
    return
  }
  try {
    const { error } = await supabase
      .from('avis_clients')
      .insert([{
        commande_id: commandeTrouvee.value.id,
        nom_client: commandeTrouvee.value.nom_client,
        note: noteAvis.value,
        commentaire: commentaireAvis.value
      }])
    
    if (error) throw error
    avisSoumis.value = true
    alert("✨ Merci pour votre avis précieux !")
  } catch (e) {
    console.error("Erreur d'insertion d'avis:", e.message)
    alert("Impossible d'enregistrer l'avis pour le moment.")
  }
}

const imprimerRecu = () => {
  window.print()
}

// Extraire l'objet de métadonnées du détails panier
const metadataCommande = computed(() => {
  if (!commandeTrouvee.value?.details_panier) return null
  return commandeTrouvee.value.details_panier.find(x => x.typeElement === 'metadata')
})

onMounted(() => {
  chargerHistorique()
  if (route.query.id) {
    rechercherCommande(route.query.id)
  }
})

const formaterDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getEtapeIndex = (statut) => {
  if (statut === 'En préparation') return 2
  if (statut === 'Validée') return 3
  if (statut === 'Annulée') return -1
  return 1
}
</script>

<template>
  <div class="suivi-view">
    <!-- EN-TÊTE -->
    <div class="header-suivi">
      <span class="tagline-suivi">✨ TRANSPARENCE & QUALITÉ ✨</span>
      <h2>Suivi de votre Commande</h2>
      <p class="desc-suivi">Consultez en temps réel l'avancement de votre prestation traiteur et la préparation de vos équipements.</p>
    </div>

    <!-- RECHERCHE DE COMMANDE -->
    <div class="boite-recherche-suivi">
      <label>Rechercher par identifiant de commande (UUID) :</label>
      <div class="barre-recherche-suivi">
        <input 
          type="text" 
          v-model="rechercheId" 
          placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000" 
          class="input-suivi"
        />
        <button @click="rechercherCommande()" class="btn-recherche-suivi" :disabled="chargement">
          {{ chargement ? 'Recherche...' : 'Rechercher' }}
        </button>
      </div>
      <p v-if="messageRecherche" class="erreur-recherche">{{ messageRecherche }}</p>
    </div>

    <!-- CORPS DU SUIVI -->
    <div class="corps-suivi">
      
      <!-- COMMANDE TROUVÉE (VISUAL TIMELINE) -->
      <div v-if="commandeTrouvee" class="details-commande-suivi animate-fade">
        
        <div class="en-tete-fiche">
          <div class="ref-commande">
            <h3>Commande</h3>
            <span class="uuid-label">{{ commandeTrouvee.id }}</span>
          </div>
          <span class="date-fiche">📅 {{ formaterDate(commandeTrouvee.created_at) }}</span>
        </div>

        <!-- TIMELINE VISUELLE -->
        <div class="timeline-container" v-if="getEtapeIndex(commandeTrouvee.statut) !== -1">
          <div class="barre-progression">
            <div 
              class="barre-remplie" 
              :style="{ width: ((getEtapeIndex(commandeTrouvee.statut) - 1) / 2 * 100) + '%' }"
            ></div>
          </div>
          
          <div class="etapes-timeline">
            <!-- Etape 1 -->
            <div class="etape-timeline" :class="{ active: getEtapeIndex(commandeTrouvee.statut) >= 1 }">
              <div class="pastille-etape">📝</div>
              <span class="titre">En attente</span>
              <span class="desc">Votre commande est reçue et en attente de validation</span>
            </div>
            
            <!-- Etape 2 -->
            <div class="etape-timeline" :class="{ active: getEtapeIndex(commandeTrouvee.statut) >= 2 }">
              <div class="pastille-etape">👩‍🍳</div>
              <span class="titre">En préparation</span>
              <span class="desc">Les plats mijotent et le matériel est en cours de préparation</span>
            </div>
            
            <!-- Etape 3 -->
            <div class="etape-timeline" :class="{ active: getEtapeIndex(commandeTrouvee.statut) >= 3 }">
              <div class="pastille-etape">🚚</div>
              <span class="titre">Validée / Prête</span>
              <span class="desc">Commande prête pour le retrait ou en cours de livraison</span>
            </div>
          </div>
        </div>

        <!-- CAS COMMANDE ANNULÉE -->
        <div v-else class="commande-annulee-alerte">
          🚫 Cette commande a été annulée. N'hésitez pas à nous contacter sur WhatsApp en cas de question.
        </div>

        <div class="recap-fiche">
          <div class="fiche-recap-header-imprimer" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="margin: 0;">Récapitulatif des prestations</h4>
            <button @click="imprimerRecu" class="btn-imprimer-suivi" style="background: transparent; border: 1px solid var(--accent-gold); color: var(--accent-gold-dark); padding: 6px 14px; border-radius: 99px; font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              📥 Imprimer le reçu (PDF)
            </button>
          </div>
          
          <div class="fiche-client-info">
            <p><strong>Client :</strong> {{ commandeTrouvee.nom_client }}</p>
            <p><strong>Récupération :</strong> {{ commandeTrouvee.mode_recuperation }}</p>
            <p><strong>Date prévue :</strong> {{ formaterDate(commandeTrouvee.date_commande).split(' ')[0] }}</p>
            <p v-if="metadataCommande?.parrain"><strong>Parrain :</strong> {{ metadataCommande.parrain }}</p>
            <p v-if="metadataCommande?.garantieCasse"><strong>Garantie Casse :</strong> Active (Tranquillité)</p>
            <p v-if="metadataCommande?.serviceMontage"><strong>Montage :</strong> Inclus</p>
            <p v-if="metadataCommande?.serviceServeurs"><strong>Personnel :</strong> {{ metadataCommande.serviceServeurs }}</p>
          </div>
          
          <hr class="fiche-separateur" />

          <ul class="fiche-articles-liste">
            <li v-for="item in commandeTrouvee.details_panier.filter(x => x.typeElement !== 'metadata')" :key="item.titre" class="fiche-article-item">
              <div class="titre-bloc">
                <span class="titre">{{ item.quantite }}x {{ item.titre }}</span>
                <span class="dates" v-if="item.dateDebut">
                  ({{ formaterDate(item.dateDebut).split(' ')[0] }} à {{ formaterDate(item.dateFin).split(' ')[0] }})
                </span>
              </div>
              <span class="prix">{{ (item.prix * item.quantite).toFixed(2) }} €</span>
            </li>
          </ul>

          <div class="fiche-total">
            <span>Montant total :</span>
            <span class="val">{{ commandeTrouvee.total_general.toFixed(2) }} €</span>
          </div>
          
          <div class="fiche-total" v-if="metadataCommande?.cautionCalculee > 0" style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); border-top: 1px dashed var(--border-subtile); margin-top: 8px; padding-top: 8px;">
            <span>Caution requise (remboursable) :</span>
            <span>{{ metadataCommande.cautionCalculee }} €</span>
          </div>
        </div>

        <!-- FORMULAIRE D'AVIS CLIENT -->
        <div v-if="commandeTrouvee.statut === 'Validée'" class="avis-section-suivi" style="margin-top: 30px; border-top: 1px solid var(--border-subtile); padding-top: 24px;">
          <h4 style="font-family: 'Playfair Display', serif; font-size: 1.15rem; margin: 0 0 6px 0;">✨ Votre avis nous intéresse !</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 16px 0;">
            Votre prestation est terminée. Partagez votre expérience et aidez-nous à nous améliorer.
          </p>
          
          <div v-if="avisSoumis" class="avis-soumis-succes" style="background: var(--accent-green-light); color: var(--accent-green); border: 1px solid var(--accent-green); border-radius: 12px; padding: 14px; text-align: center; font-weight: 600; font-size: 0.85rem;">
            🌟 Merci ! Votre avis précieux a bien été enregistré.
          </div>
          <div v-else class="formulaire-avis" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="selection-note" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">Note :</span>
              <div class="etoiles-choix" style="display: flex; gap: 4px;">
                <button 
                  v-for="n in 5" 
                  :key="n" 
                  @click="noteAvis = n" 
                  style="background: transparent; border: none; font-size: 1.3rem; cursor: pointer; padding: 0;"
                >
                  {{ n <= noteAvis ? '★' : '☆' }}
                </button>
              </div>
            </div>
            
            <div class="champ-texte-avis" style="display: flex; flex-direction: column; gap: 6px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">Commentaire :</label>
              <textarea 
                v-model="commentaireAvis" 
                placeholder="Ex: Prestation d'exception, matériel très propre et buffet traiteur raffiné !" 
                style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-subtile); font-family: 'Inter', sans-serif; font-size: 0.85rem; background: var(--bg-app); color: var(--text-primary); min-height: 80px; resize: vertical; outline: none;"
              ></textarea>
            </div>
            
            <button @click="soumettreAvis" class="btn-soumettre-avis" style="background: var(--accent-green); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; align-self: flex-end; transition: opacity 0.2s;">
              Envoyer l'avis
            </button>
          </div>
        </div>
      </div>

      <!-- HISTORIQUE LOCAL DE COMMANDES -->
      <div v-if="historiqueCommandes.length > 0" class="historique-suivi">
        <h3>Vos commandes récentes</h3>
        <p class="soustitre-hist">Cliquez sur une commande pour afficher son statut en temps réel.</p>
        
        <div class="liste-historique">
          <div 
            v-for="cmd in historiqueCommandes" 
            :key="cmd.id" 
            class="carte-historique"
            :class="{ selectionnee: commandeTrouvee?.id === cmd.id }"
            @click="rechercherCommande(cmd.id)"
          >
            <div class="gauche">
              <span class="nom-client">{{ cmd.nom_client }}</span>
              <span class="date">{{ formaterDate(cmd.created_at).split(' ')[0] }}</span>
            </div>
            <div class="droite">
              <span class="prix">{{ cmd.total_general.toFixed(2) }} €</span>
              <span class="badge-statut" :class="cmd.statut?.toLowerCase().replace(/\s+/g, '-')">
                {{ cmd.statut || 'En attente' }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.suivi-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 10px 80px;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-suivi {
  text-align: center;
  margin-bottom: 40px;
}
.tagline-suivi {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-gold-dark);
  letter-spacing: 2px;
  display: block;
  margin-bottom: 8px;
}
.header-suivi h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 10px;
}
.desc-suivi {
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 550px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Boite de recherche */
.boite-recherche-suivi {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 40px;
  box-shadow: var(--shadow-douce);
}
.boite-recherche-suivi label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.barre-recherche-suivi {
  display: flex;
  gap: 12px;
}
.input-suivi {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}
.input-suivi:focus {
  border-color: var(--accent-gold);
}
.btn-recherche-suivi {
  background: var(--accent-green);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-recherche-suivi:hover {
  background: #1e362e;
}
.erreur-recherche {
  margin: 10px 0 0;
  color: #c53030;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Timeline visuelle */
.details-commande-suivi {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 24px;
  padding: 30px;
  margin-bottom: 40px;
  box-shadow: var(--shadow-douce);
}
.en-tete-fiche {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 14px;
}
.ref-commande h3 {
  margin: 0 0 6px;
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: var(--text-primary);
}
.uuid-label {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-secondary);
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 4px;
}
.date-fiche {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Barre de progression */
.timeline-container {
  position: relative;
  margin-bottom: 40px;
  padding: 20px 0;
}
.barre-progression {
  position: absolute;
  top: 40px;
  left: 10%;
  width: 80%;
  height: 4px;
  background: var(--border-subtile);
  z-index: 1;
}
.barre-remplie {
  height: 100%;
  background: var(--accent-green);
  transition: width 0.5s ease;
}
.etapes-timeline {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}
.etape-timeline {
  width: 28%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.pastille-etape {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-carte);
  border: 3px solid var(--border-subtile);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-douce);
  transition: all 0.3s;
}
.etape-timeline.active .pastille-etape {
  border-color: var(--accent-green);
  background: var(--accent-green-light);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.2);
}
.etape-timeline .titre {
  margin-top: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}
.etape-timeline.active .titre {
  color: var(--text-primary);
}
.etape-timeline .desc {
  margin-top: 6px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Alerte annulation */
.commande-annulee-alerte {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  border-radius: 14px;
  padding: 16px;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 30px;
}

/* Récapitulatif Fiche */
.recap-fiche {
  background: var(--bg-app);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-subtile);
}
.recap-fiche h4 {
  margin: 0 0 14px;
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  color: var(--text-primary);
}
.fiche-client-info p {
  margin: 6px 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.fiche-separateur {
  border: none;
  border-top: 1px dashed var(--border-subtile);
  margin: 16px 0;
}
.fiche-articles-liste {
  list-style: none;
  padding: 0;
  margin: 0;
}
.fiche-article-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.85rem;
}
.fiche-article-item .titre-bloc {
  display: flex;
  flex-direction: column;
}
.fiche-article-item .titre {
  font-weight: 600;
  color: var(--text-primary);
}
.fiche-article-item .dates {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}
.fiche-article-item .prix {
  font-weight: 700;
  color: var(--text-primary);
}
.fiche-total {
  border-top: 1px solid var(--border-subtile);
  padding-top: 14px;
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
}
.fiche-total .val {
  color: var(--accent-green);
}

/* Historique local */
.historique-suivi {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 24px;
  padding: 30px;
  box-shadow: var(--shadow-douce);
}
.historique-suivi h3 {
  margin: 0 0 6px;
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem;
  color: var(--text-primary);
}
.soustitre-hist {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 20px;
}
.liste-historique {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.carte-historique {
  border: 1px solid var(--border-subtile);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  background: var(--bg-carte);
}
.carte-historique:hover {
  border-color: var(--accent-gold);
  background: var(--accent-gold-light);
}
.carte-historique.selectionnee {
  border-color: var(--accent-green);
  background: var(--accent-green-light);
}
.carte-historique .gauche {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.carte-historique .nom-client {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
}
.carte-historique .date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.carte-historique .droite {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.carte-historique .prix {
  font-weight: 800;
  color: var(--accent-green);
  font-size: 0.95rem;
}

/* Badges statut pour historique */
.badge-statut {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 99px;
  text-transform: uppercase;
}
.badge-statut.en-attente { background: #f3e8ff; color: #7e22ce; }
.badge-statut.en-préparation { background: #fff7ed; color: #ea580c; }
.badge-statut.validée { background: #e6f4ea; color: #1e8e3e; }
.badge-statut.annulée { background: #ffebee; color: #c62828; }

@media (max-width: 600px) {
  .en-tete-fiche { flex-direction: column; align-items: flex-start; gap: 8px; }
  .barre-progression { display: none; }
  .etapes-timeline { flex-direction: column; gap: 20px; align-items: flex-start; }
  .etape-timeline { width: 100%; flex-direction: row; gap: 16px; text-align: left; }
  .etape-timeline .titre { margin-top: 0; }
  .etape-timeline .desc { margin-top: 2px; }
  .barre-recherche-suivi { flex-direction: column; }
}

@media print {
  body * {
    visibility: hidden;
  }
  .suivi-view, .recap-fiche, .recap-fiche * {
    visibility: visible;
  }
  .recap-fiche {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
    margin: 0;
  }
  .btn-imprimer-suivi, .boite-recherche-suivi, .header-suivi, .timeline-container, .historique-suivi, .avis-section-suivi {
    display: none !important;
  }
}
</style>
