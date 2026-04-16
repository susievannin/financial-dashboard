"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BanknoteArrowDown,
  BriefcaseBusiness,
  DollarSign,
  Landmark,
  ReceiptText
} from "lucide-react";
import { getFilteredRows, monthLabel, Period, sumTotals, type FinanceRow } from "@/lib/finance";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? "compact" : "standard"
  }).format(value);

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function KPI({
  label,
  value,
  delta,
  trend,
  icon
}: {
  label: string;
  value: number;
  delta: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
}) {
  const trendClass =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-500";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Landmark;

  return (
    <article className="dashboard-card p-5 ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="rounded-lg bg-brand-50 p-2 text-brand-700">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{formatCurrencyFull(value)}</p>
      <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${trendClass}`}>
        <TrendIcon className="h-4 w-4" />
        {delta}
      </p>
    </article>
  );
}

type DashboardProps = {
  rows: FinanceRow[];
};

export default function Dashboard({ rows }: DashboardProps) {
  const [period, setPeriod] = useState<Period>("Monthly");

  const revenueTrend = useMemo(
    () =>
      rows.map((row) => ({
        month: monthLabel(row.date),
        revenue: row.revenue
      })),
    [rows]
  );

  const planVsActual = useMemo(
    () =>
      rows.slice(-6).map((row) => ({
        month: monthLabel(row.date),
        actual: row.revenue,
        plan: row.plan_revenue
      })),
    [rows]
  );

  const revenueGrowthTrend = useMemo(
    () =>
      rows.map((row, index) => {
        const prevRevenue = index > 0 ? rows[index - 1].revenue : 0;
        const growth = prevRevenue > 0 ? ((row.revenue - prevRevenue) / prevRevenue) * 100 : 0;
        return {
          month: monthLabel(row.date),
          growth
        };
      }),
    [rows]
  );

  const currentRows = useMemo(() => getFilteredRows(rows, period), [rows, period]);
  const previousRows = useMemo(() => {
    if (currentRows.length === 0) {
      return [];
    }

    const currentStartDate = new Date(currentRows[0].date);
    return rows.filter((row) => new Date(row.date) < currentStartDate);
  }, [rows, currentRows]);

  const metrics = useMemo(
    () => sumTotals(currentRows),
    [currentRows]
  );

  const previousMetrics = useMemo(() => sumTotals(previousRows), [previousRows]);

  const progressPct =
    metrics.planRevenue > 0 ? Math.min(Math.round((metrics.revenue / metrics.planRevenue) * 100), 100) : 0;
  const variance = metrics.revenue - metrics.planRevenue;
  const grossMargin = metrics.revenue > 0 ? (metrics.grossProfit / metrics.revenue) * 100 : 0;
  const netMargin = metrics.revenue > 0 ? (metrics.netIncome / metrics.revenue) * 100 : 0;
  const corRatio = metrics.revenue > 0 ? (metrics.cor / metrics.revenue) * 100 : 0;
  const opexRatio = metrics.revenue > 0 ? (metrics.opex / metrics.revenue) * 100 : 0;

  const deltaPct = (current: number, previous: number) => {
    if (previous === 0) {
      return 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const revenueDelta = deltaPct(metrics.revenue, previousMetrics.revenue);
  const corDelta = deltaPct(metrics.cor, previousMetrics.cor);
  const opexDelta = deltaPct(metrics.opex, previousMetrics.opex);
  const netDelta = deltaPct(metrics.netIncome, previousMetrics.netIncome);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Finance</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Executive Dashboard</h1>
          </div>
          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
            {(["Monthly", "QTD", "YTD"] as Period[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  period === option ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </header>

        <section className="dashboard-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Revenue progress ({period})</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrencyFull(metrics.revenue)}{" "}
                <span className="text-base text-slate-400">/ {formatCurrencyFull(metrics.planRevenue)}</span>
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{progressPct}%</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-slate-200">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        <section className="dashboard-card bg-gradient-to-r from-white to-brand-50/50 p-6">
          <h2 className="text-base font-semibold text-slate-900">Executive Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            {period} performance shows {formatCurrency(metrics.revenue)} in revenue against{" "}
            {formatCurrency(metrics.planRevenue)} plan, a{" "}
            <span className={variance >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
              {variance >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(variance))}
            </span>{" "}
            variance.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gross Margin</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(grossMargin)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net Margin</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(netMargin)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">COR / Opex Ratio</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatPercent(corRatio)} / {formatPercent(opexRatio)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI
            label="Revenue"
            value={metrics.revenue}
            delta={`${revenueDelta >= 0 ? "+" : ""}${formatPercent(revenueDelta)} vs previous period`}
            trend={revenueDelta >= 0 ? "up" : "down"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPI
            label="Cost of Revenue"
            value={metrics.cor}
            delta={`${corDelta >= 0 ? "+" : ""}${formatPercent(corDelta)} vs previous period`}
            trend={corDelta <= 0 ? "up" : "down"}
            icon={<ReceiptText className="h-4 w-4" />}
          />
          <KPI
            label="Operating Expense"
            value={metrics.opex}
            delta={`${opexDelta >= 0 ? "+" : ""}${formatPercent(opexDelta)} vs previous period`}
            trend={opexDelta <= 0 ? "up" : "down"}
            icon={<BriefcaseBusiness className="h-4 w-4" />}
          />
          <KPI
            label="Net Income"
            value={metrics.netIncome}
            delta={`${netDelta >= 0 ? "+" : ""}${formatPercent(netDelta)} vs previous period`}
            trend={netDelta >= 0 ? "up" : "down"}
            icon={<Landmark className="h-4 w-4" />}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-5">
          <article className="dashboard-card p-5 xl:col-span-3">
            <h2 className="text-base font-semibold text-slate-900">Revenue Over Time</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Monthly actuals with a smooth long-term growth trend.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrencyFull(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4c62e9"
                    strokeWidth={3}
                    dot={{ fill: "#4c62e9", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-card p-5 xl:col-span-2">
            <h2 className="text-base font-semibold text-slate-900">Actual vs Plan</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Actual revenue versus plan for the latest 6 months.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planVsActual} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrencyFull(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                  <Bar dataKey="plan" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="actual" fill="#4c62e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="inline-flex items-center gap-2 font-medium text-slate-700">
                <BanknoteArrowDown className="h-4 w-4" />
                Current variance:{" "}
                <span className={variance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {variance >= 0 ? "+" : "-"}
                  {formatCurrencyFull(Math.abs(variance))}
                </span>
              </p>
            </div>
          </article>
        </section>

        <section className="dashboard-card p-5">
          <h2 className="text-base font-semibold text-slate-900">Revenue Growth Over Time</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">Month-over-month revenue growth trend.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatPercent(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ fill: "#16a34a", r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}
