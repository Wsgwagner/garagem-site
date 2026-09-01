/* Garagem da Livina — service worker: faz o app abrir sem internet. */
var CACHE = "garagem-v5";
var ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./js/ui.js",
  "./js/ui-veiculos.js",
  "./js/ui-plano.js",
  "./js/ui-formularios.js",
  "./js/ui-dados.js",
  "./js/dados.js",
  "./js/calculos.js",
  "./js/util.js",
  "./js/planos/base.js",
  "./js/planos/modelos.js",
  "./js/planos/montar.js",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/icon-512-maskable.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ARQUIVOS); })
      .then(function(){ return self.skipWaiting(); })
      .catch(function(){})
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(chaves){
      return Promise.all(chaves.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  // Navegação: tenta a rede, cai para o cache quando está sem internet.
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copia); }).catch(function(){});
        return resp;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){ return r || caches.match("./"); });
      })
    );
    return;
  }

  // Demais arquivos (ícones, fontes): cache primeiro, rede depois.
  e.respondWith(
    caches.match(req).then(function(cacheado){
      if (cacheado) return cacheado;
      return fetch(req).then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE).then(function(c){
          try { c.put(req, copia); } catch(err){}
        }).catch(function(){});
        return resp;
      }).catch(function(){ return cacheado; });
    })
  );
});
