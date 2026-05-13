import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Use visualViewport when available — it resizes when the mobile keyboard opens/closes,
// giving the true visible area height. Falls back to window.innerHeight.
function setVH() {
  const height = (window.visualViewport?.height ?? window.innerHeight)
  document.documentElement.style.setProperty('--vh', `${height * 0.01}px`)
}
setVH()
window.visualViewport?.addEventListener('resize', setVH)
window.addEventListener('resize', setVH, { passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
