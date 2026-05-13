import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// window.innerHeight gives the real visible viewport height on every browser,
// including iOS Safari where 100vh ≠ visible area when the address bar is showing.
function setVH() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
}
setVH()
window.addEventListener('resize', setVH, { passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
