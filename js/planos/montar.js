/* planos/montar.js
   Monta o plano de manutenção de um veículo: parte dos itens genéricos que
   combinam com o perfil e aplica por cima as correções do modelo escolhido,
   se ele estiver na biblioteca. */

import { ITENS_BASE } from './base.js';
import { MODELOS, MODELOS_IDX } from './modelos.js';
import { chave, uid } from '../util.js';

var ROTULO_FONTE = {
  manual:   "Manual do fabricante",
  perfil:   "Intervalo típico",
  inspecao: "Inspeção do manual",
  oficina:  "Recomendação de oficina",
  semtroca: "Não tem troca programada",
  voce:     "Você definiu"
};

function combina(item, perfil){
  if (!item.so) return true;
  for (var campo in item.so){
    if (!Object.prototype.hasOwnProperty.call(item.so, campo)) continue;
    if (item.so[campo].indexOf(perfil[campo]) < 0) return false;
  }
  return true;
}

/* Junta a cadeia de herança de um modelo, do mais geral para o mais específico. */
function cadeia(modeloId){
  var fila = [], id = modeloId, guarda = 0;
  while (id && MODELOS_IDX[id] && guarda++ < 8){
    fila.unshift(MODELOS_IDX[id]);
    id = MODELOS_IDX[id].herda;
  }
  return fila;
}

function montarPlano(perfil, modeloId){
  perfil = perfil || {};
  var plano = [];

  ITENS_BASE.forEach(function(base){
    if (!combina(base, perfil)) return;
    plano.push({
      id: uid(),
      item: base.item,
      cat: base.cat,
      km: base.km || 0,
      meses: base.meses || 0,
      sevKm: base.sevKm || 0,
      sevMeses: base.sevMeses || 0,
      fonte: base.fonte,
      nota: base.nota || "",
      ativo: true
    });
  });

  cadeia(modeloId).forEach(function(modelo){
    (modelo.remover || []).forEach(function(nome){
      plano = plano.filter(function(p){ return chave(p.item) !== chave(nome); });
    });
    (modelo.ajustes || []).concat(modelo.extras || []).forEach(function(aj){
      var alvo = null;
      plano.forEach(function(p){ if (chave(p.item) === chave(aj.item)) alvo = p; });
      if (!alvo){
        alvo = { id: uid(), item: aj.item, cat: aj.cat || "Outro", km:0, meses:0, sevKm:0, sevMeses:0,
                 fonte:"perfil", nota:"", ativo:true };
        plano.push(alvo);
      }
      // Se o modelo muda a origem do intervalo mas não escreve nota, a nota
      // genérica sai: ela falaria de "intervalo típico" onde agora há manual.
      if (aj.fonte && aj.fonte !== alvo.fonte && aj.nota == null) alvo.nota = "";
      ["km","meses","sevKm","sevMeses","fonte","nota","cat"].forEach(function(c){
        if (aj[c] != null) alvo[c] = aj[c];
      });
      alvo.modelo = modelo.id;
    });
  });

  return plano;
}

/* Reaplica o plano do modelo preservando o que o usuário ajustou à mão. */
function reconstruirPlano(planoAtual, perfil, modeloId){
  var novo = montarPlano(perfil, modeloId);
  (planoAtual || []).forEach(function(antigo){
    if (antigo.fonte !== "voce" && !antigo.criadoPorVoce) return;
    var achou = false;
    novo.forEach(function(p){ if (chave(p.item) === chave(antigo.item)){ achou = true;
      p.km = antigo.km; p.meses = antigo.meses; p.sevKm = antigo.sevKm; p.sevMeses = antigo.sevMeses;
      p.fonte = "voce"; p.nota = antigo.nota; p.ativo = antigo.ativo;
    }});
    if (!achou) novo.push(antigo);
  });
  return novo;
}

function listaModelos(){
  return MODELOS.map(function(m){ return { id:m.id, nome:m.nome, detalhe:m.detalhe, fonte:m.fonte, perfil:m.perfil || {} }; });
}

function fonteModelo(modeloId){
  var m = MODELOS_IDX[modeloId];
  return m ? m.fonte : "";
}

export { montarPlano, reconstruirPlano, listaModelos, fonteModelo, ROTULO_FONTE };
