import { r2 } from "@/lib/eod/eodHelpers";

export function paymentBreakdownFromKpis(kpis) {
  const paymentTotal = kpis.collected;
  return [
    {
      method: "Cash",
      count: kpis.cashCount,
      amount: kpis.cash,
      percent: paymentTotal > 0 ? r2((kpis.cash / paymentTotal) * 100) : 0,
    },
    {
      method: "Card",
      count: kpis.cardCount,
      amount: kpis.card,
      percent: paymentTotal > 0 ? r2((kpis.card / paymentTotal) * 100) : 0,
    },
    {
      method: "Gift Card",
      count: kpis.giftCount,
      amount: kpis.giftCard,
      percent: paymentTotal > 0 ? r2((kpis.giftCard / paymentTotal) * 100) : 0,
    },
  ];
}
