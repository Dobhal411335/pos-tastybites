import { PrinterAdapter } from "./PrinterAdapter";

/**
 * Development/test adapter — does NOT contact any physical printer.
 * Simulates QUEUED → PRINTING → PRINTED with a short delay.
 */
export class MockPrinterAdapter extends PrinterAdapter {
  get name() {
    return "MockPrinterAdapter";
  }

  /**
   * @param {object} job
   * @param {{ simulateFailure?: boolean, delayMs?: number }} context
   */
  async print(job, context = {}) {
    const delayMs = context.delayMs ?? 800;

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (context.simulateFailure) {
      return {
        success: false,
        error: "Simulated print failure (MockPrinterAdapter)",
        adapter: this.name,
      };
    }

    return {
      success: true,
      message: `Mock print completed for ${job.printType} → ${job.printerTarget}`,
      adapter: this.name,
      simulated: true,
    };
  }
}
