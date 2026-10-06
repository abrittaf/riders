/**
 * Galería para las capturas de referencia de Playwright. Se construye únicamente con
 * VITE_MAP_DIAGNOSTICS=true; no forma parte de la app publicada.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { Avatar } from './Avatar.tsx'

import { representativeAvatars } from './representative-avatars.ts'

function Gallery() {
  return (
    <main className="avatar-gallery">
      {Object.entries(representativeAvatars).map(([name, options]) => (
        <figure key={name} data-testid={name}>
          <Avatar options={options} variant="profile" />
          <Avatar options={options} variant="marker" />
        </figure>
      ))}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
