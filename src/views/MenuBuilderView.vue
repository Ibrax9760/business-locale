<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../utils/supabaseClient'
import { t } from '../utils/i18n'

const emit = defineEmits(['ajouter-au-panier', 'afficher-notification'])
const router = useRouter()

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
const basculerSelection = (article, listeRef) => {
  const index = listeRef.value.findIndex(item => item.id === article.id)
  if (index === -1) {
    listeRef.value.push({ ...article, quantiteMenu: 1 })
  } else {
    listeRef.value.splice(index, 1)
  }
}

const estSelectionne = (article, listeRef) => {
  return listeRef.value.some(item => item.id === article.id)
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
    // Adapter la structure pour correspondre à ajouterAuPanier
    const payload = {
      id: item.id,
      titre: `[Menu Custom] ${item.titre}`,
      varianteChoisie: item.varianteChoisie
    }
    // Emettre l'action d'ajout
    for (let i = 0; i < item.quantiteMenu; i++) {
      emit('ajouter-au-panier', payload, true)
    }
  })

  // Notification de succès et redirection
  router.push('/')
}
</script>

<template>
  <div class="menu-builder-view">
    <!-- TITRE ET PROGRESSION -->
    <div class="header-builder">
      <span class="tagline-builder">✨ SERVICE SUR MESURE ✨</span>
      <h2>{{ t('brand_title') }}</h2>
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

    <!-- SQUELETTE DE CHARGEMENT -->
    <div v-if="chargement" class="chargement-builder">
      <div class="skeleton-card pulsing" v-for="n in 3" :key="n"></div>
    </div>

    <!-- ETAPES DE SÉLECTION -->
    <div v-else class="corps-builder">
      
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
        <h3 class="titre-etape">🔍 Finalisez votre Menu Custom</h3>
        <p class="soustitre-etape">Ajustez les parts et validez l'importation vers votre panier.</p>
        
        <div class="recap-table-premium">
          <div v-if="entreesSelectionnees.length === 0 && platsSelectionnes.length === 0 && dessertsSelectionnes.length === 0" class="aucun-produit">
            Votre menu est vide. Retournez aux étapes précédentes pour sélectionner des plats.
          </div>
          
          <div v-else class="conteneur-lignes-recap">
            <!-- Entrées -->
            <div class="categorie-bloc-recap" v-if="entreesSelectionnees.length > 0">
              <span class="label-cat">🥢 Entrées</span>
              <div v-for="item in entreesSelectionnees" :key="item.id" class="ligne-recap">
                <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                <div class="actions-quantite">
                  <button @click="item.quantiteMenu = Math.max(1, item.quantiteMenu - 1)">−</button>
                  <span class="qte">{{ item.quantiteMenu }}</span>
                  <button @click="item.quantiteMenu++">+</button>
                </div>
                <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
              </div>
            </div>

            <!-- Plats -->
            <div class="categorie-bloc-recap" v-if="platsSelectionnes.length > 0">
              <span class="label-cat">🥘 Plats Principaux</span>
              <div v-for="item in platsSelectionnes" :key="item.id" class="ligne-recap">
                <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                <div class="actions-quantite">
                  <button @click="item.quantiteMenu = Math.max(1, item.quantiteMenu - 1)">−</button>
                  <span class="qte">{{ item.quantiteMenu }}</span>
                  <button @click="item.quantiteMenu++">+</button>
                </div>
                <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
              </div>
            </div>

            <!-- Desserts -->
            <div class="categorie-bloc-recap" v-if="dessertsSelectionnes.length > 0">
              <span class="label-cat">🍰 Desserts</span>
              <div v-for="item in dessertsSelectionnes" :key="item.id" class="ligne-recap">
                <span class="titre">{{ item.titre }} ({{ item.varianteChoisie.nom }})</span>
                <div class="actions-quantite">
                  <button @click="item.quantiteMenu = Math.max(1, item.quantiteMenu - 1)">−</button>
                  <span class="qte">{{ item.quantiteMenu }}</span>
                  <button @click="item.quantiteMenu++">+</button>
                </div>
                <span class="total-ligne">{{ (item.varianteChoisie.prix * item.quantiteMenu).toFixed(2) }} €</span>
              </div>
            </div>

            <!-- Total Final Menu -->
            <div class="total-final-menu">
              <span>Sous-total du Menu :</span>
              <span class="val">{{ totalMenuUnitaire.toFixed(2) }} €</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- CONTROLES DU BAS -->
    <div class="barre-navigation-builder">
      <button 
        @click="etapePrecedente" 
        class="btn-nav-builder precedent" 
        :disabled="etape === 1"
      >
        ⬅ Précédent
      </button>
      
      <button 
        v-if="etape < 4" 
        @click="etapeSuivante" 
        class="btn-nav-builder suivant"
      >
        Suivant ➡
      </button>
      
      <button 
        v-else 
        @click="ajouterToutAuPanier" 
        class="btn-nav-builder valider"
        :disabled="entreesSelectionnees.length === 0 && platsSelectionnes.length === 0 && dessertsSelectionnes.length === 0"
      >
        🧺 Envoyer au Panier
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-builder-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 10px 100px;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-builder {
  text-align: center;
  margin-bottom: 40px;
}
.tagline-builder {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-gold-dark);
  letter-spacing: 2px;
  display: block;
  margin-bottom: 8px;
}
.header-builder h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 10px;
}
.desc-builder {
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 550px;
  margin: 0 auto 30px;
  line-height: 1.6;
}

/* Fil d'ariane progression */
.fil-etapes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 600px;
  margin: 0 auto;
}
.etape-bulle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: opacity 0.3s;
}
.etape-bulle.active {
  opacity: 1;
}
.etape-bulle .num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-carte);
  border: 2px solid var(--border-subtile);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: var(--shadow-douce);
  transition: all 0.3s;
}
.etape-bulle.active .num {
  background: var(--accent-green);
  border-color: var(--accent-green);
  color: #fff;
  box-shadow: 0 4px 10px rgba(38, 70, 60, 0.25);
}
.etape-bulle .nom {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.barre-liaison {
  flex: 1;
  height: 2px;
  background: var(--border-subtile);
  margin-bottom: 24px;
}
.barre-liaison.active {
  background: var(--accent-green);
}

/* Grille de cartes */
.grille-builder {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.carte-builder {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-douce);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.carte-builder:hover {
  transform: translateY(-4px);
  border-color: var(--accent-gold);
  box-shadow: var(--shadow-premium);
}
.carte-builder.active {
  border-color: var(--accent-green);
  box-shadow: 0 8px 24px rgba(38, 70, 60, 0.12);
}
.image-carte-builder {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}
.carte-builder-details {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
}
.carte-builder-details h4 {
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  margin: 0;
  color: var(--text-primary);
}
.carte-builder-details .desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  flex-grow: 1;
}
.variante-select select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  outline: none;
}

/* Coche verte */
.checkbox-coche {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(38, 70, 60, 0.95);
  color: #fff;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.carte-builder.active .checkbox-coche {
  opacity: 1;
  transform: scale(1);
}

.titre-etape {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: var(--text-primary);
  margin: 0 0 4px;
  text-align: center;
}
.soustitre-etape {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 32px;
}

/* Contrôles navigation bas */
.barre-navigation-builder {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  padding: 12px 24px;
  border-radius: 99px;
  box-shadow: var(--shadow-premium);
  display: flex;
  gap: 16px;
  z-index: 900;
}
.btn-nav-builder {
  padding: 10px 24px;
  border-radius: 99px;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-nav-builder.precedent {
  background: var(--bg-app);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtile);
}
.btn-nav-builder.precedent:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-nav-builder.suivant {
  background: var(--accent-gold);
  color: #fff;
  box-shadow: 0 4px 12px rgba(197, 164, 126, 0.2);
}
.btn-nav-builder.valider {
  background: var(--accent-green);
  color: #fff;
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.25);
}

/* Validation & recap */
.recap-table-premium {
  background: var(--bg-carte);
  border-radius: 24px;
  border: 1px solid var(--border-subtile);
  padding: 24px;
  box-shadow: var(--shadow-douce);
}
.categorie-bloc-recap {
  margin-bottom: 24px;
}
.label-cat {
  display: block;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent-gold-dark);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}
.ligne-recap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border-subtile);
}
.ligne-recap:last-child {
  border-bottom: none;
}
.ligne-recap .titre {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  flex: 1;
}
.actions-quantite {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 24px;
}
.actions-quantite button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-subtile);
  background: var(--bg-app);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
}
.actions-quantite .qte {
  font-weight: 700;
  font-size: 0.9rem;
  min-width: 16px;
  text-align: center;
}
.total-ligne {
  font-weight: 800;
  color: var(--accent-green);
  font-size: 0.95rem;
}
.total-final-menu {
  border-top: 2px solid var(--border-subtile);
  padding-top: 18px;
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--text-primary);
}
.total-final-menu .val {
  color: var(--accent-green);
}

.aucun-produit {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.skeleton-card {
  height: 200px;
  border-radius: 20px;
  background: var(--accent-gold-light);
}

@media (max-width: 600px) {
  .fil-etapes { gap: 4px; }
  .etape-bulle .nom { display: none; }
  .barre-liaison { margin-bottom: 0; }
  .etape-bulle .num { width: 28px; height: 28px; font-size: 0.8rem; }
  .ligne-recap { flex-direction: column; gap: 10px; align-items: flex-start; }
  .actions-quantite { margin: 0; }
  .total-ligne { align-self: flex-end; }
  .barre-navigation-builder { width: calc(100% - 32px); justify-content: space-between; padding: 12px 16px; bottom: 16px; }
  .btn-nav-builder { padding: 10px 16px; font-size: 0.8rem; }
}
</style>
