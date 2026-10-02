import mongoose from 'mongoose';

const ENTITY_TYPES = [
  'product',
  'category',
  'offer',
  'head',
  'productHead',
  'tax',
];

const MenuDeletionSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: false }
);

MenuDeletionSchema.index({ restaurant: 1, deletedAt: 1 });
MenuDeletionSchema.index({ restaurant: 1, entityType: 1, entityId: 1 });

export const MENU_DELETION_ENTITY_TYPES = ENTITY_TYPES;

export default mongoose.models.MenuDeletion ||
  mongoose.model('MenuDeletion', MenuDeletionSchema);
