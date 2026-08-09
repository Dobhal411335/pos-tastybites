import { MockPrinterAdapter } from "./MockPrinterAdapter";
import { StarPrinterAdapter } from "./StarPrinterAdapter";

/**
 * Factory for printer adapters.
 * Default: Mock (no hardware). Set PRINT_ADAPTER=star later when ready.
 */
export function getPrinterAdapter(override) {
  const mode = (override || process.env.PRINT_ADAPTER || "mock").toLowerCase();

  if (mode === "star") {
    return new StarPrinterAdapter();
  }

  return new MockPrinterAdapter();
}
