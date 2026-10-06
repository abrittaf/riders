import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App, type AppDependencies } from './App.tsx'
import { createBackend } from './backend/create-backend.ts'
import { BrowserInstallPlatform } from './app-shell/install/install-platform.ts'
import { backendConfig } from './config/backend-config.ts'
import { mapConfig } from './config/map-config.ts'
import { BrowserConnectivity } from './connectivity/connectivity.ts'
import { createI18n } from './i18n/i18n.ts'
import { LocalStorageLanguagePreference } from './i18n/language-preference.ts'
import { createMapPlatform } from './map-platform/create-map-platform.ts'
import { LocalStorageProfileDraftStore } from './rider-account/profile-draft-store.ts'

registerSW({ immediate: true })

const languagePreference = new LocalStorageLanguagePreference(
  window.localStorage,
)
const i18n = createI18n({
  deviceLanguages: navigator.languages,
  preference: languagePreference,
})
const connectivity = new BrowserConnectivity()
const mapPlatform = createMapPlatform(mapConfig, { connectivity })
void mapPlatform.offlineRegions.initialize()

const dependencies: AppDependencies = {
  languagePreference,
  connectivity,
  installPlatform: new BrowserInstallPlatform(),
  mapPlatform,
  riderAccount: createBackend(backendConfig).riderAccount,
  profileDrafts: new LocalStorageProfileDraftStore(window.localStorage),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App dependencies={dependencies} />
    </I18nextProvider>
  </StrictMode>,
)
