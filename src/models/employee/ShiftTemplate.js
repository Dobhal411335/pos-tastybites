import mongoose from 'mongoose';

const ShiftTemplateSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true }, // e.g. "Morning Shift"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    color: { type: String, default: 'blue' },
    workingDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    repeatPattern: { type: String, enum: ['Weekly', 'Bi Weekly', 'Monthly'], default: 'Weekly' }, // visual distinction
  },
  { timestamps: true }
);

export default mongoose.models.ShiftTemplate || mongoose.model('ShiftTemplate', ShiftTemplateSchema);
