/* Rodar: node --test testes/modelos.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELOS, MODELOS_IDX } from '../js/planos/modelos.js';
import { ITENS_BASE, PERGUNTAS_PERFIL } from '../js/planos/base.js';

test('modelos: sem repetição, perfil válido e itens que existem', () => {
  assert.equal(new Set(MODELOS.map(m => m.id)).size, MODELOS.length);
  assert.equal(new Set(MODELOS.map(m => m.nome)).size, MODELOS.length);
  const nomes = new Set(ITENS_BASE.map(i => i.item));
  for (const m of MODELOS){
    if (m.herda) assert.ok(MODELOS_IDX[m.herda], m.id);
    for (const [c, v] of Object.entries(m.perfil || {})){
      const q = PERGUNTAS_PERFIL.find(x => x.campo === c);
      assert.ok(q && q.opcoes.some(o => o.valor === v), m.id + ' ' + c);
    }
    for (const a of m.ajustes || []){
      assert.ok(nomes.has(a.item), m.id + ' ' + a.item);
      assert.ok(['manual', 'revista', 'oficina', 'perfil', 'semtroca'].includes(a.fonte), m.id + ' ' + a.item);
    }
    for (const r of m.remover || []) assert.ok(nomes.has(r), m.id + ' ' + r);
  }
});
test('modelo com corrente não leva correia dentada nem o contrário', () => {
  const tem = (m, i) => (m.ajustes || []).some(a => a.item === i);
  for (const m of MODELOS){
    if (tem(m, 'Kit correia dentada + tensor')) assert.equal(m.perfil.sincronismo, 'correia', m.id);
    if (tem(m, 'Corrente de comando')) assert.equal(m.perfil.sincronismo, 'corrente', m.id);
  }
});
