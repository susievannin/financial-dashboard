"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  defaultMonthlyRowDate,
  formatMonthYearLongFromParts,
  getFilteredRows,
  monthLabel,
  Period,
  rowHasActualRevenue,
  sumTotals,
  yearMonthFromRowDate,
  type FinanceRow
} from "@/lib/finance";

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
    trend === "up" ? "text-[#629A93]" : trend === "down" ? "text-[#103249]" : "text-[#558981]";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Landmark;

  return (
    <article className="dashboard-card border border-[#A6C9C7]/40 bg-white/95 p-5 ring-1 ring-[#A6C9C7]/35">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-[#558981]">{label}</span>
        <span className="rounded-lg bg-[#A6C9C7]/25 p-2 text-[#103249]">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#103249]">{formatCurrencyFull(value)}</p>
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
  const dataDefaultMonthDate = useMemo(() => defaultMonthlyRowDate(rows), [rows]);
  const [selectedMonthRowDate, setSelectedMonthRowDate] = useState<string>(dataDefaultMonthDate ?? "");

  useEffect(() => {
    if (!rows.length) {
      setSelectedMonthRowDate("");
      return;
    }

    const currentExists = rows.some((row) => row.date === selectedMonthRowDate);
    if (!currentExists && dataDefaultMonthDate) {
      setSelectedMonthRowDate(dataDefaultMonthDate);
    }
  }, [rows, selectedMonthRowDate, dataDefaultMonthDate]);

  const effectiveMonthlyRowDate = selectedMonthRowDate || dataDefaultMonthDate || "";
  const effectiveMonth = effectiveMonthlyRowDate ? yearMonthFromRowDate(effectiveMonthlyRowDate) : null;
  const monthTitle = effectiveMonth ? formatMonthYearLongFromParts(effectiveMonth.year, effectiveMonth.month) : "";
  const periodDisplayLabel = period === "Monthly" && monthTitle ? `Monthly — ${monthTitle}` : period;

  const currentRows = useMemo(() => {
    if (period === "Monthly") {
      if (!effectiveMonthlyRowDate) {
        return [];
      }
      return rows.filter((row) => row.date === effectiveMonthlyRowDate);
    }
    return getFilteredRows(rows, period);
  }, [rows, period, effectiveMonthlyRowDate]);

  const revenueTrend = useMemo(
    () =>
      currentRows.map((row) => ({
        month: monthLabel(row.date),
        revenue: row.revenue
      })),
    [currentRows]
  );

  const planVsActual = useMemo(
    () =>
      currentRows.map((row) => ({
        month: monthLabel(row.date),
        actual: row.revenue,
        plan: row.plan_revenue
      })),
    [currentRows]
  );

  const revenueGrowthTrend = useMemo(
    () =>
      currentRows.map((row, index) => {
        const prevRevenue = index > 0 ? currentRows[index - 1].revenue : 0;
        const growth = prevRevenue > 0 ? ((row.revenue - prevRevenue) / prevRevenue) * 100 : 0;
        return {
          month: monthLabel(row.date),
          growth
        };
      }),
    [currentRows]
  );

  const primaryMonthlyRow = currentRows[0];
  const isPlanOnlyMonth =
    period === "Monthly" &&
    primaryMonthlyRow !== undefined &&
    !rowHasActualRevenue(primaryMonthlyRow) &&
    primaryMonthlyRow.plan_revenue > 0;
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
    isPlanOnlyMonth || metrics.planRevenue <= 0
      ? null
      : Math.min(Math.round((metrics.revenue / metrics.planRevenue) * 100), 100);
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

  const kpiDelta = (pct: number) =>
    isPlanOnlyMonth ? "Actual not reported for this month" : `${pct >= 0 ? "+" : ""}${formatPercent(pct)} vs previous period`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#103249] to-[#0c2738] p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex w-full min-w-0 flex-col items-start gap-3">
            <img
              src="/logo.png"
              alt="Vannin"
              className="h-12 w-auto shrink-0 object-contain object-left"
              width={240}
              height={48}
              fetchPriority="high"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-wide text-[#A6C9C7]">Finance</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Executive Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="inline-flex w-fit rounded-xl border border-[#A6C9C7]/40 bg-white/95 p-1 shadow-soft">
              {(["Monthly", "QTD", "YTD"] as Period[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeriod(option)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    period === option
                      ? "bg-[#629A93] text-white shadow-sm"
                      : "text-[#558981] hover:bg-[#A6C9C7]/25 hover:text-[#103249]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {period === "Monthly" && rows.length > 0 ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[12rem] flex-col gap-1 text-left">
                  <span className="text-xs font-medium uppercase tracking-wide text-[#A6C9C7]">Month</span>
                  <select
                    className="cursor-pointer rounded-xl border border-[#A6C9C7]/40 bg-white/95 px-3 py-2 text-sm font-medium text-[#103249] shadow-soft outline-none ring-[#629A93]/40 transition focus:ring-2"
                    value={effectiveMonthlyRowDate}
                    onChange={(event) => setSelectedMonthRowDate(event.target.value)}
                    aria-label="Select month"
                  >
                    {rows.map((row) => {
                      const ym = yearMonthFromRowDate(row.date);
                      return (
                        <option key={row.date} value={row.date}>
                          {formatMonthYearLongFromParts(ym.year, ym.month)}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {isPlanOnlyMonth ? (
                  <span className="mb-0.5 rounded-lg border border-[#A6C9C7]/45 bg-[#629A93]/25 px-2.5 py-1 text-xs font-semibold tracking-wide text-[#E8F4F3]">
                    Plan only
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <section className="dashboard-card border border-[#A6C9C7]/35 bg-white/95 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#558981]">
                <span>Revenue progress ({periodDisplayLabel})</span>
                {isPlanOnlyMonth ? (
                  <span className="rounded-md border border-[#629A93]/35 bg-[#629A93]/12 px-2 py-0.5 text-xs font-semibold text-[#103249]">
                    Plan only
                  </span>
                ) : null}
              </p>
              {isPlanOnlyMonth ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-[#103249]">
                    Plan {formatCurrencyFull(metrics.planRevenue)}
                  </p>
                  <p className="mt-1 text-sm text-[#558981]">
                    No actual revenue is recorded for this month in the dataset yet.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-2xl font-semibold text-[#103249]">
                  {formatCurrencyFull(metrics.revenue)}{" "}
                  <span className="text-base text-[#558981]/75">/ {formatCurrencyFull(metrics.planRevenue)}</span>
                </p>
              )}
            </div>
            <span className="rounded-full bg-[#A6C9C7]/30 px-3 py-1 text-sm font-semibold text-[#103249]">
              {progressPct !== null ? `${progressPct}%` : "—"}
            </span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-[#A6C9C7]/35">
            <div
              className={`h-3 rounded-full transition-all ${
                isPlanOnlyMonth ? "bg-[#A6C9C7]/50" : "bg-gradient-to-r from-[#629A93] to-[#558981]"
              }`}
              style={{ width: `${progressPct ?? 0}%` }}
            />
          </div>
        </section>

        <section className="dashboard-card border border-[#A6C9C7]/35 bg-gradient-to-r from-white/95 to-[#A6C9C7]/25 p-6">
          <h2 className="text-base font-semibold text-[#103249]">Executive Summary</h2>
          {isPlanOnlyMonth ? (
            <p className="mt-1 text-sm text-[#558981]">
              <span className="font-semibold text-[#103249]">{periodDisplayLabel}</span> is a plan-only view: budgeted
              revenue is {formatCurrency(metrics.planRevenue)}. There is no actual revenue (or cost) in the data for
              this month yet, so the KPI row below does not reflect closed results—only the plan figure above is
              meaningful until actuals land.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#558981]">
              {periodDisplayLabel} performance shows {formatCurrency(metrics.revenue)} in revenue against{" "}
              {formatCurrency(metrics.planRevenue)} plan, a{" "}
              <span className={variance >= 0 ? "font-semibold text-[#629A93]" : "font-semibold text-[#103249]"}>
                {variance >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(variance))}
              </span>{" "}
              variance.
            </p>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#A6C9C7]/45 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#558981]">Gross Margin</p>
              <p className="mt-1 text-xl font-semibold text-[#103249]">{formatPercent(grossMargin)}</p>
            </div>
            <div className="rounded-xl border border-[#A6C9C7]/45 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#558981]">Net Margin</p>
              <p className="mt-1 text-xl font-semibold text-[#103249]">{formatPercent(netMargin)}</p>
            </div>
            <div className="rounded-xl border border-[#A6C9C7]/45 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#558981]">COR / Opex Ratio</p>
              <p className="mt-1 text-xl font-semibold text-[#103249]">
                {formatPercent(corRatio)} / {formatPercent(opexRatio)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI
            label="Revenue"
            value={metrics.revenue}
            delta={kpiDelta(revenueDelta)}
            trend={isPlanOnlyMonth ? "neutral" : revenueDelta >= 0 ? "up" : "down"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPI
            label="Cost of Revenue"
            value={metrics.cor}
            delta={kpiDelta(corDelta)}
            trend={isPlanOnlyMonth ? "neutral" : corDelta <= 0 ? "up" : "down"}
            icon={<ReceiptText className="h-4 w-4" />}
          />
          <KPI
            label="Operating Expense"
            value={metrics.opex}
            delta={kpiDelta(opexDelta)}
            trend={isPlanOnlyMonth ? "neutral" : opexDelta <= 0 ? "up" : "down"}
            icon={<BriefcaseBusiness className="h-4 w-4" />}
          />
          <KPI
            label="Net Income"
            value={metrics.netIncome}
            delta={kpiDelta(netDelta)}
            trend={isPlanOnlyMonth ? "neutral" : netDelta >= 0 ? "up" : "down"}
            icon={<Landmark className="h-4 w-4" />}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-5">
          <article className="dashboard-card border border-[#A6C9C7]/35 bg-white/95 p-5 xl:col-span-3">
            <h2 className="text-base font-semibold text-[#103249]">Revenue Over Time</h2>
            <p className="mb-4 mt-1 text-sm text-[#558981]">{periodDisplayLabel} revenue view.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A6C9C7" strokeOpacity={0.45} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrencyFull(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#629A93"
                    strokeWidth={3}
                    dot={{ fill: "#629A93", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-card border border-[#A6C9C7]/35 bg-white/95 p-5 xl:col-span-2">
            <h2 className="text-base font-semibold text-[#103249]">Actual vs Plan</h2>
            <p className="mb-4 mt-1 text-sm text-[#558981]">{periodDisplayLabel} actual revenue versus plan.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planVsActual} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A6C9C7" strokeOpacity={0.45} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrencyFull(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                  <Bar dataKey="plan" fill="#A6C9C7" fillOpacity={0.65} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="actual" fill="#629A93" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 rounded-lg border border-[#A6C9C7]/45 bg-[#A6C9C7]/20 p-3 text-sm">
              {isPlanOnlyMonth ? (
                <p className="font-medium text-[#103249]">
                  Selected month has plan revenue only—no actuals in the data, so variance is not applicable.
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 font-medium text-[#103249]">
                  <BanknoteArrowDown className="h-4 w-4" />
                  Current variance:{" "}
                  <span className={variance >= 0 ? "text-[#629A93]" : "text-[#103249]"}>
                    {variance >= 0 ? "+" : "-"}
                    {formatCurrencyFull(Math.abs(variance))}
                  </span>
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-card border border-[#A6C9C7]/35 bg-white/95 p-5">
          <h2 className="text-base font-semibold text-[#103249]">Revenue Growth Over Time</h2>
          <p className="mb-4 mt-1 text-sm text-[#558981]">{periodDisplayLabel} revenue growth trend.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A6C9C7" strokeOpacity={0.45} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatPercent(Number(Array.isArray(value) ? value[0] : value ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#558981"
                  strokeWidth={3}
                  dot={{ fill: "#558981", r: 3 }}
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
