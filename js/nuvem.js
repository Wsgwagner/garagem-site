/* nuvem.js
   Login com Google e envio dos dados ao Firebase. O aparelho continua sendo a
   fonte principal: sem internet ou sem login, o app funciona igual. */

import { FIREBASE } from './nuvem-config.js';
import { aoMudar, lerVeiculos, aplicarVeiculos, CHAVE_BASE } from './dados.js';
import { sincronizarNuvem, unirParecidos } from './sincronia.js';
import { igual } from './juncao.js';
import { toast } from './util.js';

var SDK = "https://www.gstatic.com/firebasejs/13.2.0/firebase-";
var A = null, F = null, auth = null, db = null;
var usuario = null, parar = null, espera = null, ocupado = false, deNovo = false;
var sessao = 0; // muda a cada login/saída: resposta atrasada de outra conta é ignorada

var caixa = document.getElementById("nuvem");
var rotulo = document.getElementById("nuvem-rotulo");
var btnEntrar = document.getElementById("nuvem-entrar");
var btnSair = document.getElementById("nuvem-sair");

function mostrar(texto){
  rotulo.textContent = texto;
  btnEntrar.hidden = !!usuario;
  btnSair.hidden = !usuario;
}

/* ---------- fotos das notas (usado por fotos.js) ---------- */
var entradas = [];
function docFoto(id){ return F.doc(db, "garagens", usuario.uid, "fotos", id); }
var fotoNuvem = {
  pronto: function(){ return !!usuario && navigator.onLine; },
  aoEntrar: function(fn){ entradas.push(fn); },
  ler: async function(id){ var d = await F.getDoc(docFoto(id)); return d.exists() ? d.data().dados : null; },
  gravar: function(id, dados){ return F.setDoc(docFoto(id), { dados: dados, em: F.serverTimestamp() }); },
  apagar: function(id){ return F.deleteDoc(docFoto(id)); }
};

/* ---------- lado do aparelho ---------- */
function baseGuardada(){
  try { return JSON.parse(localStorage.getItem(CHAVE_BASE)); } catch(e){ return null; }
}
var local = {
  ler: lerVeiculos,
  aplicar: aplicarVeiculos,
  lerBase: function(uid){
    var b = baseGuardada();
    return b && b.uid === uid && Array.isArray(b.veiculos) ? b.veiculos : null;
  },
  gravarBase: function(uid, veiculos){
    try { localStorage.setItem(CHAVE_BASE, JSON.stringify({ uid: uid, veiculos: veiculos })); return true; }
    catch(e){ return false; }
  }
};

/* ---------- lado da nuvem ---------- */
function documento(uid){ return F.doc(db, "garagens", uid); }
function abrir(foto){
  if (!foto.exists()) return null;
  var v = JSON.parse(foto.data().texto); // ilegível: lança erro e nada é gravado por cima
  if (!Array.isArray(v)) throw new Error("documento inválido");
  return v;
}
function remotoDe(uid){
  return {
    transacao: function(fn){
      return F.runTransaction(db, async function(t){
        var r = fn(abrir(await t.get(documento(uid))));
        if (r.gravar) t.set(documento(uid), { texto: JSON.stringify(r.veiculos), em: F.serverTimestamp() });
        return r.veiculos;
      });
    }
  };
}

async function sincronizar(){
  if (!usuario) return;
  if (ocupado){ deNovo = true; return; }
  var uid = usuario.uid, minha = sessao;
  // Nada mudou desde a última vez: não gasta leitura.
  var base = local.lerBase(uid);
  if (base && igual(base, local.ler())){ mostrar("Salvo na nuvem · " + usuario.email); return; }
  ocupado = true;
  mostrar("Salvando na nuvem…");
  try {
    var protegido = Object.assign({}, local, {
      aplicar: function(v){ return minha === sessao && local.aplicar(v); },
      gravarBase: function(u, v){ return minha === sessao && local.gravarBase(u, v); }
    });
    var ok = await sincronizarNuvem(uid, protegido, remotoDe(uid));
    if (minha === sessao) mostrar(ok ? "Salvo na nuvem · " + usuario.email : "Este navegador não gravou os dados da nuvem");
  } catch(e){
    console.warn("nuvem", e);
    if (minha === sessao){
      mostrar(!navigator.onLine || e.code === "unavailable" ? "Sem internet: envio quando ela voltar"
        : e.code === "permission-denied" ? "A nuvem recusou o acesso (confira as regras do Firestore)"
        : "Não deu para salvar na nuvem; os dados estão neste aparelho");
    }
  }
  ocupado = false;
  if (deNovo){ deNovo = false; agendar(); }
}
function agendar(){
  if (!usuario) return;
  clearTimeout(espera);
  espera = setTimeout(sincronizar, 1500);
}

/* Veio novidade da nuvem: junta mesmo que aqui nada tenha mudado. */
function chegou(uid, foto){
  if (foto.metadata.hasPendingWrites || foto.metadata.fromCache) return;
  try {
    var v = abrir(foto), base = local.lerBase(uid);
    if (v && base && igual(v, base)) return;
  } catch(e){ mostrar("Os dados da nuvem não abriram; nada foi alterado"); return; }
  forcar();
}
var forcando = false;
async function forcar(){
  if (!usuario || forcando) return;
  if (ocupado){ deNovo = true; setTimeout(forcar, 1000); return; }
  forcando = ocupado = true;
  var uid = usuario.uid, minha = sessao;
  try {
    var ok = await sincronizarNuvem(uid, Object.assign({}, local, {
      aplicar: function(v){ return minha === sessao && local.aplicar(v); },
      gravarBase: function(u, v){ return minha === sessao && local.gravarBase(u, v); }
    }), remotoDe(uid));
    if (ok && minha === sessao) mostrar("Salvo na nuvem · " + usuario.email);
  } catch(e){ console.warn("nuvem", e); }
  forcando = ocupado = false;
  agendar();
}

async function entrou(u){
  var minha = ++sessao;
  mostrar("Conectando…");
  var b = baseGuardada();
  if (b && b.uid !== u.uid && lerVeiculos().length &&
      !confirm("Este aparelho tem dados de outra conta. Juntar esses veículos na conta " + u.email + "?")){
    await A.signOut(auth);
    return;
  }
  try {
    if (!local.lerBase(u.uid) && lerVeiculos().length){
      var remotos = abrir(await F.getDocFromServer(documento(u.uid))) || [];
      if (minha !== sessao) return;
      unirParecidos(local, remotos, function(a, r){
        return confirm("“" + a.apelido + "” deste aparelho é o mesmo carro que “" + r.apelido +
          "” da nuvem?\n\nOK: junta os registros em um só.\nCancelar: ficam dois carros separados.");
      });
    }
  } catch(e){
    // Sem essa resposta não dá para saber se o carro está repetido: não envia ainda.
    console.warn("nuvem", e);
    if (minha !== sessao) return;
    mostrar(e.code === "permission-denied" ? "A nuvem recusou o acesso (confira as regras do Firestore)"
                                           : "Sem conexão com a nuvem; tento de novo sozinho");
    setTimeout(function(){ if (minha === sessao) entrou(u); }, 20000);
    return;
  }
  usuario = u;
  await forcar();
  if (minha !== sessao) return;
  entradas.forEach(function(fn){ fn(); });
  parar = F.onSnapshot(documento(u.uid), function(f){ chegou(u.uid, f); }, function(e){ console.warn("nuvem", e); });
}
function saiu(){
  sessao++;
  if (parar){ parar(); parar = null; }
  clearTimeout(espera);
  usuario = null;
  mostrar("Entre para ter os mesmos dados no celular e no PC");
}

async function carregar(){
  if (auth) return true;
  try {
    var app = await import(SDK + "app.js");
    A = await import(SDK + "auth.js");
    F = await import(SDK + "firestore.js");
    var inst = app.initializeApp(FIREBASE);
    db = F.getFirestore(inst);
    auth = A.getAuth(inst);
    A.onAuthStateChanged(auth, function(u){ if (u) entrou(u); else saiu(); });
    return true;
  } catch(e){
    console.warn("nuvem", e);
    mostrar("Sem internet: a nuvem conecta quando ela voltar");
    return false;
  }
}

// Página antiga em cache pode não ter a área da nuvem: o app abre sem ela.
if (FIREBASE.apiKey && caixa){
  caixa.hidden = false;
  mostrar("Conectando…");
  btnEntrar.addEventListener("click", async function(){
    if (!await carregar()) return;
    try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
    catch(e){
      console.warn("nuvem", e);
      toast(e.code === "auth/popup-blocked" ? "O navegador bloqueou a janela do Google. Libere e tente de novo."
          : e.code === "auth/unauthorized-domain" ? "Falta autorizar este endereço no Firebase."
          : "A entrada não foi concluída.");
    }
  });
  btnSair.addEventListener("click", function(){
    if (confirm("Sair da conta? Os dados continuam neste aparelho e na nuvem.")) A.signOut(auth);
  });
  aoMudar(agendar);
  window.addEventListener("online", function(){ carregar().then(agendar); });
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) agendar(); });
  carregar();
}

export { fotoNuvem };
