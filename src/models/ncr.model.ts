// =============================================================================
// InteriorOS Backend — Non-Conformance Report (NCR) Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INCR extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  ncrNumber: string;
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  status: 'open' | 'investigation' | 'corrective_action' | 'verification' | 'closed';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NCRSchema = new Schema<INCR>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    ncrNumber: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    rootCause: String,
    correctiveAction: String,
    status: {
      type: String,
      enum: ['open', 'investigation', 'corrective_action', 'verification', 'closed'],
      default: 'open',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

NCRSchema.index({ organizationId: 1, projectId: 1, ncrNumber: 1 }, { unique: true });

NCRSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

NCRSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const NCR: Model<INCR> = mongoose.models.NCR || mongoose.model<INCR>('NCR', NCRSchema);
export default NCR;
//
