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
test('ritmo usa o último ano e ignora futuro e km vazio', () => {
  const r = k.ritmo([
    { data: '2020-01-01', km: 1000 }, { data: '2026-07-03', km: 148000 }, { data: '2026-08-31', km: 148000 },
    { data: '2026-11-24', km: 153355 }, { data: '2026-11-24', km: 149000 }, { data: '2026-10-01', km: 0 },
    { data: '2030-01-01', km: 999999 }], '2026-11-24');
  assert.equal(Math.round(r.kmDia * 144), 5355);
  assert.equal(r.ultimo, '2026-11-24');
});
test('ritmo sem dados suficientes', () => {
  assert.equal(k.ritmo([], '2026-11-24'), null);
  assert.equal(k.ritmo([{ data: '2026-11-01', km: 1 }, { data: '2026-11-20', km: 900 }], '2026-11-24'), null);
});
test('previsão de data', () => {
  assert.equal(k.preverData(1000, 10, '2026-11-24'), '2027-03-04');
  assert.equal(k.preverData(0, 10, '2026-11-24'), '');
  assert.equal(k.preverData(1e9, 10, '2026-11-24'), '');
});
test('documentos: nível, gasto e próximo', () => {
  const d = (vencimento, o = {}) => ({ id: 'x', tipo: 'IPVA', vencimento, valor: 100, repete: 12, ...o });
  const h = '2026-11-24';
  assert.equal(k.nivelDoc(d('2026-11-23'), h), 'crit');
  assert.equal(k.nivelDoc(d('2026-11-24'), h), 'warn');
  assert.equal(k.nivelDoc(d('2026-12-24'), h), 'warn');
  assert.equal(k.nivelDoc(d('2026-12-25'), h), 'ok');
  assert.equal(k.nivelDoc(d(''), h), 'none');
  assert.equal(k.nivelDoc(d('2020-01-01', { pago: true }), h), 'pago');
  const l = [d('', { pago: true, pagoEm: '2026-01-02' }), d('', { pago: true, pagoEm: '2025-01-02' }), d('')];
  assert.equal(k.gastoDocs(l, '2026'), 100);
  assert.equal(k.gastoDocs(l), 200);
  assert.equal(k.gastoDocs(undefined), 0);
  const p = k.proximoDoc(d('2026-01-31'), 'y', []);
  assert.equal(p.vencimento, '2027-01-31'); assert.equal(p.pago, false); assert.equal(p.valor, 0);
  assert.equal(k.proximoDoc(d('2026-01-31'), 'z', [p]), null);
  assert.equal(k.proximoDoc(d('2026-01-31', { repete: 0 }), 'z', []), null);
});
test('custo total: meses, categorias, sem valor e por km', () => {
  const m = (data, km, p, mo, categoria) => ({ data, km, custoPecas: p, custoMaoObra: mo, categoria });
  const c = k.custos({
    manut: [m('2026-07-03', 148000, 50, 0, 'Motor'), m('2026-08-31', 149000, 100, 20, 'Freios'), m('2026-11-24', 150000, 0, 0, 'Motor'),
      m('2025-11-30', 1, 999, 0, 'Motor'), m('2026-11-30', 1, 999, 0, 'Motor'), m('', 0, 999, 0, 'Motor')],
    abast: [{ data: '2026-11-01', km: 149500, valor: 280 }],
    docs: [{ tipo: 'IPVA', pago: true, pagoEm: '2025-12-01', valor: 1000 }, { tipo: 'Multa', pago: false, valor: 5 }]
  }, '2026-11-24');
  assert.equal(c.meses.length, 12);
  assert.equal(c.meses[0].mes, '2025-12'); assert.equal(c.meses[11].mes, '2026-11');
  assert.equal(c.total, 1450); assert.equal(c.semValor, 1);
  assert.deepEqual(c.categorias.map(x => x.nome), ['IPVA', 'Combustível', 'Freios', 'Motor']);
  assert.equal(c.porKm, 400 / 2000);
  assert.equal(k.custos({}, '2026-01-31').meses[0].mes, '2025-02');
});
test('etanol ou gasolina', () => {
  const f = (km, litros, combustivel, cheio = true, valor = 0, data = '2026-01-01') => ({ id: 'f' + km, km, litros, combustivel, cheio, valor, data });
  const ab = [f(1000, 40, 'Gasolina'), f(1400, 40, 'Gasolina aditivada'), f(1700, 40, 'Etanol'), f(1980, 40, 'Etanol'),
    f(2100, 10, 'Gasolina', false), f(2300, 30, 'Etanol')];
  const c = k.consumosPorCombustivel(ab);
  assert.deepEqual(c.gasolina, { kmL: 10, trechos: 1 });
  assert.deepEqual(c.etanol, { kmL: 7, trechos: 1 });
  assert.equal(k.compararFlex(c, 4, 6).melhor, 'etanol');
  assert.equal(k.compararFlex(c, 5, 6).melhor, 'gasolina');
  assert.equal(k.compararFlex(c, 4.2, 6).melhor, 'igual');
  assert.ok(Math.abs(k.compararFlex(c, 3.5, 6).economia100 - 10) < 1e-9);
  const v = k.compararFlex(k.consumosPorCombustivel([]), 4, 6);
  assert.equal(v.real, false); assert.equal(v.limite, 0.7); assert.equal(v.economia100, 0);
  assert.equal(k.compararFlex(c, 0, 6).preco, false);
  assert.equal(k.ultimoPreco([f(1, 10, 'Etanol', true, 40, '2026-02-01'), f(9, 10, 'Etanol', true, 50, '2026-01-01')], 'etanol'), 4);
  assert.equal(k.ultimoPreco([], 'gasolina'), null);
});
test('item do plano coberto por dianteiros e traseiros', () => {
  const d = { km: 148000, proxKm: 158000 }, t = { km: 149642, proxKm: 159642 }, K = 'amortecedores';
  const r = (o = {}) => ({ 'amortecedores dianteiros': d, 'amortecedores traseiros': t, ...o });
  assert.equal(k.cobertoPorEixo(K, r()), true);
  assert.equal(k.cobertoPorEixo(K, { 'amortecedores dianteiros': d }), false);
  assert.equal(k.cobertoPorEixo(K, r({ 'amortecedores traseiros': { km: 1, proxKm: 0 } })), false);
  assert.equal(k.cobertoPorEixo(K, r({ amortecedores: { km: 152000 } })), false);
  assert.equal(k.cobertoPorEixo(K, r({ amortecedores: { km: 100000 } })), true);
});
