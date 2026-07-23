import mongoose from 'mongoose';

const EmployeeLogSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift' },
    date: { type: Date, required: true },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice' },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    tablesAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeLog || mongoose.model('EmployeeLog', EmployeeLogSchema);
