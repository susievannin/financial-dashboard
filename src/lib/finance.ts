export type FinanceRow = {
  date: string;
  revenue: number;
  cor: number;
  opex: number;
  plan_revenue: number;
};

export type Period = "Monthly" | "QTD" | "YTD";

/** Calendar month in local time, `month` is 0–11 (Date.prototype.getMonth()). */
export type YearMonth = {
  year: number;
  month: number;
};

export type Totals = {
  revenue: number;
  cor: number;
  opex: number;
  grossProfit: number;
  netIncome: number;
  planRevenue: number;
};

const REQUIRED_COLUMNS = ["date", "revenue", "cor", "opex", "plan_revenue"];

function toNumber(value: string): number {
  const normalized = value.replace(/[$,\s]/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/** Parses local finance CSV text (header row: date, revenue, cor, opex, plan_revenue). */
export function parseFinanceCsv(csvText: string): FinanceRow[] {
  const csv = csvText.replace(/^\uFEFF/, "");
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((required) => !headers.includes(required));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  const index = {
    date: headers.indexOf("date"),
    revenue: headers.indexOf("revenue"),
    cor: headers.indexOf("cor"),
    opex: headers.indexOf("opex"),
    plan_revenue: headers.indexOf("plan_revenue")
  };

  return lines
    .slice(1)
    .map((line) => parseCsvLine(line))
    .filter((columns) => columns[index.date])
    .map((columns) => ({
      date: columns[index.date],
      revenue: toNumber(columns[index.revenue] ?? "0"),
      cor: toNumber(columns[index.cor] ?? "0"),
      opex: toNumber(columns[index.opex] ?? "0"),
      plan_revenue: toNumber(columns[index.plan_revenue] ?? "0")
    }))
    .filter((row) => !Number.isNaN(new Date(row.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function yearMonthFromRowDate(dateValue: string): YearMonth {
  const date = new Date(dateValue);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Latest month (by row order) that has reported actual revenue. Falls back to the last row if none. */
export function defaultMonthlySelection(rows: FinanceRow[]): YearMonth | null {
  if (rows.length === 0) {
    return null;
  }

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].revenue > 0) {
      return yearMonthFromRowDate(rows[i].date);
    }
  }

  return yearMonthFromRowDate(rows[rows.length - 1].date);
}

/** Latest row date for default Monthly selection (latest month with actual revenue). */
export function defaultMonthlyRowDate(rows: FinanceRow[]): string | null {
  const target = defaultMonthlySelection(rows);
  if (!target) {
    return null;
  }

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const date = new Date(rows[i].date);
    if (date.getFullYear() === target.year && date.getMonth() === target.month) {
      return rows[i].date;
    }
  }

  return rows[rows.length - 1]?.date ?? null;
}

export function formatMonthYearLongFromParts(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month, 1));
}

export function rowHasActualRevenue(row: FinanceRow): boolean {
  return row.revenue > 0;
}

/**
 * @param monthlySelection — When `period` is Monthly, filter to this calendar month.
 *   If omitted or null, uses {@link defaultMonthlySelection} (latest month with actual revenue).
 */
export function getFilteredRows(
  rows: FinanceRow[],
  period: Period,
  monthlySelection?: YearMonth | null
): FinanceRow[] {
  if (rows.length === 0) {
    return [];
  }

  const latestDate = new Date(rows[rows.length - 1].date);
  const latestYear = latestDate.getFullYear();
  const latestMonth = latestDate.getMonth();

  if (period === "YTD") {
    return rows.filter((row) => {
      const date = new Date(row.date);
      return date.getFullYear() === latestYear;
    });
  }

  if (period === "QTD") {
    const quarterStartMonth = Math.floor(latestMonth / 3) * 3;
    return rows.filter((row) => {
      const date = new Date(row.date);
      return (
        date.getFullYear() === latestYear && date.getMonth() >= quarterStartMonth && date.getMonth() <= latestMonth
      );
    });
  }

  const target = monthlySelection ?? defaultMonthlySelection(rows);
  if (!target) {
    return [];
  }

  return rows.filter((row) => {
    const date = new Date(row.date);
    return date.getFullYear() === target.year && date.getMonth() === target.month;
  });
}

export function sumTotals(rows: FinanceRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, row) => {
      const grossProfit = row.revenue - row.cor;
      const netIncome = row.revenue - row.cor - row.opex;

      return {
        revenue: acc.revenue + row.revenue,
        cor: acc.cor + row.cor,
        opex: acc.opex + row.opex,
        grossProfit: acc.grossProfit + grossProfit,
        netIncome: acc.netIncome + netIncome,
        planRevenue: acc.planRevenue + row.plan_revenue
      };
    },
    {
      revenue: 0,
      cor: 0,
      opex: 0,
      grossProfit: 0,
      netIncome: 0,
      planRevenue: 0
    }
  );
}

export function monthLabel(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit"
  }).format(new Date(dateValue));
}

