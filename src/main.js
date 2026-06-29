import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'

// Importation du module de registre pour la PWA
import { registerSW } from 'virtual:pwa-register'

// Initialisation du Service Worker avec mise à jour immédiate
registerSW({ immediate: true })

const app = createApp(App)
    
// Injection des dépendances système
app.use(createPinia())
app.use(router)

app.mount('#app')