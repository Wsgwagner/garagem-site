/* contas.js
   Contas puras: não conhecem tela, veículo ativo nem gravação. Têm testes. */

function n(x){ var v = parseFloat(x); return isFinite(v) ? v : 0; }

/* Soma meses a uma data AAAA-MM-DD. 31/01 + 1 mês é o último dia de fevereiro. */
function somaMeses(iso, meses){
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!p || !meses) return "";
  var total = Number(p[1]) * 12 + Number(p[2]) - 1 + meses;
  var ano = Math.floor(total / 12), mes = total % 12;
  var ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  function d(x){ return String(x).padStart(2, "0"); }
  return ano + "-" + d(mes + 1) + "-" + d(Math.min(Number(p[3]), ultimo));
}

/* km/l de um tanque cheio até o próximo. Os parciais do meio entram na soma de litros. */
function consumosDe(abast){
  var lista = (abast || []).slice().sort(function(a,b){
    var x = a.data || "", y = b.data || "";
    return n(a.km) - n(b.km) || (x < y ? -1 : x > y ? 1 : 0);
  });
  var out = [], cheio = null, litros = 0, falta = false;
  lista.forEach(function(a){
    if (n(a.litros) > 0) litros += n(a.litros); else falta = true;
    if (!a.cheio) return;
    var rodados = cheio ? n(a.km) - n(cheio.km) : 0;
    if (rodados > 0 && !falta) out.push({ id:a.id, kmRodados:rodados, litros:litros, kmL:rodados / litros });
    cheio = a; litros = 0; falta = false;
  });
  return out;
}
/* Média de verdade: todos os km sobre todos os litros. */
function mediaDe(cs){
  var km = 0, l = 0;
  (cs || []).forEach(function(c){ km += c.kmRodados; l += c.litros; });
  return l ? km / l : null;
}

/* Item sem registro: próxima troca provável e se já devia ter havido uma. Nesse caso
   não dá para afirmar que está em dia: o dono precisa confirmar. */
function estimar(iv, km, ano, anoAtual){
  if (!iv.km || km <= 0) return { proxKm:null, confirmar:true };
  var a = parseInt(ano, 10);
  var velho = !!iv.meses && a > 1900 && (anoAtual - a) * 12 >= iv.meses;
  return { proxKm: Math.floor(km / iv.km) * iv.km + iv.km, confirmar: km >= iv.km || velho };
}

/* O registro que sobe o odômetro guarda o valor de antes (kmAntes), para poder
   desfazer se ele for corrigido ou excluído. */
function desfazerKm(v, antigo){
  if (!antigo || antigo.kmAntes == null || n(antigo.km) !== n(v.kmAtual)) return false;
  v.kmAtual = n(antigo.kmAntes);
  return true;
}
function aplicarKm(v, antigo, novo){
  var antes = n(v.kmAtual);
  if (antigo && n(antigo.km) === n(novo.km)){
    if (antigo.kmAntes != null) novo.kmAntes = antigo.kmAntes;
  } else desfazerKm(v, antigo);
  if (n(novo.km) > n(v.kmAtual)){ novo.kmAntes = n(v.kmAtual); v.kmAtual = n(novo.km); }
  return n(v.kmAtual) !== antes;
}
/* Salto grande demais costuma ser um dígito a mais. */
function saltoSuspeito(atual, novo){ return atual > 0 && novo - atual > 20000; }

export { somaMeses, consumosDe, mediaDe, estimar, desfazerKm, aplicarKm, saltoSuspeito };
