/* ui-custos.js
   Aba Custos: total dos últimos 12 meses, por mês e por categoria. */

import { veiculo } from './dados.js';
import { custos } from './contas.js';
import { esc, hoje, fmtBRL, fmtKm } from './util.js';

var CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
var SERIES = [["manut","Manutenção"], ["comb","Combustível"], ["docs","Documentos"]];
var atual = null;

function rotulo(mes){ return CURTO[Number(mes.slice(5)) - 1] + "/" + mes.slice(2, 4); }
/* Topo do eixo em número redondo. */
function teto(v){
  var b = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 1.5, 2, 3, 4, 5, 6, 8, 10].map(function(x){ return x * b; }).filter(function(x){ return x >= v; })[0];
}
function detalhe(m){
  if (!atual) return;
  var el = document.getElementById("custo-detalhe");
  el.innerHTML = m
    ? '<b>'+fmtBRL(m.total)+'</b> em '+esc(rotulo(m.mes))+
      SERIES.filter(function(s){ return m[s[0]]; }).map(function(s){ return ' · '+s[1]+' '+fmtBRL(m[s[0]]); }).join("")
    : 'Toque ou passe o mouse em um mês para ver os valores.';
}

function renderCustos(){
  var v = veiculo(), box = document.getElementById("custos-box");
  if (!box) return; // página antiga em cache: o app abre sem esta aba
  var c = atual = custos(v || {}, hoje());
  var aviso = c.semValor ? '<p class="helper">'+c.semValor+(c.semValor === 1 ? ' serviço está' : ' serviços estão')+
    ' sem valor nos últimos 12 meses, então o total real pode ser maior.</p>' : '';
  if (!c.total){
    box.innerHTML = '<div class="empty"><h3>Nenhum gasto nos últimos 12 meses</h3>'+
      '<p>Informe o valor nos serviços, abastecimentos e documentos pagos para ver os gráficos.</p></div>' + aviso;
    return;
  }
  var max = teto(Math.max.apply(null, c.meses.map(function(m){ return m.total; })));
  var h = '<div class="tiles" style="margin-top:0">'+
    '<div class="tile"><span class="label">Total em 12 meses</span><span class="value">'+fmtBRL(c.total)+'</span><span class="note">'+fmtBRL(c.total / 12)+' por mês, em média</span></div>'+
    '<div class="tile"><span class="label">Custo por km</span><span class="value">'+(c.porKm ? fmtBRL(c.porKm) : "—")+'</span><span class="note">'+
      (c.porKm ? 'tudo somado, em '+fmtKm(c.km)+' km rodados' : 'precisa de km em datas com 30 dias de diferença')+'</span></div></div>';

  h += '<div class="sec-title">Por mês</div><div class="legenda">'+
    SERIES.map(function(s){ return '<span><i class="cor-'+s[0]+'"></i>'+s[1]+'</span>'; }).join("")+'</div>'+
    '<div class="grafico"><div class="eixo"><span>R$ '+fmtKm(max)+'</span><span>R$ '+fmtKm(max / 2)+'</span><span>R$ 0</span></div><div class="colunas">'+
    c.meses.map(function(m, i){
      return '<button type="button" class="coluna" data-mes="'+i+'" aria-label="'+esc(rotulo(m.mes)+": "+fmtBRL(m.total))+'">'+
        '<span class="pilha">'+SERIES.slice().reverse().map(function(s){
          return m[s[0]] ? '<i class="cor-'+s[0]+'" style="flex-grow:0;flex-basis:'+(m[s[0]] / max * 100)+'%"></i>' : '';
        }).join("")+'</span><span class="mes'+(i % 2 ? ' par' : '')+'">'+rotulo(m.mes).slice(0, 3)+'</span></button>';
    }).join("")+'</div></div><p class="helper" id="custo-detalhe" aria-live="polite"></p>';

  h += '<div class="sec-title">Por categoria</div>'+ c.categorias.map(function(x){
    return '<div class="cat-linha"><span class="cat-nome">'+esc(x.nome)+'</span><span class="cat-trilho"><i class="cor-'+x.tipo+'" style="width:'+
      (x.valor / c.categorias[0].valor * 100)+'%"></i></span><span class="mono">'+fmtBRL(x.valor)+'</span></div>';
  }).join("");

  h += '<details class="grupo"><summary><span class="lbl">Ver em tabela</span></summary><div class="table-wrap"><table><thead><tr><th>Mês</th>'+
    SERIES.map(function(s){ return '<th>'+s[1]+'</th>'; }).join("")+'<th>Total</th></tr></thead><tbody>'+
    c.meses.slice().reverse().map(function(m){
      return '<tr><td>'+rotulo(m.mes)+'</td>'+SERIES.map(function(s){ return '<td class="num">'+(m[s[0]] ? fmtBRL(m[s[0]]) : "—")+'</td>'; }).join("")+
        '<td class="num">'+(m.total ? fmtBRL(m.total) : "—")+'</td></tr>';
    }).join("")+'</tbody></table></div></details>' + aviso;
  box.innerHTML = h;
  detalhe(null);
}

function apontado(e){
  var b = e.target.closest && e.target.closest("[data-mes]");
  if (b && atual) detalhe(atual.meses[Number(b.dataset.mes)]);
}
["pointerover","focusin","click"].forEach(function(t){ document.addEventListener(t, apontado); });

export { renderCustos };
