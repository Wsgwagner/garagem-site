/* fotos.js
   Fotos da nota fiscal. O registro guarda só a identificação; a imagem fica neste
   aparelho (IndexedDB) e na nuvem, separada dos registros. */

import { state, aoMudar } from './dados.js';
import { fotoNuvem } from './nuvem.js';
import { hoje, toast, uid } from './util.js';

var MAX_LADO = 1500, MAX_TEXTO = 280000, MAX_FOTOS = 3;
function el(id){ return document.getElementById(id); }

/* ---------- guardar no aparelho ---------- */
var banco = null;
function abrirBanco(){
  if (!banco) banco = new Promise(function(ok, erro){
    var r = indexedDB.open("garagem-fotos", 1);
    r.onupgradeneeded = function(){ r.result.createObjectStore("fotos", { keyPath:"id" }); };
    r.onsuccess = function(){ ok(r.result); };
    r.onerror = function(){ banco = null; erro(r.error); };
  });
  return banco;
}
async function noBanco(modo, fn){
  var db = await abrirBanco();
  return new Promise(function(ok, erro){
    var t = db.transaction("fotos", modo), r = fn(t.objectStore("fotos"));
    t.oncomplete = function(){ ok(r.result); };
    t.onerror = t.onabort = function(){ erro(t.error); };
  });
}
function lerLocal(id){ return noBanco("readonly", function(s){ return s.get(id); }); }
function todas(){ return noBanco("readonly", function(s){ return s.getAll(); }); }
function guardar(f){ return noBanco("readwrite", function(s){ return s.put(f); }); }
function tirar(id){ return noBanco("readwrite", function(s){ return s.delete(id); }); }

/* Só aceita imagem JPEG embutida: nada vindo da nuvem vira endereço ou código. */
function valida(d){ return typeof d === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d); }

async function reduzir(arquivo){
  var img = await createImageBitmap(arquivo, { imageOrientation:"from-image" });
  var lado = MAX_LADO, q = 0.75, texto = "";
  for (var i = 0; i < 8; i++){
    var f = Math.min(1, lado / Math.max(img.width, img.height));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * f));
    c.height = Math.max(1, Math.round(img.height * f));
    var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    texto = c.toDataURL("image/jpeg", q);
    if (texto.length <= MAX_TEXTO) break;
    if (q > 0.5) q -= 0.1; else lado = Math.round(lado * 0.8);
  }
  img.close();
  if (!valida(texto) || texto.length > MAX_TEXTO) throw new Error("foto grande");
  return texto;
}

/* ---------- nuvem ---------- */
function emUso(){
  var u = {};
  state.veiculos.forEach(function(v){ (v.manut || []).forEach(function(m){ (m.fotos || []).forEach(function(f){ u[f] = true; }); }); });
  return u;
}
var enviando = false, avisou = false, marcado = null;
async function enviar(){
  if (enviando || !fotoNuvem.pronto()) return;
  enviando = true;
  try {
    var uso = emUso(), lista = await todas();
    for (var i = 0; i < lista.length; i++){
      var f = lista[i];
      if (f.estado === "apagar"){ await fotoNuvem.apagar(f.id); await tirar(f.id); }
      else if (f.estado === "enviar" && uso[f.id]){
        await fotoNuvem.gravar(f.id, f.dados);
        await guardar({ id:f.id, dados:f.dados, estado:"ok", em:f.em });
      }
      else if (f.estado === "enviar" && f.em < hoje()) await tirar(f.id); // sobrou de um registro não salvo
    }
  } catch(e){
    console.warn("fotos", e);
    if (e && e.code === "permission-denied" && !avisou){
      avisou = true;
      toast("A nuvem recusou a foto: publique a regra nova no Firebase. Ela está guardada neste aparelho.");
    }
  }
  enviando = false;
  desenhar();
}
function agendar(){ clearTimeout(marcado); marcado = setTimeout(enviar, 2500); }
fotoNuvem.aoEntrar(agendar);
aoMudar(agendar);
window.addEventListener("online", agendar);

async function obter(id){
  var f = null;
  try { f = await lerLocal(id); } catch(e){}
  if (f && valida(f.dados)) return f;
  if (!fotoNuvem.pronto()) return null;
  try {
    var d = await fotoNuvem.ler(id);
    if (!valida(d)) return null;
    f = { id:id, dados:d, estado:"ok", em:hoje() };
    guardar(f).catch(function(){});
    return f;
  } catch(e){ console.warn("fotos", e); return null; }
}

/* Apaga aqui e na nuvem o que nenhum registro usa mais. */
async function apagarFotos(ids){
  var uso = emUso();
  try {
    for (var i = 0; i < (ids || []).length; i++)
      if (!uso[ids[i]]) await guardar({ id:ids[i], dados:"", estado:"apagar", em:hoje() });
  } catch(e){ console.warn("fotos", e); }
  agendar();
}

/* ---------- janela do serviço ---------- */
var atuais = [], originais = [], novas = [], vez = 0, ocupado = null;

function abrirFotos(lista){
  originais = (lista || []).slice();
  atuais = originais.slice();
  novas = [];
  desenhar();
}
async function desenhar(){
  var box = el("m-fotos"); if (!box) return;
  var minha = ++vez, itens = atuais.slice(), prontas = [];
  for (var i = 0; i < itens.length; i++) prontas.push(await obter(itens[i]));
  if (minha !== vez) return;
  box.textContent = "";
  itens.forEach(function(id, k){
    var f = prontas[k], d = document.createElement("div");
    d.className = "foto";
    if (f){
      var b = document.createElement("button"), im = document.createElement("img");
      b.type = "button"; b.setAttribute("aria-label", "Ver foto " + (k + 1));
      im.src = f.dados; im.alt = "Foto da nota " + (k + 1);
      b.appendChild(im);
      b.addEventListener("click", function(){ ver(f.dados); });
      d.appendChild(b);
    }
    var n = document.createElement("span");
    n.textContent = !f ? "Foto indisponível agora" : f.estado === "ok" ? "Na nuvem" : "Aguardando envio";
    var r = document.createElement("button");
    r.type = "button"; r.className = "btn btn-sm"; r.textContent = "Remover";
    r.addEventListener("click", function(){ atuais = atuais.filter(function(x){ return x !== id; }); desenhar(); });
    d.appendChild(n); d.appendChild(r);
    box.appendChild(d);
  });
  el("m-foto-add").disabled = atuais.length >= MAX_FOTOS;
}
function ver(dados){
  el("foto-grande").src = dados;
  el("dlg-foto").showModal();
}

async function incluir(arquivos){
  for (var i = 0; i < arquivos.length && atuais.length < MAX_FOTOS; i++){
    try {
      var f = { id: uid(), dados: await reduzir(arquivos[i]), estado:"enviar", em:hoje() };
      await guardar(f);
      novas.push(f.id);
      atuais.push(f.id);
    } catch(e){
      console.warn("fotos", e);
      toast("Não deu para usar essa foto. Tente outra ou tire um print dela.");
    }
  }
  desenhar();
}
/* Salvar enquanto a foto ainda está sendo reduzida perderia a foto. */
function fotosOcupadas(){ return !!ocupado; }
function valorFotos(){ return atuais.slice(); }
/* Registro gravado: apaga as que foram removidas. */
function confirmarFotos(){
  var sairam = originais.concat(novas).filter(function(x){ return atuais.indexOf(x) < 0; });
  novas = []; originais = atuais.slice();
  if (sairam.length) apagarFotos(sairam);
  else agendar();
}

if (el("m-fotos")){
  el("m-foto-add").addEventListener("click", function(){ el("m-foto-arquivo").click(); });
  el("m-foto-arquivo").addEventListener("change", function(e){
    var lista = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!lista.length || ocupado) return;
    ocupado = incluir(lista).finally(function(){ ocupado = null; });
  });
  // Fechou sem salvar: as fotos novas não ficam para trás.
  el("dlg-manut").addEventListener("close", function(){
    novas.forEach(function(id){ tirar(id).catch(function(){}); });
    novas = []; atuais = []; originais = [];
  });
  el("foto-fechar").addEventListener("click", function(){ el("dlg-foto").close(); });
  el("dlg-foto").addEventListener("close", function(){ el("foto-grande").removeAttribute("src"); });
}

export { abrirFotos, valorFotos, fotosOcupadas, confirmarFotos, apagarFotos };
