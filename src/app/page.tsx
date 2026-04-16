import { readFileSync } from "node:fs";
import { join } from "node:path";

import Dashboard from "@/components/dashboard";
import { parseFinanceCsv } from "@/lib/finance";

/** Re-read CSV on each request so manual edits show up after refresh (dev and prod). */
export const dynamic = "force-dynamic";

export default function Home() {
  const csvPath = join(process.cwd(), "src", "data", "finance.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const rows = parseFinanceCsv(csvText);

  return <Dashboard rows={rows} />;
}
