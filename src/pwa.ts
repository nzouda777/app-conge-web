// Enregistrement du service worker et proposition de mise à jour.
//
// Une nouvelle version n'est jamais activée d'office : l'utilisateur peut être
// en train de saisir une demande. L'application signale qu'une mise à jour est
// disponible et attend qu'il l'accepte.

type UpdateHandler = () => void;

export function registerServiceWorker(onUpdateAvailable: UpdateHandler) {
  if (!('serviceWorker' in navigator)) return;
  // Pas de service worker en développement : il mettrait en cache des
  // ressources que Vite remplace à chaud.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          onUpdateAvailable();
          return;
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // `controller` non nul signifie qu'une version tournait déjà :
            // c'est une mise à jour, et non la première installation.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdateAvailable();
            }
          });
        });
      })
      .catch(() => {
        // Un service worker indisponible ne doit pas empêcher l'application de
        // fonctionner : elle reste utilisable en ligne, simplement sans
        // démarrage instantané ni page hors-ligne.
      });
  });
}

export async function applyUpdate() {
  const registration = await navigator.serviceWorker?.getRegistration();
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  // `controllerchange` signale que la nouvelle version a pris la main.
  navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
}
