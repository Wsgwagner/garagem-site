/* ui-dados.js
   Rodapé do app: PDF do histórico, backup, restauração, CSV e instalação.
   Também monta o relatório que vira PDF na impressão. */

import { veiculo, armazenamentoOk, fazerBackup, aplicarBackup, importarCSV } from './dados.js';
import { alertas, consumos, kmAtual, custoPorKm } from './calculos.js';
import { esc, num, hoje, fmtData, fmtKm, fmtBRL, fmtDec, totalManut, toast, baixarArquivo } from './util.js';
/* Atalho: o veículo ativo, ou um vazio para a tela não quebrar. */
function vAtivo(){ return veiculo() || { manut:[], abast:[], apelido:"", plano:[] }; }

/* Identificação do veículo, usada no cabeçalho do PDF e nos nomes de arquivo. */
function identificacao(){
  var v = veiculo(); if (!v) return "";
  return [v.marca, v.modelo, v.ano].filter(Boolean).join(" ") || v.apelido;
}
function apelidoArquivo(){
  var v = veiculo();
  return (v ? v.apelido : "garagem").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "veiculo";
}

/* Rodapé: onde os dados estão e quando foi o último backup. */
function marcaArmazenamento(){
  var dot = document.getElementById("store-dot"), lbl = document.getElementById("store-label");
  dot.className = "dot " + (armazenamentoOk ? "on" : "local");
  lbl.textContent = armazenamentoOk ? "Salvo neste aparelho"
                                    : "Atenção: este navegador não está guardando os dados";
  var v = veiculo(), av = document.getElementById("aviso-backup");
  var n = v ? (v.manut.length + v.abast.length) : 0;
  av.textContent = !armazenamentoOk
    ? "Saia da aba anônima ou libere o armazenamento do site, senão o que você registrar se perde ao fechar. Enquanto isso, salve um backup antes de sair."
    : (n === 0 ? "Os registros ficam guardados neste aparelho. Salve um backup de vez em quando — é o que traz tudo de volta se você trocar de celular."
               : "Último backup: " + (v && v.ultimoBackup ? fmtData(v.ultimoBackup) : "nunca") + ". Vale salvar um a cada revisão.");
}

function csv(linhas){
  return "﻿" + linhas.map(function(l){
    return l.map(function(c){
      var s = c == null ? "" : String(c);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(";");
  }).join("\r\n");
}
function baixar(nome, texto){ baixarArquivo(nome, texto, "text/csv"); }
document.getElementById("export-manut").addEventListener("click", function(){
  if (!vAtivo().manut.length){ toast("Nada para exportar ainda"); return; }
  var l = [["Data","Km","Peça/serviço","Categoria","Oficina","Peças (R$)","Mão de obra (R$)","Total (R$)","Próx. km","Próx. data","Observações"]];
  vAtivo().manut.slice().sort(function(a,b){ return (a.data||"") < (b.data||"") ? -1 : 1; }).forEach(function(m){
    l.push([fmtData(m.data), m.km, m.item, m.categoria, m.oficina, num(m.custoPecas).toFixed(2).replace(".",","),
            num(m.custoMaoObra).toFixed(2).replace(".",","), totalManut(m).toFixed(2).replace(".",","),
            m.proxKm || "", m.proxData ? fmtData(m.proxData) : "", m.obs]);
  });
  baixar("manutencoes-" + apelidoArquivo() + ".csv", csv(l));
});
document.getElementById("export-abast").addEventListener("click", function(){
  if (!vAtivo().abast.length){ toast("Nada para exportar ainda"); return; }
  var cons = {}; consumos().forEach(function(c){ cons[c.id] = c; });
  var l = [["Data","Km","Litros","Valor (R$)","Combustível","Posto","Tanque cheio","km/l"]];
  vAtivo().abast.slice().sort(function(a,b){ return num(a.km) - num(b.km); }).forEach(function(a){
    l.push([fmtData(a.data), a.km, String(num(a.litros)).replace(".",","), num(a.valor).toFixed(2).replace(".",","),
            a.combustivel, a.posto, a.cheio ? "sim" : "não", cons[a.id] ? cons[a.id].kmL.toFixed(2).replace(".",",") : ""]);
  });
  baixar("abastecimentos-" + apelidoArquivo() + ".csv", csv(l));
});

document.getElementById("importar-csv").addEventListener("click", function(){
  document.getElementById("arquivo-csv").click();
});
document.getElementById("arquivo-csv").addEventListener("change", function(e){
  var arquivos = Array.prototype.slice.call(e.target.files || []);
  if (!arquivos.length) return;
  var resumo = [], pendentes = arquivos.length;
  arquivos.forEach(function(f){
    var fr = new FileReader();
    fr.onload = function(){
      var r = importarCSV(String(fr.result), f.name);
      resumo.push(r.erro ? f.name + ": " + r.erro
                         : r.novos + " " + r.tipo + " importados" +
                           (r.repetidos ? ", " + r.repetidos + " já existiam" : "") +
                           (r.ignorados ? ", " + r.ignorados + " sem dados" : ""));
      if (--pendentes === 0) toast(resumo.join(" · "));
    };
    fr.onerror = function(){ if (--pendentes === 0) toast("Não deu para ler o arquivo."); };
    fr.readAsText(f, "utf-8");
  });
  e.target.value = "";
});

function montarRelatorio(){
  var km = kmAtual();
  var lista = vAtivo().manut.slice().sort(function(a,b){ return (a.data||"") < (b.data||"") ? 1 : -1; });
  var total = lista.reduce(function(s,m){ return s + totalManut(m); }, 0);
  var al = alertas().filter(function(a){ return a.nivel === "crit" || a.nivel === "warn"; });
  var cs = consumos();
  var media = cs.length ? cs.reduce(function(s,c){ return s + c.kmL; },0)/cs.length : null;
  var totalL = 0, totalComb = 0;
  vAtivo().abast.forEach(function(a){ totalL += num(a.litros); totalComb += num(a.valor); });

  var h = "";
  h += '<h1>Histórico de manutenção</h1>';
  h += '<div class="sub">'+esc([identificacao(), vAtivo().placa].filter(Boolean).join(" · "))+
     ' · odômetro '+fmtKm(km)+' km · documento gerado em '+fmtData(hoje())+'</div>';

  h += '<h2>Resumo</h2><div class="resumo">'+
       '<span>Serviços registrados: <b>'+lista.length+'</b></span>'+
       '<span>Total gasto em manutenção: <b>'+fmtBRL(total)+'</b></span>'+
       (lista.length ? '<span>Período: <b>'+fmtData(lista[lista.length-1].data)+' a '+fmtData(lista[0].data)+'</b></span>' : '')+
       (media ? '<span>Consumo médio: <b>'+fmtDec(media,1)+' km/l</b></span>' : '')+
       (totalComb ? '<span>Combustível registrado: <b>'+fmtBRL(totalComb)+'</b> em '+fmtDec(totalL,1)+' litros</span>' : '')+
       '</div>';

  if (al.length){
    h += '<h2>Pendências no plano de manutenção</h2><table><thead><tr>'+
         '<th>Item</th><th class="n">Alvo</th><th>Situação</th></tr></thead><tbody>';
    al.forEach(function(a){
      var alvo = [];
      if (a.proxKm) alvo.push(fmtKm(a.proxKm)+" km");
      if (a.proxData) alvo.push(fmtData(a.proxData));
      h += '<tr><td>'+esc(a.nome)+'</td><td class="n">'+esc(alvo.join(" ou "))+'</td><td>'+
           (a.nivel === "crit" ? "Passou do ponto" : "Chegando na hora")+'</td></tr>';
    });
    h += '</tbody></table>';
  }

  h += '<h2>Peças trocadas e serviços</h2>';
  if (!lista.length){
    h += '<p class="obsr">Nenhum serviço registrado até agora.</p>';
  } else {
    h += '<table><thead><tr><th class="n">Data</th><th class="n">Km</th><th>Peça ou serviço</th>'+
         '<th>Oficina</th><th class="n">Custo</th></tr></thead><tbody>';
    lista.forEach(function(m){
      var c = totalManut(m);
      h += '<tr><td class="n">'+fmtData(m.data)+'</td><td class="n">'+fmtKm(m.km)+'</td>'+
           '<td>'+esc(m.item)+(m.obs ? '<br><span class="obsr">'+esc(m.obs)+'</span>' : '')+'</td>'+
           '<td>'+esc(m.oficina||"—")+'</td><td class="n">'+(c ? fmtBRL(c) : "—")+'</td></tr>';
    });
    h += '<tr><td colspan="4" class="n"><b>Total</b></td><td class="n"><b>'+fmtBRL(total)+'</b></td></tr>';
    h += '</tbody></table>';
  }

  if (vAtivo().abast.length){
    var ab = vAtivo().abast.slice().sort(function(a,b){ return num(b.km) - num(a.km); }).slice(0,40);
    var cons = {}; cs.forEach(function(c){ cons[c.id] = c; });
    h += '<h2>Abastecimentos'+(vAtivo().abast.length > 40 ? ' (os 40 mais recentes)' : '')+'</h2>'+
         '<table><thead><tr><th class="n">Data</th><th class="n">Km</th><th class="n">Litros</th>'+
         '<th class="n">Valor</th><th class="n">km/l</th><th>Combustível</th></tr></thead><tbody>';
    ab.forEach(function(a){
      h += '<tr><td class="n">'+fmtData(a.data)+'</td><td class="n">'+fmtKm(a.km)+'</td>'+
           '<td class="n">'+fmtDec(a.litros,2)+'</td><td class="n">'+(num(a.valor) ? fmtBRL(a.valor) : "—")+'</td>'+
           '<td class="n">'+(cons[a.id] ? fmtDec(cons[a.id].kmL,1) : "—")+'</td><td>'+esc(a.combustivel||"")+'</td></tr>';
    });
    h += '</tbody></table>';
  }

  h += '<div class="rodape">Documento gerado pela Garagem da Livina a partir dos registros do proprietário. '+
       'Os intervalos de manutenção citados seguem o Manual de Garantia e Manutenção da Nissan para veículos flex, em uso normal.</div>';
  document.getElementById("relatorio").innerHTML = h;
}
document.getElementById("gerar-pdf").addEventListener("click", function(){
  if (!vAtivo().manut.length && !vAtivo().abast.length){ toast("Registre alguma coisa antes de gerar o PDF"); return; }
  montarRelatorio();
  toast("Escolha “Salvar como PDF” no destino da impressão");
  setTimeout(function(){ window.print(); }, 350);
});
window.addEventListener("beforeprint", montarRelatorio);

document.getElementById("baixar-backup").addEventListener("click", fazerBackup);
document.getElementById("restaurar-backup").addEventListener("click", function(){
  document.getElementById("arquivo-backup").click();
});
document.getElementById("arquivo-backup").addEventListener("change", function(e){
  var f = e.target.files && e.target.files[0];
  if (!f) return;
  var fr = new FileReader();
  fr.onload = function(){ aplicarBackup(String(fr.result)); };
  fr.onerror = function(){ toast("Não deu para ler o arquivo."); };
  fr.readAsText(f);
  e.target.value = "";
});

var promptInstalar = null;
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault(); promptInstalar = e;
  document.getElementById("instalar").hidden = false;
});
document.getElementById("instalar").addEventListener("click", function(){
  if (!promptInstalar) return;
  promptInstalar.prompt();
  promptInstalar.userChoice.then(function(){ promptInstalar = null; document.getElementById("instalar").hidden = true; });
});
window.addEventListener("appinstalled", function(){ document.getElementById("instalar").hidden = true; });

export { montarRelatorio, marcaArmazenamento };
