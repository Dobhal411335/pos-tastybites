import mongoose from 'mongoose';

const EmployeePermissionSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    permissions: [{
      type: String,
      enum: [
        'CREATE_ORDER', 'EDIT_ORDER', 'CANCEL_ORDER',
        'APPLY_DISCOUNT', 'KITCHEN_ACCESS', 'VIEW_REPORTS',
        'MANAGE_SETTINGS', 'PROCESS_REFUND', 'CREATE_TABLE',
        'VIEW_DASHBOARD'
      ]
    }]
  },
  { timestamps: true }
);

export default mongoose.models.EmployeePermission || mongoose.model('EmployeePermission', EmployeePermissionSchema);
