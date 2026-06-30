<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const emit = defineEmits(['ajouter-au-panier'])

const produitsBase = ref([])
const chargement = ref(true)

const lookbooks = ref([
  {
    id: 1,
    titre: "Mariage Royal à Petite-Terre 🌸",
    description: "Un décor épuré mêlant tentes de prestige, chaises Napoléon blanches et buffet de mignardises locales.",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
    articlesAssocies: [
      { type: 'location', nom: "Chaise Napoléon Blanche", prix: 4.5, qte: 50 },
      { type: 'location', nom: "Table Ronde 10 Pers.", prix: 15, qte: 5 },
      { type: 'gastronomie', nom: "Plateau Mignardises", prix: 28, qte: 3 }
    ]
  },
  {
    id: 2,
    titre: "Cocktail d'Entreprise Face au Lagon 🍹",
    description: "Soirée corporative haut de gamme avec service traiteur chaud de luxe et sonorisation professionnelle.",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
    articlesAssocies: [
      { type: 'location', nom: "Système Sonorisation 500W", prix: 120, qte: 1 },
      { type: 'gastronomie', nom: "Pilao de Mayotte", prix: 15, qte: 40 },
      { type: 'gastronomie', nom: "Punch Local (Sans Alcool)", prix: 2, qte: 80 }
    ]
  },
  {
    id: 3,
    titre: "Dîner Privé Chic sous les Étoiles 🕯️",
    description: "Dressage intimiste de table de luxe avec vaisselle premium pour les soirées privées et anniversaires.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
    articlesAssocies: [
      { type: 'location', nom: "Set Vaisselle Premium Mayotte", prix: 6, qte: 12 },
      { type: 'gastronomie', nom: "Culinaire Prestige", prix: 35, qte: 12 }
    ]
  }
])

onMounted(async () => {
  chargement.value = true
  try {
    const [resProd, resEq] = await Promise.all([
      supabase.from('produits_gastronomie').select('*'),
      supabase.from('equipements_location').select('*')
    ])
    
    // Concaténer tous les articles disponibles en base
    produitsBase.value = [
      ...(resProd.data ? resProd.data.map(x => ({ ...x, typeRef: 'gastronomie', prix: x.variantes?.[0]?.prix ?? 10 })) : []),
      ...(resEq.data ? resEq.data.map(x => ({ ...x, typeRef: 'location', prix: x.prix_journalier })) : [])
    ]
  } catch (err) {
    console.error("Erreur lookbook base data:", err)
  } finally {
    chargement.value = false
  }
})

const ajouterLookbookAuPanier = (look) => {
  let compteur = 0
  
  look.articlesAssocies.forEach(art => {
    // Tenter de trouver le produit réel en base de données par correspondance de nom partielle
    const reel = produitsBase.value.find(p => p.titre?.toLowerCase().includes(art.nom.split(' ')[0].toLowerCase()))
    
    if (reel) {
      // Si trouvé en base, importer le vrai produit
      const payload = reel.typeRef === 'gastronomie' ? {
        id: reel.id,
        titre: reel.titre,
        varianteChoisie: reel.variantes?.[0] || { nom: 'Standard', prix: reel.prix }
      } : {
        ...reel,
        idBase: reel.id,
        typeElement: 'location',
        dateDebutSelectionnee: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
        dateFinSelectionnee: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Demain
        dureeJours: 1,
        prixTotalLocation: reel.prix_journalier
      }
      
      for (let i = 0; i < art.qte; i++) {
        emit('ajouter-au-panier', payload, reel.typeRef === 'gastronomie')
      }
      compteur++
    } else {
      // Sinon importer en mock de secours
      const payload = art.type === 'gastronomie' ? {
        id: `mock-g-${Date.now()}`,
        titre: art.nom,
        varianteChoisie: { nom: 'Standard', prix: art.prix }
      } : {
        id: `mock-l-${Date.now()}`,
        titre: art.nom,
        idBase: null,
        typeElement: 'location',
        dateDebutSelectionnee: new Date().toISOString().split('T')[0],
        dateFinSelectionnee: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        dureeJours: 1,
        prixTotalLocation: art.prix
      }
      
      for (let i = 0; i < art.qte; i++) {
        emit('ajouter-au-panier', payload, art.type === 'gastronomie')
      }
      compteur++
    }
  })

  alert(`✨ Le look "${look.titre}" a été importé ! Les articles ont été ajoutés à votre panier.`)
  router.push('/')
}
</script>

<template>
  <div class="lookbook-view animate-fade">
    <div class="header-look">
      <span class="tagline-look">✨ INSPIRATION ÉVÉNEMENTIELLE ✨</span>
      <h2>Le Lookbook d'Exception</h2>
      <p class="desc-look">Inspirez-vous de nos plus belles compositions et réservez l'intégralité du décor et du buffet en un instant.</p>
    </div>

    <div class="liste-lookbooks">
      <div v-for="look in lookbooks" :key="look.id" class="carte-lookbook">
        <div class="lookbook-image-container">
          <img :src="look.image" alt="" class="look-image" />
        </div>
        <div class="lookbook-details">
          <h3>{{ look.titre }}</h3>
          <p class="desc">{{ look.description }}</p>
          
          <div class="liste-produits-look">
            <span class="soustitre-prod">Composants du Look :</span>
            <ul>
              <li v-for="art in look.articlesAssocies" :key="art.nom">
                <span class="puce">•</span>
                <strong>{{ art.qte }}x</strong> {{ art.nom }}
              </li>
            </ul>
          </div>

          <button @click="ajouterLookbookAuPanier(look)" class="btn-ajouter-look">
            ✨ Commander ce look
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lookbook-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 10px 80px;
}
.header-look {
  text-align: center;
  margin-bottom: 40px;
}
.tagline-look {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-gold-dark);
  letter-spacing: 2px;
  display: block;
  margin-bottom: 8px;
}
.header-look h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 10px;
}
.desc-look {
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 550px;
  margin: 0 auto;
  line-height: 1.6;
}

.liste-lookbooks {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.carte-lookbook {
  background: var(--bg-carte);
  border: 1px solid var(--border-subtile);
  border-radius: 28px;
  overflow: hidden;
  box-shadow: var(--shadow-douce);
  display: grid;
  grid-template-columns: 1fr 1fr;
  transition: all 0.3s ease;
}
.carte-lookbook:hover {
  border-color: var(--accent-gold);
  box-shadow: var(--shadow-premium);
}

.lookbook-image-container {
  overflow: hidden;
  height: 100%;
}
.look-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.carte-lookbook:hover .look-image {
  transform: scale(1.04);
}

.lookbook-details {
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.lookbook-details h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem;
  margin: 0;
  color: var(--text-primary);
}
.lookbook-details .desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.liste-produits-look {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.soustitre-prod {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent-gold-dark);
  letter-spacing: 0.5px;
}
.liste-produits-look ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.liste-produits-look li {
  font-size: 0.85rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.puce {
  color: var(--accent-gold);
  font-weight: 900;
}

.btn-ajouter-look {
  align-self: flex-start;
  background: var(--accent-green);
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(38, 70, 60, 0.25);
  transition: all 0.3s;
}
.btn-ajouter-look:hover {
  background: #1e362e;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .carte-lookbook {
    grid-template-columns: 1fr;
  }
  .lookbook-image-container {
    aspect-ratio: 16 / 10;
  }
  .lookbook-details {
    padding: 24px;
  }
}
</style>
