import { PrinterAdapter } from "./PrinterAdapter";

/**
 * Placeholder for future Star Micronics integration.
 *
 * Expected hardware (when available):
 * - Customer receipt: Star TSP143 / TSP100 family (80mm thermal)
 * - Kitchen: Star SP700
 *
 * Do NOT hard-code WebPRNT / PassPRNT / StarXpand / LAN / USB here yet.
 * When printers arrive, implement print() using the chosen Star-supported method
 * without changing Order, Payment, or PrintJob models.
 */
export class StarPrinterAdapter extends PrinterAdapter {
  get name() {
    return "StarPrinterAdapter";
  }

  async print(_job, _context) {
    return {
      success: false,
      error:
        "StarPrinterAdapter is not configured yet. Physical Star printers are not connected. Use MockPrinterAdapter.",
      adapter: this.name,
    };
  }
}
