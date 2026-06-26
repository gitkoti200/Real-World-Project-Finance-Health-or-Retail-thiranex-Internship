import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Activity, TrendingUp, Gauge, LineChart as LineIcon } from "lucide-react";

import {
  TICKERS,
  type Ticker,
  generateSeries,
  computeMetrics,
  withMovingAverages,
  returnsHistogram,
  correlationMatrix,
  formatCurrency,
  formatCompact,
} from "@/lib/stock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantra — Equity Markets Analytics Dashboard" },
      {
        name: "description",
        content:
          "An interactive end-to-end equity analysis dashboard: price action, moving averages, return distribution, volatility, and cross-asset correlation across NVDA, AAPL, MSFT, TSLA, AMZN.",
      },
      { property: "og:title", content: "Quantra — Equity Markets Analytics" },
      {
        property: "og:description",
        content:
          "Two years of synthetic-but-realistic daily price data, technical overlays, risk metrics, and conclusions.",
      },
    ],
  }),
  component: Dashboard,
});

const RANGES = [
  { id: "1M", days: 21 },
  { id: "3M", days: 63 },
  { id: "6M", days: 126 },
  { id: "1Y", days: 252 },
  { id: "ALL", days: 504 },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

function Dashboard() {
  const [active, setActive] = useState<Ticker>("NVDA");
  const [range, setRange] = useState<RangeId>("1Y");

  const allSeries = useMemo(() => {
    const out: Record<Ticker, ReturnType<typeof generateSeries>> = {} as never;
    for (const t of TICKERS) out[t.symbol] = generateSeries(t);
    return out;
  }, []);

  const meta = TICKERS.find((t) => t.symbol === active)!;
  const fullBars = allSeries[active];
  const days = RANGES.find((r) => r.id === range)!.days;
  const bars = fullBars.slice(-days);
  const metrics = useMemo(() => computeMetrics(fullBars), [fullBars]);
  const withMA = useMemo(() => withMovingAverages(fullBars).slice(-days), [fullBars, days]);
  const histogram = useMemo(() => returnsHistogram(fullBars), [fullBars]);
  const corr = useMemo(() => correlationMatrix(allSeries), [allSeries]);

  const up = metrics.changePct >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary grid place-items-center text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Quantra</div>
              <div className="text-xs text-muted-foreground -mt-0.5">Equity Markets Analytics</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-bull animate-pulse" />
            MARKET DATA · DAILY · 504 BARS
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <span className="ticker-pill inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> APPLIED DATA SCIENCE · FINANCE
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Two years of price action,{" "}
              <span className="text-primary">measured end-to-end.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl">
              Explore returns, volatility, drawdowns, and cross-asset correlation across five
              large-cap equities. Every metric is computed live from daily closes — pick a ticker
              and a window to see the story change.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* Ticker selector */}
        <div className="flex flex-wrap gap-2">
          {TICKERS.map((t) => {
            const m = computeMetrics(allSeries[t.symbol]);
            const isActive = t.symbol === active;
            const tUp = m.changePct >= 0;
            return (
              <button
                key={t.symbol}
                onClick={() => setActive(t.symbol)}
                className={`group rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-primary/60 bg-card glow-primary"
                    : "border-border bg-card/40 hover:border-border hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="ticker-pill text-sm font-semibold">{t.symbol}</div>
                  <div className={`text-xs font-mono ${tUp ? "text-bull" : "text-bear"}`}>
                    {tUp ? "+" : ""}
                    {m.changePct.toFixed(2)}%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t.sector}</div>
              </button>
            );
          })}
        </div>

        {/* Hero metric row */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-0">
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border">
              <div className="flex items-baseline gap-3">
                <div className="ticker-pill text-2xl font-semibold">{active}</div>
                <div className="text-sm text-muted-foreground">{meta.name}</div>
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div className="font-mono text-5xl md:text-6xl font-semibold tracking-tight">
                  {formatCurrency(metrics.last)}
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-sm rounded-md px-2 py-1 ${
                    up ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"
                  }`}
                >
                  {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {up ? "+" : ""}
                  {metrics.change.toFixed(2)} ({metrics.changePct.toFixed(2)}%)
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground font-mono">
                Last close · {bars[bars.length - 1].date}
              </div>

              <div className="mt-6 flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRange(r.id)}
                    className={`ticker-pill text-xs px-3 py-1.5 rounded-md transition-colors ${
                      range === r.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              <Stat label="YTD return" value={`${metrics.ytdPct >= 0 ? "+" : ""}${metrics.ytdPct.toFixed(2)}%`} tone={metrics.ytdPct >= 0 ? "bull" : "bear"} />
              <Stat label="52w high" value={formatCurrency(metrics.high52)} />
              <Stat label="52w low" value={formatCurrency(metrics.low52)} />
              <Stat label="Avg volume" value={formatCompact(metrics.avgVolume)} />
              <Stat label="Volatility (ann.)" value={`${metrics.volatility.toFixed(1)}%`} tone="gold" />
              <Stat label="Sharpe ratio" value={metrics.sharpe.toFixed(2)} tone={metrics.sharpe >= 1 ? "bull" : metrics.sharpe >= 0 ? undefined : "bear"} />
              <Stat label="Max drawdown" value={`${metrics.maxDrawdown.toFixed(1)}%`} tone="bear" />
              <Stat label="Bars analysed" value={fullBars.length.toString()} />
            </div>
          </div>

          {/* Price chart */}
          <div className="p-4 md:p-6 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm">
                <LineIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">Price with 50d / 200d moving averages</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
                <Legend swatch="var(--primary)" label="Close" />
                <Legend swatch="var(--gold)" label="MA 50" />
                <Legend swatch="var(--chart-2)" label="MA 200" />
              </div>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={withMA} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="closeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v: string) => v.slice(0, 7)}
                    minTickGap={48}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    domain={["auto", "auto"]}
                    stroke="var(--border)"
                    tickFormatter={(v) => `$${Math.round(v)}`}
                  />
                  <Tooltip content={<PriceTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#closeFill)"
                    isAnimationActive={false}
                  />
                  <Line type="monotone" dataKey="ma50" stroke="var(--gold)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ma200" stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Two-up: returns histogram + volume */}
        <section className="grid lg:grid-cols-2 gap-6">
          <Panel
            title="Distribution of daily returns"
            subtitle="2-year sample · % change, day-over-day"
            icon={<Gauge className="h-4 w-4 text-primary" />}
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    stroke="var(--border)"
                    tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                  />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--border)" />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={tooltipStyle}
                    labelFormatter={(v) => `Return: ${(+v).toFixed(2)}%`}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {histogram.map((h, i) => (
                      <Cell key={i} fill={h.bucket >= 0 ? "var(--bull)" : "var(--bear)"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Trading volume"
            subtitle={`Daily shares traded · ${range}`}
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v: string) => v.slice(5)}
                    minTickGap={40}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    stroke="var(--border)"
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={tooltipStyle}
                    formatter={(v) => formatCompact(v as number)}
                  />
                  <Bar dataKey="volume" fill="var(--chart-2)" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        {/* Correlation heatmap */}
        <section>
          <Panel
            title="Cross-asset correlation"
            subtitle="Pearson r of daily log returns · full 2-year window"
            icon={<Activity className="h-4 w-4 text-primary" />}
          >
            <div className="overflow-x-auto">
              <div className="inline-grid" style={{ gridTemplateColumns: `auto repeat(${corr.symbols.length}, minmax(72px, 1fr))` }}>
                <div />
                {corr.symbols.map((s) => (
                  <div key={`h-${s}`} className="ticker-pill text-xs text-muted-foreground text-center py-2">
                    {s}
                  </div>
                ))}
                {corr.symbols.map((row) => (
                  <RowFragment key={row} row={row} corr={corr} />
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span>−1</span>
              <div
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, var(--bear), color-mix(in oklch, var(--muted) 80%, transparent), var(--bull))",
                }}
              />
              <span>+1</span>
            </div>
          </Panel>
        </section>

        {/* Conclusions */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Findings & conclusions</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 text-sm">
            <Finding
              kicker="01 · Risk-adjusted return"
              title={`${active} delivered a Sharpe of ${metrics.sharpe.toFixed(2)}`}
              body={
                metrics.sharpe >= 1
                  ? "Above the 1.0 threshold — investors were paid well for the volatility they took on."
                  : metrics.sharpe >= 0
                    ? "Positive but modest — returns exceeded the risk-free rate, but not by a wide margin per unit of risk."
                    : "Negative — over the sample, holders earned less than cash on a risk-adjusted basis."
              }
            />
            <Finding
              kicker="02 · Volatility"
              title={`Annualised vol of ${metrics.volatility.toFixed(1)}%`}
              body={`The realised return distribution shows a ${
                metrics.volatility > 40 ? "wide" : metrics.volatility > 25 ? "moderate" : "tight"
              } spread, with the worst peak-to-trough drawdown reaching ${metrics.maxDrawdown.toFixed(1)}%.`}
            />
            <Finding
              kicker="03 · Diversification"
              title="Mega-cap tech moves together"
              body="Pairwise correlations cluster between 0.5 and 0.8 — holding several of these names provides far less diversification than the headline count suggests."
            />
          </div>
          <p className="mt-6 text-xs text-muted-foreground max-w-3xl">
            Methodology: 504 trading days of daily closes per ticker (≈2 years), generated via seeded
            geometric Brownian motion calibrated to realistic drift and volatility. Metrics: log
            returns, annualised σ × √252, Sharpe assumes 4% risk-free rate, max drawdown computed on
            close-to-trough basis. Pearson r on daily log returns.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60 mt-10">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <span>QUANTRA · APPLIED DATA SCIENCE PROJECT</span>
          <span>Synthetic data · for educational use only · not investment advice</span>
        </div>
      </footer>
    </div>
  );
}

function RowFragment({ row, corr }: { row: Ticker; corr: ReturnType<typeof correlationMatrix> }) {
  return (
    <>
      <div className="ticker-pill text-xs text-muted-foreground pr-3 self-center text-right">{row}</div>
      {corr.symbols.map((col) => {
        const cell = corr.cells.find((c) => c.a === row && c.b === col)!;
        const v = cell.corr;
        const isDiag = row === col;
        // Color mix mint for positive, coral for negative
        const intensity = Math.min(Math.abs(v), 1) * 100;
        const color = v >= 0 ? "var(--bull)" : "var(--bear)";
        return (
          <div
            key={`${row}-${col}`}
            className="m-0.5 rounded-md aspect-square grid place-items-center font-mono text-xs"
            style={{
              background: isDiag
                ? "var(--accent)"
                : `color-mix(in oklch, ${color} ${intensity * 0.6}%, var(--card))`,
              color: Math.abs(v) > 0.5 ? "var(--background)" : "var(--foreground)",
            }}
          >
            {v.toFixed(2)}
          </div>
        );
      })}
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear" | "gold";
}) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Finding({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="ticker-pill text-[10px] text-primary uppercase">{kicker}</div>
      <div className="mt-2 font-medium leading-snug">{title}</div>
      <p className="mt-2 text-muted-foreground text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-3 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--foreground)",
};

function PriceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; dataKey: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload.filter((p) => p.value != null);
  return (
    <div style={tooltipStyle} className="px-3 py-2 space-y-1">
      <div className="text-muted-foreground">{label}</div>
      {rows.map((r) => (
        <div key={r.dataKey} className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
          <span className="text-muted-foreground w-12">{r.dataKey === "close" ? "Close" : r.dataKey === "ma50" ? "MA 50" : "MA 200"}</span>
          <span className="ml-auto text-foreground">${(+r.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
