import { createApp } from 'vue'
import WinUIOnWeb from 'winuionweb'
import 'winuionweb/style.css'
import './styles/app.css'
import App from './App.vue'
import { initRouter } from './router'
import { applyTheme } from './stores/ui'
import { loadSession } from './stores/session'

export function mountPickCat(root: HTMLElement): void {
  applyTheme()
  initRouter()

  const app = createApp(App)
  app.use(WinUIOnWeb, { locale: 'zh-CN' })
  app.mount(root)

  void loadSession()
}
