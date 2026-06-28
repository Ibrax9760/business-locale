import { createRouter, createWebHistory } from 'vue-router'
// On importe HomeView.vue au lieu de App.vue
import HomeView from '../views/HomeView.vue' 
import PanneauVendeur from '../components/PanneauVendeur.vue'
import PanneauAdministrateur from '../components/PanneauAdministrateur.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


export default router