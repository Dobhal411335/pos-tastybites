import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  dateString: { type: String, required: true }, // Format: 'YYYY-MM-DD'
  seq: { type: Number, default: 1 }
});

// Compound unique index on restaurantId and dateString to ensure one counter per day per restaurant
CounterSchema.index({ restaurantId: 1, dateString: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
