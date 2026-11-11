// Pedal & Clima: guarda o app e os pedaços de mapa já vistos para abrir sem sinal.
// A previsão em si fica salva pela página (localStorage) e é atualizada quando houver conexão.
const SHELL = "pedal-shell-v1";
const TILES = "pedal-tiles-v1";
const SHELL_FILES = [
  "./", "index.html", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
];
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com"];
const MAX_TILES = 400;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_FILES.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimTiles(){
  const c = await caches.open(TILES), keys = await c.keys();
  for(let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // Página: rede primeiro (para pegar atualizações), cache se estiver sem sinal
  if(req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(SHELL).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }

  // Pedaços de mapa: cache primeiro, rede para os que faltam
  if(TILE_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req); if(hit) return hit;
      const r = await fetch(req); if(r.ok || r.type === "opaque"){ c.put(req, r.clone()); trimTiles(); } return r;
    }).catch(() => caches.match(req)));
    return;
  }

  // Arquivos do app e bibliotecas: usa o que tem e atualiza em segundo plano
  const shellLike = url.origin === location.origin || url.hostname === "unpkg.com" || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if(shellLike){
    e.respondWith(caches.open(SHELL).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if(r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // APIs de clima, rotas e alertas: sempre rede (a página cuida da última previsão salva)
});
