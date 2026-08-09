import Counter from "@/models/Counter";
import connectDB from "@/lib/db";

export async function getNextOrderNumber(restaurantId) {
  await connectDB();
  
  // Use a single global counter for the restaurant instead of a daily one
  const dateString = 'GLOBAL';
  
  const counter = await Counter.findOneAndUpdate(
    { restaurantId, dateString },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad the sequence with leading zeros (e.g. 0001, 10042)
  const sequenceStr = counter.seq.toString().padStart(4, '0');
  
  return sequenceStr;
}

