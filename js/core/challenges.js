import { executeTrade, markPortfolio, replayPortfolio } from './portfolio-engine.js';
import { ptax } from '../data/historico-ptax.js';

export const challengeCash = 1_000_000;
export const allocations = [25, 50, 75];
const maxOrders = 100;
const days = 20;
const basket = { id: 'CESTA', scale: 1 };
const dollars = { id: 'USD-100', scale: 1 };
const bankSource = 'https://dadosabertos.bcb.gov.br/dataset/1-taxa-de-cambio---livre---dolar-americano-venda---diario/resource/4494fe1f-a3f9-4aba-a342-17dfea6f370a';

function currencyEvent(title, rows, description) {
  return { title, rows, description, source: bankSource, sourceLabel: 'Banco Central · série SGS 1',
    change: rows.at(-1)[1] / rows[0][1] - 1 };
}

export const historicalEvents = new Map([
  ['dolar-marco', currencyEvent('Dólar em alta · março de 2020', ptax.marco,
    'De 28/02 a 31/03, o dólar comercial passou de R$ 4,4987 para R$ 5,1987, alta de 15,56%.')],
  ['dolar-novembro', currencyEvent('Dólar em queda · novembro de 2020', ptax.novembro,
    'De 30/10 a 30/11, o dólar comercial passou de R$ 5,7718 para R$ 5,3317, queda de 7,63%.')],
  ['bolsa-marco', { title: 'Bolsa sob pressão · março de 2020', change: -.10,
    description: 'A B3 registrou interrupções durante a pandemia. Uma queda de 10% do Ibovespa em relação ao fechamento anterior era o primeiro gatilho de suspensão intradiária.',
    source: 'https://www.b3.com.br/data/files/51/A5/27/60/52AF0710CF51CE07AC094EA8/CE%20009-2020-VPC%20-%20Limite%20de%20Oscila%C3%A7%C3%A3o_REVISADO_R_2%20%28003%29.pdf',
    sourceLabel: 'B3 · comunicado de março de 2020' }],
  ['bolsa-novembro', { title: 'Bolsa em recuperação · novembro de 2020', change: .159,
    description: 'O Ibovespa ganhou 15,90% em novembro de 2020. Esse percentual é mensal e serve como referência de intensidade.',
    source: 'https://borainvestir.b3.com.br/noticias/mercado/ibovespa-sobe-092-e-mantem-127-mil-pontos-em-melhor-mes-em-3-anos-dolar-sobe-para-r-491/',
    sourceLabel: 'B3 · balanço mensal do Ibovespa' }]
]);

function randomSequence(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function timeline(run) {
  if (run.kind === 'replay') {
    const event = historicalEvents.get(run.episode);
    return { event, asset: dollars, points: event.rows.map(([date, cents]) => ({ date, cents })) };
  }

  const random = randomSequence(run.seed);
  const events = [...historicalEvents.values()];
  const event = events[Math.floor(random() * events.length)];
  const hasShock = random() >= .2;
  const start = 3 + Math.floor(random() * 9);
  const duration = 2 + Math.floor(random() * 4);
  const impulse = event.change * (.75 + .5 * random());
  const continuation = (random() - .5) * .04;
  const points = [{ cents: 10000 }];
  for (let day = 1; day <= days; day++) {
    const shock = hasShock && day >= start && day < start + duration;
    const drift = hasShock && day >= start + duration && day < start + duration + 5 ? continuation : 0;
    const change = (random() - .5) * .018 + (shock ? (1 + impulse) ** (1 / duration) - 1 : drift);
    points.push({ cents: Math.max(1, Math.round(points.at(-1).cents * (1 + change))) });
  }
  return { event, asset: basket, points, hasShock };
}

function context({ asset, points }) {
  return {
    openingCash: challengeCash,
    assetFor: id => id === asset.id ? asset : undefined,
    timestampFor: day => points[day]?.date ?? String(day)
  };
}

function orderAt(tape, day, side, units, id) {
  return { id, side, units, assetId: tape.asset.id, day, cents: tape.points[day].cents,
    timestamp: context(tape).timestampFor(day) };
}

function initialOrders(run, tape) {
  const units = Math.floor(challengeCash * run.allocation / 100 / tape.points[0].cents);
  return units ? executeTrade([], orderAt(tape, 0, 'buy', units, 'posicao-inicial'), context(tape)) : [];
}

export function createChallenge({ id, allocation, seed, episode = null }) {
  return validateChallenge({ id, allocation, seed, episode, kind: episode === null ? 'blind' : 'replay', day: 0, orders: [] });
}

export function validateChallenge(run) {
  if (run === null) return null;
  if (!run || typeof run.id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(run.id) ||
      !allocations.includes(run.allocation) || !Number.isInteger(run.seed) || run.seed < 0 || run.seed > 0xffffffff ||
      !['blind', 'replay'].includes(run.kind) || (run.kind === 'blind' ? run.episode !== null : !historicalEvents.get(run.episode)?.rows) ||
      !Array.isArray(run.orders) || run.orders.length > maxOrders) throw new Error('Desafio histórico inválido.');
  const tape = timeline(run);
  if (!Number.isInteger(run.day) || run.day < 0 || run.day >= tape.points.length) throw new Error('Dia do desafio inválido.');
  const orders = run.orders.map(order => {
    if (!order || order.id === 'posicao-inicial' || !Number.isInteger(order.day) || order.day < 0 ||
        order.day > run.day || order.day === tape.points.length - 1 ||
        order.cents !== tape.points[order.day].cents) throw new Error('Ordem fora da cotação revelada.');
    return Object.fromEntries(['id', 'side', 'assetId', 'units', 'cents', 'day', 'timestamp', 'gross', 'fees', 'net',
      'cashBefore', 'cashAfter', 'costSold', 'realized'].map(key => [key, order[key]]));
  });
  replayPortfolio([...initialOrders(run, tape), ...orders], context(tape));
  return { id: run.id, kind: run.kind, allocation: run.allocation, seed: run.seed, episode: run.episode, day: run.day, orders };
}

export function advanceChallenge(run) {
  return run.day < timeline(run).points.length - 1 ? { ...run, day: run.day + 1 } : run;
}

export function tradeChallenge(run, { id, side, units }) {
  const tape = timeline(run);
  if (run.day === tape.points.length - 1) throw new Error('A rodada já terminou.');
  if (run.orders.length >= maxOrders) throw new Error('Limite de operações da rodada atingido.');
  if (id === 'posicao-inicial') throw new Error('Identificador de ordem inválido.');
  const result = executeTrade([...initialOrders(run, tape), ...run.orders], orderAt(tape, run.day, side, units, id), context(tape));
  return { ...run, orders: [...run.orders, result.at(-1)] };
}

export function challengeView(run) {
  const tape = timeline(run);
  const revealed = tape.points.slice(0, run.day + 1);
  const start = initialOrders(run, tape);
  const orders = [...start, ...run.orders];
  const rules = context(tape);
  const price = revealed.at(-1).cents;
  const portfolio = markPortfolio(orders, () => price, rules);
  const finished = run.day === tape.points.length - 1;
  let result;
  if (finished) {
    let peak = challengeCash;
    let drawdown = 0;
    for (const [day, point] of revealed.entries()) {
      const wealth = markPortfolio(orders.filter(order => order.day <= day), () => point.cents, rules).wealth;
      peak = Math.max(peak, wealth);
      drawdown = Math.max(drawdown, (peak - wealth) / peak);
    }
    const { title, description, source, sourceLabel } = tape.event;
    result = { hold: markPortfolio(start, () => price, rules).wealth, cash: challengeCash, drawdown, hasShock: tape.hasShock,
      event: { title, description, source, sourceLabel }, marketChange: price / revealed[0].cents - 1 };
  }
  return { revealed, portfolio, finished, result };
}
