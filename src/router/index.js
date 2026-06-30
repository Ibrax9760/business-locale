import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue' 
import PanneauVendeur from '../components/PanneauVendeur.vue'
import PanneauAdministrateur from '../components/PanneauAdministrateur.vue'
import MenuBuilderView from '../views/MenuBuilderView.vue'
import SuiviView from '../views/SuiviView.vue'
import DevisSimulatorView from '../views/DevisSimulatorView.vue'
import LookbookView from '../views/LookbookView.vue'

const routes = [
  { 
    path: '/', 
    name: 'Home',
    component: HomeView 
  },
  { 
    path: '/vendeur', 
    name: 'Vendeur',
    component: PanneauVendeur 
  },
  { 
    path: '/admin', 
    name: 'Admin',
    component: PanneauAdministrateur 
  },
  {
    path: '/menu-builder',
    name: 'MenuBuilder',
    component: MenuBuilderView
  },
  {
    path: '/suivi',
    name: 'Suivi',
    component: SuiviView
  },
  {
    path: '/devis-simulator',
    name: 'DevisSimulator',
    component: DevisSimulatorView
  },
  {
    path: '/lookbook',
    name: 'Lookbook',
    component: LookbookView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { supabase } from '../utils/supabaseClient'

router.beforeEach(async (to, from) => {
  if (to.path === '/vendeur' || to.path === '/admin') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert("Accès réservé : Veuillez vous connecter.")
      return '/'
    }

    try {
      const { data: profile } = await supabase
        .from('profils')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (to.path === '/admin' && profile?.role !== 'super_admin') {
        alert("Accès refusé : Rôle administrateur requis.")
        return '/'
      }
      
      if (to.path === '/vendeur' && !['vendeur', 'super_admin'].includes(profile?.role)) {
        alert("Accès refusé : Rôle vendeur ou administrateur requis.")
        return '/'
      }
    } catch (e) {
      console.error("Erreur de vérification des droits :", e)
      return '/'
    }
  }
})

export default router