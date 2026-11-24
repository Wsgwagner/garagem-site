/* Rodar: node --test testes/contas.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as k from '../js/contas.js';

const a = (id, km, litros, cheio = true) => ({ id, km, litros, cheio, data: '2026-01-01' });

test('meses no fim do mês', () => {
  assert.equal(k.somaMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(k.somaMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(k.somaMeses('2026-08-31', 6), '2027-02-28');
  assert.equal(k.somaMeses('2026-12-15', 12), '2027-12-15');
  assert.equal(k.somaMeses('', 6), '');
});
test('parcial entra na conta do consumo', () => {
  const r = k.consumosDe([a('1', 1000, 40), a('2', 1200, 20, false), a('3', 1400, 20)]);
  assert.equal(r.length, 1);
  assert.equal(r[0].kmL, 10);
});
test('parcial antes do primeiro cheio não conta', () => {
  assert.equal(k.consumosDe([a('0', 900, 10, false), a('1', 1000, 40), a('2', 1400, 40)])[0].kmL, 10);
});
test('parcial sem litros invalida só aquele trecho', () => {
  const r = k.consumosDe([a('1', 1000, 40), a('2', 1200, 0, false), a('3', 1400, 20), a('4', 1600, 20)]);
  assert.deepEqual(r.map(x => x.id), ['4']);
});
test('média pesa pelos km', () => {
  assert.equal(k.mediaDe([{ kmRodados: 100, litros: 20 }, { kmRodados: 900, litros: 80 }]), 10);
  assert.equal(k.mediaDe([]), null);
});
test('sem registro: só é em dia se a primeira troca não chegou', () => {
  const iv = { km: 10000, meses: 12 };
  assert.deepEqual(k.estimar(iv, 156000, '2013', 2026), { proxKm: 160000, confirmar: true });
  assert.equal(k.estimar(iv, 160000, '', 2026).confirmar, true);
  assert.deepEqual(k.estimar(iv, 3000, '2026', 2026), { proxKm: 10000, confirmar: false });
  assert.equal(k.estimar(iv, 3000, '2020', 2026).confirmar, true);
});
test('corrigir ou excluir o registro devolve o odômetro', () => {
  const v = { kmAtual: 156000 }, r = { km: 1560000 }, r2 = { km: 156100 }, r3 = { km: 156100 };
  k.aplicarKm(v, null, r); assert.equal(v.kmAtual, 1560000);
  k.aplicarKm(v, r, r2); assert.equal(v.kmAtual, 156100);
  k.aplicarKm(v, r2, r3); assert.equal(r3.kmAntes, 156000);
  k.desfazerKm(v, r3); assert.equal(v.kmAtual, 156000);
});
test('excluir registro não mexe no odômetro digitado depois', () => {
  const v = { kmAtual: 100 }, r = { km: 200 };
  k.aplicarKm(v, null, r); v.kmAtual = 300;
  assert.equal(k.desfazerKm(v, r), false);
  assert.equal(v.kmAtual, 300);
});
test('salto suspeito', () => {
  assert.ok(k.saltoSuspeito(156000, 1560000));
  assert.ok(!k.saltoSuspeito(0, 156000));
  assert.ok(!k.saltoSuspeito(156000, 157000));
});
test('rateio fecha com o total', () => {
  assert.deepEqual(k.ratear(100, 3), [33.34, 33.33, 33.33]);
  assert.deepEqual(k.ratear(0, 2), [0, 0]);
});
