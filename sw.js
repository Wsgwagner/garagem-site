/* Garagem — service worker: faz o app abrir sem internet. */
var CACHE = "garagem-v15";
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
  "./js/texto.js",
  "./js/ui-custos.js",
  "./js/fotos.js",
  "./js/ui-flex.js",
  "./js/ui-docs.js",
  "./js/ui-revisao.js",
  "./js/contas.js",
  "./js/juncao.js",
  "./js/sincronia.js",
  "./js/nuvem.js",
  "./js/nuvem-config.js",
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
      .then(function(c){ return c.addAll(ARQUIVOS.map(function(a){ return new Request(a, { cache:"reload" }); })); })
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
      // Sem o cache do navegador: página antiga com código novo não abre.
      fetch(req.url, { cache:"no-cache", credentials:"same-origin" }).then(function(resp){
        if (resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copia); }).catch(function(){});
        }
        return resp;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){ return r || caches.match("./"); });
      })
    );
    return;
  }

  // Arquivos do próprio app: rede primeiro, para a correção chegar sem mudar a versão.
  if (new URL(req.url).origin === self.location.origin){
    e.respondWith(
      fetch(req, { cache:"no-cache" }).then(function(resp){
        if (resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ return c.put(req, copia); }).catch(function(){});
        }
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || Response.error(); });
      })
    );
    return;
  }

  // Login e banco da nuvem falam direto com a rede; só fontes e biblioteca ficam guardadas.
  if (!/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)\//.test(req.url)) return;

  // Fontes e biblioteca externas: cache primeiro, rede depois.
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
