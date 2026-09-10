import { buildAdminPrintTickets } from "./kitchen";

export async function buildAdminBar(filters) {
  return buildAdminPrintTickets({ ...filters, printType: "BAR_RECEIPT" });
}
