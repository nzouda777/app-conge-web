/* eslint-disable no-undef */
// ---------------------------------------------------------------------------
// Service worker de DGB Request.
//
// Portée volontairement limitée : coquille applicative mise en cache, page
// hors-ligne explicite, et RIEN d'autre.
//
// En particulier, AUCUNE action métier n'est mise en file d'attente hors
// connexion. Enregistrer hors-ligne un avis hiérarchique ou une validation de
// congé produirait une décision administrative datée d'un moment où elle n'a
// pas été prise, et rejouée dans un état du dossier qui a pu changer
// entre-temps. Une requête sans réseau échoue, et le dit.
//
// Les appels à l'API ne sont jamais servis depuis le cache : un solde de congé
// ou un statut de dossier périmés induiraient en erreur plus sûrement qu'une
// absence de réponse.
// ---------------------------------------------------------------------------

const VERSION = 'v1';
const SHELL_CACHE = `dgb-shell-${VERSION}`;
const ASSET_CACHE = `dgb-assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Ce qui doit être disponible immédiatement, même au premier démarrage hors
// connexion.
const SHELL = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      // `skipWaiting` n'est PAS appelé ici : une nouvelle version ne doit pas
      // remplacer celle qui tourne pendant qu'un formulaire est en cours de
      // saisie. L'application propose la mise à jour, et c'est l'utilisateur
      // qui l'accepte (voir le message SKIP_WAITING plus bas).
      .then(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('dgb-') && !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// L'application demande explicitement l'activation de la nouvelle version.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Rien d'autre que notre propre origine : un service worker ne doit pas
  // s'interposer sur des requêtes qui ne le concernent pas.
  if (url.origin !== self.location.origin) return;

  // L'API passe directement au réseau, sans cache ni repli : voir l'en-tête.
  if (isApiRequest(url)) return;

  // Navigation : réseau d'abord, page hors-ligne en repli. Le document ne doit
  // jamais être servi depuis le cache, sinon un déploiement laisse le
  // navigateur pointer vers des bundles qui n'existent plus.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Ressources versionnées par empreinte (/assets/…) : cache d'abord, c'est
  // ce qui rend le démarrage instantané. Leur nom change à chaque
  // déploiement, elles ne peuvent donc pas être servies périmées.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
