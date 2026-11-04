import { createApp } from 'vue'
import WinUIOnWeb from 'winuionweb'
import 'winuionweb/style.css'
import App from './App.vue'
import './site.css'

// NavigationViewItem is only available through the library's global registration
// (it is not a named export), so the whole catalogue is registered here.
// Same accent plumbing as the app, otherwise the library falls back to its
// Windows-blue system accent and the site stops looking like PickCat.
const root = document.documentElement
root.classList.add('theme-dark')
root.style.colorScheme = 'dark'
root.style.setProperty('--accent-base', '#ff6b60')
root.style.setProperty('--pc-accent', '#ff6b60')
root.style.setProperty('--SystemAccentColor', '#ff6b60')
root.style.setProperty('--AccentButtonForeground', '#ffffff')
root.style.setProperty('--accent-text', '#ffffff')

createApp(App).use(WinUIOnWeb).mount('#app')
