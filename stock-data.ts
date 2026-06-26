// Synthetic-but-realistic daily stock data generated deterministically.
// Geometric Brownian Motion seeded per ticker so the dashboard is reproducible
// without any network dependency.

export type Ticker = "AAPL" | "MSFT" | "NVDA" | "TSLA" | "AMZN";

export interface StockMeta {
  symbol: Ticker;
  name: string;
  sector: string;
  start: number; // starting price
  drift: number; // annualized drift
  vol: number;   // annualized vol
  seed: number;
}

export const TICKERS: StockMeta[] = [
  { symbol: "NVDA", name: "NVIDIA Corp.",    sector: "Semiconductors", start: 48,  drift: 0.85, vol: 0.55, seed: 7 },
  { symbol: "AAPL", name: "Apple Inc.",      sector: "Consumer Tech",  start: 130, drift: 0.18, vol: 0.26, seed: 1 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Software",       start: 235, drift: 0.22, vol: 0.24, seed: 2 },
  { symbol: "TSLA", name: "Tesla, Inc.",     sector: "Autos & Energy", start: 195, drift: 0.05, vol: 0.62, seed: 4 },
  { symbol: "AMZN", name: "Amazon.com",      sector: "E-commerce",     start: 102, drift: 0.16, vol: 0.32, seed: 5 },
];

export interface Bar {
  date: string;        // ISO yyyy-mm-dd
  t: number;           // ms timestamp for charts
  close: number;
  volume: number;
}

// Mulberry32 PRNG — deterministic per seed
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform from a uniform PRNG
function gaussian(rand: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const TRADING_DAYS = 504; // ~2 years

export function generateSeries(meta: StockMeta): Bar[] {
  const rand = mulberry32(meta.seed * 9973 + 17);
  const dt = 1 / 252;
  const out: Bar[] = [];
  let price = meta.start;

  const end = new Date("2025-06-20T00:00:00Z");
  const dates: Date[] = [];
  const cur = new Date(end);
  while (dates.length < TRADING_DAYS) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  for (let i = 0; i < dates.length; i++) {
    const z = gaussian(rand);
    const shock = (meta.drift - 0.5 * meta.vol * meta.vol) * dt + meta.vol * Math.sqrt(dt) * z;
    price = price * Math.exp(shock);
    const d = dates[i];
    const iso = d.toISOString().slice(0, 10);
    const volBase = meta.symbol === "NVDA" ? 4.2e8 : meta.symbol === "TSLA" ? 1.1e8 : 6e7;
    const volume = Math.round(volBase * (0.6 + rand() * 0.9) * (1 + Math.abs(z) * 0.4));
    out.push({ date: iso, t: d.getTime(), close: +price.toFixed(2), volume });
  }
  return out;
}

export interface Metrics {
  last: number;
  change: number;        // absolute
  changePct: number;     // %
  ytdPct: number;
  high52: number;
  low52: number;
  volatility: number;    // annualized %
  sharpe: number;        // assuming rf=4%
  maxDrawdown: number;   // %
  avgVolume: number;
}

export function computeMetrics(bars: Bar[]): Metrics {
  const last = bars[bars.length - 1].close;
  const prev = bars[bars.length - 2].close;
  const change = last - prev;
  const changePct = (change / prev) * 100;

  // YTD
  const lastYear = new Date(bars[bars.length - 1].date).getUTCFullYear();
  const ytdStart = bars.find((b) => new Date(b.date).getUTCFullYear() === lastYear)!;
  const ytdPct = ((last - ytdStart.close) / ytdStart.close) * 100;

  const window = bars.slice(-252);
  const high52 = Math.max(...window.map((b) => b.close));
  const low52 = Math.min(...window.map((b) => b.close));

  // Daily log returns over last year
  const rets: number[] = [];
  for (let i = 1; i < window.length; i++) {
    rets.push(Math.log(window[i].close / window[i - 1].close));
  }
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  const dailyVol = Math.sqrt(variance);
  const volatility = dailyVol * Math.sqrt(252) * 100;
  const annRet = mean * 252;
  const sharpe = (annRet - 0.04) / (dailyVol * Math.sqrt(252));

  // Max drawdown over full range
  let peak = bars[0].close;
  let mdd = 0;
  for (const b of bars) {
    if (b.close > peak) peak = b.close;
    const dd = (b.close - peak) / peak;
    if (dd < mdd) mdd = dd;
  }

  const avgVolume = window.reduce((s, b) => s + b.volume, 0) / window.length;

  return {
    last,
    change,
    changePct,
    ytdPct,
    high52,
    low52,
    volatility,
    sharpe,
    maxDrawdown: mdd * 100,
    avgVolume,
  };
}

export function withMovingAverages(bars: Bar[]) {
  return bars.map((b, i) => {
    const ma50 = i >= 49 ? avg(bars.slice(i - 49, i + 1).map((x) => x.close)) : null;
    const ma200 = i >= 199 ? avg(bars.slice(i - 199, i + 1).map((x) => x.close)) : null;
    return { ...b, ma50, ma200 };
  });
}

function avg(xs: number[]) {
  return +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2);
}

export function returnsHistogram(bars: Bar[], buckets = 24) {
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    rets.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
  }
  const min = Math.min(...rets);
  const max = Math.max(...rets);
  const step = (max - min) / buckets;
  const out = Array.from({ length: buckets }, (_, i) => ({
    bucket: +(min + step * (i + 0.5)).toFixed(2),
    count: 0,
  }));
  for (const r of rets) {
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor((r - min) / step)));
    out[idx].count++;
  }
  return out;
}

export function correlationMatrix(seriesByTicker: Record<Ticker, Bar[]>) {
  const symbols = Object.keys(seriesByTicker) as Ticker[];
  const returns: Record<string, number[]> = {};
  for (const s of symbols) {
    const bars = seriesByTicker[s];
    const r: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      r.push(Math.log(bars[i].close / bars[i - 1].close));
    }
    returns[s] = r;
  }
  const out: { a: Ticker; b: Ticker; corr: number }[] = [];
  for (const a of symbols) {
    for (const b of symbols) {
      out.push({ a, b, corr: pearson(returns[a], returns[b]) });
    }
  }
  return { symbols, cells: out };
}

function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return +(num / Math.sqrt(dx * dy)).toFixed(2);
}

export function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function formatCompact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
