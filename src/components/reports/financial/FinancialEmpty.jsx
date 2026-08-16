export default function FinancialEmpty({
  message = "No financial data found for the selected period.",
}) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white px-4 py-16 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
