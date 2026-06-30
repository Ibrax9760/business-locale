<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'
import { t } from '../utils/i18n'

const props = defineProps({
  menuBuilderOuvert: Boolean
})

const emit = defineEmits(['close-menu-builder', 'ajouter-au-panier'])

const etape = ref(1) // 1: Entrées, 2: Plats, 3: Desserts, 4: Récapitulatif
const platsDisponibles = ref([])
const chargement = ref(true)

// Produits sélectionnés par le client
const entreesSelectionnees = ref([])
const platsSelectionnes = ref([])
const dessertsSelectionnes = ref([])

onMounted(async () => {
  chargement.value = true
  try {
    const { data, error } = await supabase
      .from('produits_gastronomie')
      .select('*')
      .eq('disponible', true)
    
    if (error) throw error
    
    // Assigner par défaut la première variante de chaque plat
    platsDisponibles.value = data ? data.map(item => ({
      ...item,
      varianteChoisie: item.variantes && item.variantes[0] ? item.variantes[0] : { nom: 'Format Unique', prix: 10 }
    })) : []
  } catch (err) {
    console.error("Erreur de chargement des plats :", err)
  } finally {
    chargement.value = false
  }
})

// Séparer les plats disponibles selon leur catégorie
const listeEntrees = computed(() => platsDisponibles.value.filter(p => p.categorie === 'Entrée'))
const listePlats = computed(() => platsDisponibles.value.filter(p => p.categorie === 'Plat'))
const listeDesserts = computed(() => platsDisponibles.value.filter(p => p.categorie === 'Dessert'))

// Gestion de la sélection (bascule d'un article)
const basculerSelection = (article, listeRefOrArr) => {
  const list = Array.isArray(listeRefOrArr) ? listeRefOrArr : (listeRefOrArr?.value || [])
  const index = list.findIndex(item => item.id === article.id)
  if (index === -1) {
    list.push({ ...article, quantiteMenu: 1 })
  } else {
    list.splice(index, 1)
  }
}

const estSelectionne = (article, listeRefOrArr) => {
  const list = Array.isArray(listeRefOrArr) ? listeRefOrArr : (listeRefOrArr?.value || [])
  return list.some(item => item.id === article.id)
}

// Calculs financiers
const totalMenuUnitaire = computed(() => {
  const totEntrees = entreesSelectionnees.value.reduce((sum, item) => sum + (item.varianteChoisie.prix * item.quantiteMenu), 0)
  const totPlats = platsSelectionnes.value.reduce((sum, item) => sum + (item.varianteChoisie.prix * item.quantiteMenu), 0)
  const totDesserts = dessertsSelectionnes.value.reduce((sum, item) => sum + (item.varianteChoisie.prix * item.quantiteMenu), 0)
  return totEntrees + totPlats + totDesserts
})

const etapeSuivante = () => {
  if (etape.value < 4) etape.value++
}
const etapePrecedente = () => {
  if (etape.value > 1) etape.value--
}

// Ajout groupé au panier
const ajouterToutAuPanier = () => {
  const tousLesArticles = [
    ...entreesSelectionnees.value,
    ...platsSelectionnes.value,
    ...dessertsSelectionnes.value
  ]
  
  if (tousLesArticles.length === 0) {
    alert("Veuillez sélectionner au moins un article.")
    return
  }
  
  // Emettre l'ajout individuellement pour chaque article du menu sur mesure
  tousLesArticles.forEach(item => {
    const payload = {
      id: item.id,
      titre: `[Menu Custom] ${item.titre}`,
      varianteChoisie: item.varianteChoisie
    }
    for (let i = 0; i < item.quantiteMenu; i++) {
      emit('ajouter-au-panier', payload, true)
    }
  })

  // Redirection/Redémarrage de l'état
  entreesSelectionnees.value = []
  platsSelectionnes.value = []
  dessertsSelectionnes.value = []
  etape.value = 1
  
  emit('close-menu-builder')
}
</script>

<template>
  <div class="tiroir-menu-builder">
    <transition name="fade-overlay">
      <div v-if="menuBuilderOuvert" class="calque-builder" @click="emit('close-menu-builder')"></div>
    </transition>

    <transition name="slide-drawer">
      <div v-if="menuBuilderOuvert" class="contenu-tiroir-builder">
        <!-- EN-TÊTE -->
        <div class="en-tete-builder">
          <div class="titre-et-fermer">
            <h2>🍳 Menu Guidé Pas-à-Pas</h2>
            <button @click="emit('close-menu-builder')" class="bouton-fermer-tiroir" aria-label="Fermer">✖</button>
          </div>
          <p class="desc-builder">Composez votre repas de fête pas-à-pas en associant nos spécialités culinaires prestigieuses.</p>
          
          <!-- Barre d'étapes (Fil d'Ariane) -->
          <div class="fil-etapes">
            <div class="etape-bulle" :class="{ active: etape >= 1 }">
              <span class="num">1</span>
              <span class="nom">Entrées</span>
            </div>
            <div class="barre-liaison" :class="{ active: etape >= 2 }"></div>
            <div class="etape-bulle" :class="{ active: etape >= 2 }">
              <span class="num">2</span>
              <span class="nom">Plats</span>
            </div>
            <div class="barre-liaison" :class="{ active: etape >= 3 }"></div>
            <div class="etape-bulle" :class="{ active: etape >= 3 }">
              <span class="num">3</span>
              <span class="nom">Desserts</span>
            </div>
            <div class="barre-liaison" :class="{ active: etape >= 4 }"></div>
            <div class="etape-bulle" :class="{ active: etape >= 4 }">
              <span class="num">4</span>
              <span class="nom">Validation</span>
            </div>
          </div>
        </div>

        <!-- ZONE DE CONTENU DÉFILANT -->
        <div class="corps-builder-scroll">
          <!-- SQUELETTE DE CHARGEMENT -->
          <div v-if="chargement" class="chargement-builder">
            <div class="skeleton-card pulsing" v-for="n in 3" :key="n"></div>
          </div>

          <!-- ÉTAPES DE SÉLECTION -->
          <div v-else>
            <!-- ÉTAPE 1 : ENTRÉES -->
            <div v-if="etape === 1" class="etape-section animate-fade">
              <h3 class="titre-etape">🥢 Les Entrées Précieuses</h3>
              <p class="soustitre-etape">Sélectionnez vos entrées froides ou chaudes pour éveiller les papilles.</p>
              
              <div v-if="listeEntrees.length === 0" class="aucun-produit">
                Aucune entrée disponible pour le moment.
              </div>
              <div v-else class="grille-builder">
                <div 
                  v-for="item in listeEntrees" 
                  :key="item.id" 
                  class="carte-builder"
                  :class="{ active: estSelectionne(item, entreesSelectionnees) }"
                  @click="basculerSelection(item, entreesSelectionnees)"
                >
                  <img :src="item.image_url" alt="" class="image-carte-builder" />
                  <div class="carte-builder-details">
                    <h4>{{ item.titre }}</h4>
                    <p class="desc">{{ item.description }}</p>
                    <div class="variante-select" @click.stop>
                      <select v-model="item.varianteChoisie">
                        <option v-for="v in item.variantes" :key="v.nom" :value="v">
                          {{ v.nom }} — {{ v.prix }} €
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="checkbox-coche">✔</div>
                </div>
              </div>
            </div>

            <!-- ÉTAPE 2 : PLATS PRINCIPAUX -->
            <div v-if="etape === 2" class="etape-section animate-fade">
              <h3 class="titre-etape">🥘 Les Plats d'Exception</h3>
              <p class="soustitre-etape">Choisissez les plats chauds locaux et viandes assaisonnées.</p>
              
              <div v-if="listePlats.length === 0" class="aucun-produit">
                Aucun plat principal disponible pour le moment.
              </div>
              <div v-else class="grille-builder">
                <div 
                  v-for="item in listePlats" 
                  :key="item.id" 
                  class="carte-builder"
                  :class="{ active: estSelectionne(item, platsSelectionnes) }"
                  @click="basculerSelection(item, platsSelectionnes)"
                >
                  <img :src="item.image_url" alt="" class="image-carte-builder" />
                  <div class="carte-builder-details">
                    <h4>{{ item.titre }}</h4>
                    <p class="desc">{{ item.description }}</p>
                    <div class="variante-select" @click.stop>
                      <select v-model="item.varianteChoisie">
                        <option v-for="v in item.variantes" :key="v.nom" :value="v">
                          {{ v.nom }} — {{ v.prix }} €
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="checkbox-coche">✔</div>
                </div>
              </div>
            </div>

            <!-- ÉTAPE 3 : DESSERTS -->
            <div v-if="etape === 3" class="etape-section animate-fade">
              <h3 class="titre-etape">🍰 Les Douceurs Sucrées</h3>
              <p class="soustitre-etape">Complétez avec nos gâteaux raffinés et touches fruitées.</p>
              
              <div v-if="listeDesserts.length === 0" class="aucun-produit">
                Aucun dessert disponible pour le moment.
              </div>
              <div v-else class="grille-builder">
                <div 
                  v-for="item in listeDesserts" 
                  :key="item.id" 
                  class="carte-builder"
                  :class="{ active: estSelectionne(item, dessertsSelectionnes) }"
                  @click="basculerSelection(item, dessertsSelectionnes)"
                >
                  <img :src="item.image_url" alt="" class="image-carte-builder" />
                  <div class="carte-builder-details">
                    <h4>{{ item.titre }}</h4>
                    <p class="desc">{{ item.description }}</p>
                    <div class="variante-select" @click.stop>
                      <select v-model="item.varianteChoisie">
                        <option v-for="v in item.variantes" :key="v.nom" :value="v">
                          {{ v.nom }} — {{ v.prix }} €
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="checkbox-coche">✔</div>
                </div>
              </div>
            </div>

            <!-- ÉTAPE 4 : VALIDATION & QUANTITÉS -->
            <div v-if="etape === 4" class="etape-section validation-section animate-fade">
              <h3 class="titre-etape">🔍 Finalisez votre Menu</h3>
              <p class="soustitre-etape">Ajustez les parts et validez l'importation vers votre panier.</p>
              
              <div class="recap-table-premium">
                <!-- ENTRÉES -->
                <div class="categorie-bloc-recap" v-if="entreesSelectionnees.length > 0">
                  <span class="label-cat">Entrées</span>
                  <div class="ligne-recap" v-for="item in entreesSelectionnees" :key="item.id">
                    <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                    <div class="actions-quantite">
                      <button @click="item.quantiteMenu > 1 ? item.quantiteMenu-- : basculerSelection(item, entreesSelectionnees)">−</button>
                      <span class="qte">{{ item.quantiteMenu }}</span>
                      <button @click="item.quantiteMenu++">+</button>
                    </div>
                    <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
                  </div>
                </div>

                <!-- PLATS -->
                <div class="categorie-bloc-recap" v-if="platsSelectionnes.length > 0">
                  <span class="label-cat">Plats</span>
                  <div class="ligne-recap" v-for="item in platsSelectionnes" :key="item.id">
                    <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                    <div class="actions-quantite">
                      <button @click="item.quantiteMenu > 1 ? item.quantiteMenu-- : basculerSelection(item, platsSelectionnes)">−</button>
                      <span class="qte">{{ item.quantiteMenu }}</span>
                      <button @click="item.quantiteMenu++">+</button>
                    </div>
                    <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
                  </div>
                </div>

                <!-- DESSERTS -->
                <div class="categorie-bloc-recap" v-if="dessertsSelectionnes.length > 0">
                  <span class="label-cat">Desserts</span>
                  <div class="ligne-recap" v-for="item in dessertsSelectionnes" :key="item.id">
                    <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                    <div class="actions-quantite">
                      <button @click="item.quantiteMenu > 1 ? item.quantiteMenu-- : basculerSelection(item, dessertsSelectionnes)">−</button>
                      <span class="qte">{{ item.quantiteMenu }}</span>
                      <button @click="item.quantiteMenu++">+</button>
                    </div>
                    <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
                  </div>
                </div>

                <div class="total-final-menu">
                  <span>Total unitaire du menu :</span>
                  <span class="val">{{ totalMenuUnitaire.toFixed(2) }} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STICKY BARRE DE NAVIGATION EN BAS -->
        <div class="barre-navigation-builder-tiroir">
          <button 
            class="btn-nav-builder precedent" 
            :disabled="etape === 1" 
            @click="etapePrecedente"
          >
            ← Retour
          </button>
          
          <button 
            v-if="etape < 4" 
            class="btn-nav-builder suivant" 
            @click="etapeSuivante"
          >
            Suivant →
          </button>
          
          <button 
            v-else 
            class="btn-nav-builder valider" 
            @click="ajouterToutAuPanier"
          >
            Ajouter au Panier 🧺
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Tiroir Layout */
.tiroir-menu-builder {
  position: relative;
  z-index: 1500;
}
.calque-builder {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(31, 27, 24, 0.45);
  backdrop-filter: blur(8px);
  z-index: 1500;
}
.contenu-tiroir-builder {
  position: fixed;
  top: 0;
  right: 0;
  width: 540px;
  max-width: 100vw;
  height: 100vh;
  background-color: var(--bg-app);
  box-shadow: -10px 0 40px rgba(0,0,0,0.15);
  z-index: 1600;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

/* En-tête */
.en-tete-builder {
  padding: 24px;
  background-color: var(--bg-carte);
  border-bottom: 1px solid var(--border-subtile);
}
.titre-et-fermer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.titre-et-fermer h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  margin: 0;
  color: var(--accent-green);
}
.bouton-fermer-tiroir {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
}
.desc-builder {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

/* Fil d'Ariane */
.fil-etapes {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.etape-bulle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.4;
  transition: all 0.3s ease;
}
.etape-bulle.active {
  opacity: 1;
}
.etape-bulle .num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--text-secondary);
  color: var(--bg-carte);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.75rem;
  transition: background 0.3s;
}
.etape-bulle.active .num {
  background: var(--accent-gold);
}
.etape-bulle .nom {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.barre-liaison {
  flex: 1;
  height: 2px;
  background: var(--border-subtile);
  margin-bottom: 12px;
  transition: background 0.3s;
}
.barre-liaison.active {
  background: var(--accent-gold);
}

/* Corps défilant */
.corps-builder-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Grille & Cartes */
.grille-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.carte-builder {
  position: relative;
  display: flex;
  gap: 16px;
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-douce);
}
.carte-builder:hover {
  transform: translateY(-2px);
  border-color: var(--accent-gold);
}
.carte-builder.active {
  border-color: var(--accent-green);
  background: var(--accent-green-light);
}
.image-carte-builder {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 10px;
}
.carte-builder-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.carte-builder-details h4 {
  font-size: 0.95rem;
  margin: 0 0 4px 0;
  font-weight: 700;
  color: var(--text-primary);
}
.carte-builder-details .desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 8px 0;
}
.variante-select select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-subtile);
  font-size: 0.75rem;
  font-family: 'Inter', sans-serif;
  background: var(--bg-app);
  color: var(--text-primary);
  outline: none;
}

.checkbox-coche {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-green);
  color: #fff;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s;
}
.carte-builder.active .checkbox-coche {
  opacity: 1;
  transform: scale(1);
}

.titre-etape {
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  text-align: center;
}
.soustitre-etape {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 20px 0;
}

/* Sticky Navigation Drawer Bottom */
.barre-navigation-builder-tiroir {
  padding: 16px 24px;
  background: var(--bg-carte);
  border-top: 1px solid var(--border-subtile);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-nav-builder {
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-nav-builder.precedent {
  background: var(--bg-app);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtile);
}
.btn-nav-builder.precedent:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-nav-builder.suivant {
  background: var(--accent-gold);
  color: #fff;
}
.btn-nav-builder.valider {
  background: var(--accent-green);
  color: #fff;
}

/* Recap */
.recap-table-premium {
  background: var(--bg-carte);
  border-radius: 16px;
  border: 1px solid var(--border-subtile);
  padding: 16px;
}
.categorie-bloc-recap {
  margin-bottom: 16px;
}
.label-cat {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent-gold-dark);
  margin-bottom: 8px;
}
.ligne-recap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-subtile);
}
.ligne-recap:last-child {
  border-bottom: none;
}
.ligne-recap .titre {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.8rem;
  flex: 1;
}
.actions-quantite {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px;
}
.actions-quantite button {
  width: 22px;
  height: 22px;
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
.actions-quantite .qte {
  font-weight: 700;
  font-size: 0.8rem;
}
.total-ligne {
  font-weight: 700;
  color: var(--accent-green);
  font-size: 0.85rem;
}
.total-final-menu {
  border-top: 1px solid var(--border-subtile);
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-primary);
}
.total-final-menu .val {
  color: var(--accent-green);
}

.aucun-produit {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.85rem;
}
.skeleton-card {
  height: 100px;
  border-radius: 12px;
  background: var(--accent-gold-light);
  margin-bottom: 12px;
}

/* Transition Animations */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-drawer-enter-from,
.slide-drawer-leave-to {
  transform: translateX(100%);
}

.animate-fade {
  animation: drawerFadeIn 0.3s ease;
}
@keyframes drawerFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .fil-etapes { gap: 2px; }
  .etape-bulle .nom { display: none; }
  .barre-liaison { margin-bottom: 0; }
  .etape-bulle .num { width: 22px; height: 22px; font-size: 0.7rem; }
  .ligne-recap { flex-direction: column; gap: 8px; align-items: flex-start; }
  .actions-quantite { margin: 0; }
  .total-ligne { align-self: flex-end; }
}
</style>
