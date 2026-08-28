import Counter from "@/models/Counter";
import connectDB from "@/lib/db";

async function getNextSequence(restaurantId, dateString) {
  await connectDB();

  const counter = await Counter.findOneAndUpdate(
    { restaurantId, dateString },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad the sequence with leading zeros (e.g. 0001, 10042)
  return counter.seq.toString().padStart(4, "0");
}

export async function getNextOrderNumber(restaurantId) {
  // Single global counter for the restaurant (not daily)
  return getNextSequence(restaurantId, "GLOBAL");
}

export async function getNextInvoiceNumber(restaurantId) {
  // Separate global counter so invoice # advances independently of order #
  return getNextSequence(restaurantId, "INVOICE_GLOBAL");
}

