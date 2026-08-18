import mongoose from 'mongoose';

const ChoiceOptionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subChoices: [{ type: String, trim: true }],
});

const CategoryAddonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  size: { type: String, default: 'Regular' },
  status: { type: Boolean, default: true },
  choiceOptions: { type: [ChoiceOptionSchema], default: [] },
});

const CategorySchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    addons: { type: [CategoryAddonSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
