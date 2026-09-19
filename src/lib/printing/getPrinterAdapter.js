import { MockPrinterAdapter } from "./MockPrinterAdapter";
import { StarPrinterAdapter } from "./StarPrinterAdapter";
import { PrinterAdapter } from "./PrinterAdapter";

/**
 * Production guard: mock must not silently mark jobs PRINTED.
 * Opt in with ALLOW_MOCK_PRINT_COMPLETE=true (local/dev only).
 */
class BlockedMockPrinterAdapter extends PrinterAdapter {
  get name() {
    return "BlockedMockPrinterAdapter";
  }

  async print() {
    return {
      success: false,
      error:
        "Server mock printing is disabled in production. Use an on-site Sales agent (Android / Electron) or print-bridge.",
      adapter: this.name,
      simulated: true,
      blocked: true,
    };
  }
}

/**
 * Factory for printer adapters.
 * Default: Mock (dev only). Production blocks mock completion unless explicitly allowed.
 * Set PRINT_ADAPTER=star when a real server-side Star path exists (currently a stub).
 */
export function getPrinterAdapter(override) {
  const mode = (override || process.env.PRINT_ADAPTER || "mock").toLowerCase();

  if (mode === "star") {
    return new StarPrinterAdapter();
  }

  const allowMockComplete =
    process.env.ALLOW_MOCK_PRINT_COMPLETE === "true" ||
    process.env.NODE_ENV !== "production";

  if (!allowMockComplete) {
    return new BlockedMockPrinterAdapter();
  }

  return new MockPrinterAdapter();
}
