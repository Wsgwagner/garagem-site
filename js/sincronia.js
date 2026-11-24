/* sincronia.js
   A conversa entre o aparelho e a nuvem, sem saber qual é a nuvem.

   local:  ler() → veículos · aplicar(veículos) → gravou? · lerBase(uid) · gravarBase(uid, veículos)
   remoto: transacao(fn) — chama fn(veículos ou null) e grava o que ela devolver (null = não grava)

   "Base" é o que os dois lados tinham em comum da última vez. É ela que separa
   "excluí aqui" de "criaram do outro lado". */

import { igual, juntarVeiculos, paresParecidos, adotar } from './juncao.js';

function copia(x){ return JSON.parse(JSON.stringify(x)); }

/* Primeira entrada neste aparelho: resolve o mesmo carro cadastrado dos dois lados. */
function unirParecidos(local, remotos, perguntar){
  var meus = copia(local.ler());
  paresParecidos(meus, remotos).forEach(function(par){
    if (!perguntar(par[0], par[1])) return;
    meus[meus.indexOf(par[0])] = adotar(par[0], par[1]);
  });
  return local.aplicar(meus);
}

async function sincronizarNuvem(uid, local, remoto){
  var base = local.lerBase(uid), meus = copia(local.ler());
  // Aparelho vazio nunca significa "excluí tudo": só recebe.
  if (!meus.length) base = null;

  var juntos = await remoto.transacao(function(outros){
    // Nuvem sem documento também não: só recebe o que está aqui.
    var j = juntarVeiculos(outros ? base : null, meus, outros || []);
    return { veiculos: j, gravar: !outros || !igual(j, outros) };
  });

  // O que foi registrado aqui enquanto a rede respondia continua valendo.
  var agora = copia(local.ler());
  var final = juntarVeiculos(meus, agora, juntos);
  if (!igual(final, agora) && !local.aplicar(final)) return false;
  return local.gravarBase(uid, juntos);
}

export { sincronizarNuvem, unirParecidos };
