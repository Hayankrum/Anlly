import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import appConfig from './app/app.config.json'
import { solicitarPersistencia } from './shared/lib/storage'
import { iniciarSync } from './sync/syncEngine'
import './styles/global.css'
import './features/theme/themes.css'
import './shared/ui/ui.css'

document.title = appConfig.name

const container = document.getElementById('root')
if (!container) {
  throw new Error('Elemento #root não encontrado no index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void solicitarPersistencia()
iniciarSync()



