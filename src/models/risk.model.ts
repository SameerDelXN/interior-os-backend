// =============================================================================
// InteriorOS Backend — Risk Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRisk extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  category: 'design' | 'procurement' | 'site_execution' | 'client' | 'vendor' | 'other';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  score: number; // calculated as probability score * impact score (1-9)
  mitigationPlan?: string;
  owner?: mongoose.Types.ObjectId;
  dueDate?: Date;
  status: 'open' | 'mitigated' | 'closed';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RiskSchema = new Schema<IRisk>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    category: {
      type: String,
      enum: ['design', 'procurement', 'site_execution', 'client', 'vendor', 'other'],
      default: 'other',
      index: true,
    },
    description: { type: String, required: true, trim: true },
    probability: { type: String, enum: ['low', 'medium', 'high'], required: true },
    impact: { type: String, enum: ['low', 'medium', 'high'], required: true },
    score: { type: Number, default: 1 },
    mitigationPlan: { type: String, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    status: {
      type: String,
      enum: ['open', 'mitigated', 'closed'],
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

RiskSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

RiskSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const Risk: Model<IRisk> = mongoose.models.Risk || mongoose.model<IRisk>('Risk', RiskSchema);
export default Risk;
