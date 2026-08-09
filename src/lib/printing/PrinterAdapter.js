/**
 * Abstract printer adapter interface.
 * Concrete adapters (Mock today, Star later) must implement print().
 *
 * Future Star adapters (TSP143/TSP100, SP700) should live behind this
 * same contract so Order/Payment/PrintJob flows never change.
 */
export class PrinterAdapter {
  /**
   * @param {object} job - PrintJob lean/document
   * @param {object} context - { order, restaurant, simulateFailure? }
   * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
   */
  async print(_job, _context) {
    throw new Error("PrinterAdapter.print() must be implemented by subclass");
  }

  get name() {
    return "PrinterAdapter";
  }
}
