import mongoose from 'mongoose';

const OperationalAuditLogSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    
    // Who performed the action
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ['Employee', 'Admin'], required: true },
    actorName: { type: String }, // Denormalized for easy viewing
    
    // What action was performed
    action: { 
      type: String, 
      enum: [
        'TABLE_ASSIGNED', 
        'TABLE_RELEASED', 
        'TABLE_TRANSFERRED', 
        'GUEST_COUNT_CHANGED', 
        'TABLE_RECONFIGURED',
        'ORDER_CREATED', 
        'ORDER_UPDATED',
        'ORDER_CANCELLED', 
        'PAYMENT_COMPLETED',
        'ADMIN_OVERRIDE'
      ],
      required: true,
      index: true
    },
    
    // Context
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    tableSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSession' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    
    // Changes
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    
    // Additional info
    reason: { type: String },
    
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export default mongoose.models.OperationalAuditLog || mongoose.model('OperationalAuditLog', OperationalAuditLogSchema);
