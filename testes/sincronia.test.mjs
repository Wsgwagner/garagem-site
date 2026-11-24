/* Rodar: node --test --experimental-default-type=module testes/sincronia.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sincronizarNuvem, unirParecidos } from '../js/sincronia.js';
import { igual } from '../js/juncao.js';

const c = x => JSON.parse(JSON.stringify(x));
function nuvem(){
  const n = { doc: null, gravacoes: 0, antes: null,
    async transacao(fn){
      if (n.antes){ const f = n.antes; n.antes = null; await f(); }
      const r = fn(n.doc && c(n.doc));
      if (r.gravar){ n.doc = c(r.veiculos); n.gravacoes++; }
      return c(r.veiculos);
    } };
  return n;
}
function aparelho(v = []){
  const a = { v, bases: {}, ler: () => a.v, aplicar: x => { a.v = c(x); return true; },
    lerBase: u => a.bases[u] || null, gravarBase: (u, x) => { a.bases[u] = c(x); return true; } };
  return a;
}
const m = (id, item, km = 1000, o = {}) => ({ id, item, km, data: '2026-01-01', ...o });
const carro = (id, manut = [], o = {}) => ({ id, apelido: 'Livina', placa: '', kmAtual: 1000, plano: [], manut, abast: [], ...o });
const ids = a => a.v[0].manut.map(x => x.id).sort();
const s = (a, n) => sincronizarNuvem('u', a, n);

async function par(manut){
  const n = nuvem(), cel = aparelho([carro('a', manut)]), pc = aparelho();
  await s(cel, n); await s(pc, n);
  return { n, cel, pc };
}

test('aparelho vazio recebe tudo', async () => {
  const { cel, pc } = await par([m('1', 'Óleo')]);
  assert.ok(igual(cel.v, pc.v));
});
test('registros feitos nos dois ao mesmo tempo ficam nos dois', async () => {
  const { n, cel, pc } = await par([m('1', 'Óleo')]);
  cel.v[0].manut.push(m('2', 'Pneus')); pc.v[0].manut.push(m('3', 'Bateria'));
  await s(cel, n); await s(pc, n); await s(cel, n);
  assert.deepEqual(ids(cel), ['1', '2', '3']); assert.deepEqual(ids(pc), ['1', '2', '3']);
});
test('exclusão chega ao outro e não volta', async () => {
  const { n, cel, pc } = await par([m('1', 'Óleo'), m('2', 'Pneus')]);
  cel.v[0].manut.pop();
  await s(cel, n); await s(pc, n); await s(cel, n);
  assert.deepEqual(ids(cel), ['1']); assert.deepEqual(ids(pc), ['1']);
});
test('edição vence exclusão', async () => {
  const { n, cel, pc } = await par([m('1', 'Óleo')]);
  cel.v[0].manut = []; pc.v[0].manut[0].obs = 'nota';
  await s(cel, n); await s(pc, n); await s(cel, n);
  assert.equal(cel.v[0].manut[0].obs, 'nota');
});
test('aparelho que perdeu os dados não apaga a nuvem', async () => {
  const { n, cel } = await par([m('1', 'Óleo')]);
  cel.v = [];
  await s(cel, n);
  assert.deepEqual(ids(cel), ['1']); assert.equal(n.doc.length, 1);
});
test('documento da nuvem apagado é recriado pelo aparelho', async () => {
  const { n, cel } = await par([m('1', 'Óleo')]);
  n.doc = null; await s(cel, n);
  assert.deepEqual(ids(cel), ['1']); assert.equal(n.doc[0].manut.length, 1);
});
test('registro feito durante o envio não se perde', async () => {
  const { n, cel } = await par([m('1', 'Óleo')]);
  n.antes = () => { cel.v[0].manut.push(m('9', 'Velas')); };
  await s(cel, n); await s(cel, n);
  assert.deepEqual(ids(cel), ['1', '9']); assert.equal(n.doc[0].manut.length, 2);
});
test('ordem diferente dos carros não gera gravação sem fim', async () => {
  const { n, cel, pc } = await par([]);
  cel.v.push(carro('b')); await s(cel, n); await s(pc, n);
  pc.v.reverse();
  const g = n.gravacoes;
  for (let i = 0; i < 4; i++){ await s(pc, n); await s(cel, n); }
  assert.equal(n.gravacoes, g);
});
test('mesmo carro nos dois aparelhos: junta sem repetir', async () => {
  const n = nuvem();
  const cel = aparelho([carro('a', [m('1', 'Óleo do motor')], { plano: [{ id: 'p1', item: 'Pneus', fonte: 'voce', km: 9 }] })]);
  const pc = aparelho([carro('z', [m('8', 'oleo do motor'), m('9', 'Bateria')], { kmAtual: 2000, plano: [{ id: 'p2', item: 'Pneus', fonte: 'perfil', km: 5 }] })]);
  await s(cel, n);
  unirParecidos(pc, n.doc, () => true);
  await s(pc, n); await s(cel, n);
  assert.equal(cel.v.length, 1); assert.deepEqual(ids(cel), ['1', '9']);
  assert.equal(cel.v[0].kmAtual, 2000);
  assert.equal(cel.v[0].plano.length, 1); assert.equal(cel.v[0].plano[0].km, 9);
  assert.ok(igual(cel.v, pc.v));
});
test('resposta "não é o mesmo" mantém dois carros; placas diferentes nem perguntam', async () => {
  const n = nuvem(); n.doc = [carro('a', [], { placa: 'AAA1A11' })];
  const pc = aparelho([carro('z')]);
  unirParecidos(pc, n.doc, () => false); await s(pc, n);
  assert.equal(pc.v.length, 2);
  let perguntas = 0; n.doc = [carro('a', [], { placa: 'AAA1A11' })];
  unirParecidos(aparelho([carro('y', [], { placa: 'BBB2B22' })]), n.doc, () => { perguntas++; return true; });
  assert.equal(perguntas, 0);
});
test('falha ao gravar no aparelho não avança a base', async () => {
  const { n, cel, pc } = await par([m('1', 'Óleo')]);
  cel.v[0].manut.push(m('2', 'Pneus')); await s(cel, n);
  const ok = pc.aplicar; pc.aplicar = () => false;
  assert.equal(await s(pc, n), false);
  pc.aplicar = ok; await s(pc, n);
  assert.deepEqual(ids(pc), ['1', '2']); assert.equal(n.doc[0].manut.length, 2);
});
