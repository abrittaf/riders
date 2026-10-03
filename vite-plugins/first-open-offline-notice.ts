import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

interface NoticeTexts {
  firstOpenOffline: { title: string; body: string }
}

function readNotice(localeFile: string) {
  const texts = JSON.parse(
    readFileSync(new URL(localeFile, import.meta.url), 'utf-8'),
  ) as NoticeTexts
  return texts.firstOpenOffline
}

/**
 * Si el HTML llega pero los scripts de la app no pueden cargarse (primera apertura sin conexión,
 * antes de que el service worker haya guardado la interfaz), React nunca arranca y no hay i18next.
 * Este plugin deja en el HTML un aviso con los textos de los archivos de traducción y un script
 * mínimo que lo muestra cuando falla la carga de un recurso de la app.
 */
export function firstOpenOfflineNotice(): Plugin {
  return {
    name: 'riders:first-open-offline-notice',
    transformIndexHtml() {
      const notices = {
        'es-AR': readNotice('../src/i18n/locales/es-AR.json'),
        en: readNotice('../src/i18n/locales/en.json'),
      }
      const script = `
(function () {
  var notices = ${JSON.stringify(notices)};
  function noticeLanguage() {
    var candidates = [];
    try { candidates.push(localStorage.getItem('riders.language')); } catch (ignored) {}
    candidates = candidates.concat(navigator.languages || []);
    for (var i = 0; i < candidates.length; i++) {
      var primary = String(candidates[i] || '').toLowerCase().split('-')[0];
      if (primary === 'es') return 'es-AR';
      if (primary === 'en') return 'en';
    }
    return 'es-AR';
  }
  function showNotice() {
    var container = document.getElementById('first-open-offline');
    if (!container || document.getElementById('root').hasChildNodes()) return;
    var notice = notices[noticeLanguage()];
    container.querySelector('h1').textContent = notice.title;
    container.querySelector('p').textContent = notice.body;
    container.hidden = false;
  }
  window.addEventListener('error', function (event) {
    var failed = event.target;
    if (!failed || (failed.tagName !== 'SCRIPT' && failed.tagName !== 'LINK')) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showNotice);
    } else {
      showNotice();
    }
  }, true);
})();`
      return [
        { tag: 'script', children: script, injectTo: 'head-prepend' },
        {
          tag: 'div',
          attrs: { id: 'first-open-offline', hidden: true },
          children: [
            { tag: 'h1', children: '' },
            { tag: 'p', children: '' },
          ],
          injectTo: 'body',
        },
      ]
    },
  }
}
