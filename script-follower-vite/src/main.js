import { createApp } from 'vue'
import App from './App.vue'
import './css/app.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faStop, faCheck, faTriangleExclamation, faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faPlay, faStop, faCheck, faTriangleExclamation, faCopy)

createApp(App)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app')