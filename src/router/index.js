import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue' 
import PanneauVendeur from '../components/PanneauVendeur.vue'
import PanneauAdministrateur from '../components/PanneauAdministrateur.vue'
import MenuBuilderView from '../views/MenuBuilderView.vue'
import SuiviView from '../views/SuiviView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router