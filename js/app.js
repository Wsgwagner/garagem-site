/* app.js
   Ponto de entrada: liga os módulos, registra o service worker
   (o que faz o app abrir sem internet) e desenha a primeira tela. */

import { lerLocal, aoMudar, veiculo } from './dados.js';
import { render } from './ui.js';
import { abrirVeiculo } from './ui-veiculos.js';
import './ui-plano.js';
import './ui-dados.js';

aoMudar(render);

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}

lerLocal();
render();
