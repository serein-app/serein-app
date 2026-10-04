// Service worker de Serein.
//
// Rôle : permettre à l'appli d'être "installable" sur téléphone (icône sur l'écran
// d'accueil, ouverture en plein écran sans barre de navigateur) et de se charger plus
// vite au retour. Ce n'est PAS un mode hors-ligne complet (l'appli a besoin d'internet
// pour se connecter et sauvegarder), juste un cache pour accélérer les visites suivantes.
//
// CACHE_NAME change à chaque nouvelle version : ça force le nettoyage de l'ancien cache
// et garantit que les utilisateurs reçoivent le nouveau code rapidement après une mise
// à jour, au lieu de rester bloqués sur une ancienne version mise en cache.
const CACHE_NAME = "serein-cache-v1";

self.addEventListener("install", (event) => {
  // Passe directement à la nouvelle version du service worker, sans attendre
  // que tous les onglets ouverts soient fermés.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Ne touche qu'aux requêtes vers notre propre site — jamais Supabase, Anthropic, etc.
  if (url.origin !== self.location.origin) return;

  // Pages (navigation) : toujours essayer le réseau en premier pour avoir la dernière
  // version, et ne se rabattre sur le cache que si l'appareil est hors-ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("/")))
    );
    return;
  }

  // Fichiers statiques (JS, CSS, images, icônes) : on sert depuis le cache si
  // disponible pour la rapidité, tout en rafraîchissant le cache en arrière-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
