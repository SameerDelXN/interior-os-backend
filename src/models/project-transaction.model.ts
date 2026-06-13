// =============================================================================
// InteriorOS Backend — Project Transaction Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProjectTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  type: 'inflow' | 'outflow';
  category: 'client_payment' | 'material' | 'labor' | 'logistics' | 'design_fee' | 'miscellaneous';
  amount: number;
  currency: string;
  status: 'completed' | 'pending';
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'other';
  referenceId?: string;
  description?: string;
  transactionDate: Date;
  recordedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTransactionSchema = new Schema<IProjectTransaction>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    type: { type: String, enum: ['inflow', 'outflow'], required: true, index: true },
    category: {
      type: String,
      enum: ['client_payment', 'material', 'labor', 'logistics', 'design_fee', 'miscellaneous'],
      required: true,
      index: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['completed', 'pending'], default: 'completed', index: true },
    paymentMethod: { type: String, enum: ['bank_transfer', 'cash', 'cheque', 'other'], default: 'bank_transfer' },
    referenceId: { type: String, trim: true },
    description: { type: String, trim: true },
    transactionDate: { type: Date, default: Date.now, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProjectTransactionSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

ProjectTransactionSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const ProjectTransaction: Model<IProjectTransaction> =
  mongoose.models.ProjectTransaction || mongoose.model<IProjectTransaction>('ProjectTransaction', ProjectTransactionSchema);

export default ProjectTransaction;
