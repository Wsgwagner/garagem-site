/* util.js
 Formatação, datas, números e download de arquivos. Nada aqui conhece a tela nem os dados. */

function uid(){
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g,""); } catch(e){}
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function num(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
function hoje(){
  var d = new Date(), p = function(x){ return String(x).padStart(2,"0"); };
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
}
function dateVal(iso){ return iso ? Date.parse(iso + "T12:00:00") : NaN; }
function diasAte(iso){
  var t = dateVal(iso); if (!isFinite(t)) return null;
  return Math.round((t - dateVal(hoje())) / 86400000);
}
function fmtData(iso){
  if (!iso) return "—";
  var p = iso.split("-"); return p.length === 3 ? p[2]+"/"+p[1]+"/"+p[0] : iso;
}
function fmtKm(n){ return Math.round(num(n)).toLocaleString("pt-BR"); }
function fmtBRL(n){ return num(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function fmtDec(n,d){ return num(n).toLocaleString("pt-BR",{minimumFractionDigits:d||1,maximumFractionDigits:d||1}); }
function totalManut(m){ return num(m.custoPecas) + num(m.custoMaoObra); }
function chave(item){ return String(item||"").trim().toLowerCase().replace(/\s+/g," "); }

var toastEl = document.getElementById("toast"), toastT = null;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove("show"); }, 2600);
}

function somaMeses(iso, meses){
  var t = dateVal(iso); if (!isFinite(t) || !meses) return "";
  var d = new Date(t); d.setMonth(d.getMonth() + meses);
  var p = function(x){ return String(x).padStart(2,"0"); };
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());
}

function baixarArquivo(nome, texto, tipo){
  try {
    var blob = new Blob([texto], {type: (tipo || "text/plain") + ";charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nome; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    return true;
  } catch(e){ toast("Este navegador bloqueou o download."); return false; }
}

export {
uid, esc, num, hoje, dateVal, diasAte, fmtData, fmtKm, fmtBRL, fmtDec,
totalManut, chave, somaMeses, toast, baixarArquivo
};
