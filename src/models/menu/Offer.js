import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    description: { type: String, trim: true, default: '' },
    inclusions: [{ type: String, trim: true }],
    choices: [{ type: String, trim: true }],
    drinks: [{ type: String, trim: true }],
    validFrom: { type: Date },
    validTo: { type: Date },
    taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
    taxData: {
      totalPercentage: { type: Number, default: 0 },
      totalFixed: { type: Number, default: 0 },
      taxNames: [{ type: String }],
      taxDetails: [
        {
          name: String,
          value: Number,
          type: { type: String }
        }
      ]
    },
    image: {
      url: { type: String },
      key: { type: String }
    },
    status: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
