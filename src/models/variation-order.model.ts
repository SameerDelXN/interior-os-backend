// =============================================================================
// InteriorOS Backend — Variation Order Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVariationOrder extends Document {
  _id: mongoose.Types.ObjectId;
  voNumber: string;
  projectId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  client: string;
  requestedBy: mongoose.Types.ObjectId;
  requestDate: Date;
  changeRequestId?: mongoose.Types.ObjectId;
  type: 'addition' | 'deletion' | 'replacement' | 'quantity_change';
  category: 'Civil' | 'Electrical' | 'Carpentry' | 'Furniture' | 'MEP' | 'Landscape' | 'Design';
  status: 'draft' | 'submitted' | 'pm_review' | 'commercial_review' | 'management_approval' | 'client_approval' | 'approved' | 'executed' | 'rejected';
  description: string; // Scope Change
  impactAnalysis: {
    materialCost: number;
    laborCost: number;
    vendorCost: number;
    overheadCost: number;
    timelineImpactDays: number;
  };
  financialSummary: {
    originalCost: number;
    variationCost: number; // same as netDifference
    netDifference: number; // revised - original
    revisedProjectCost: number;
  };
  attachments: Array<{
    name: string;
    url: string;
    type: 'photo' | 'drawing' | 'design_ref' | 'client_doc';
  }>;
  billingGenerated: boolean;
  billingGeneratedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VariationOrderSchema = new Schema<IVariationOrder>(
  {
    voNumber: {
      type: String,
      required: true,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    client: {
      type: String,
      required: true,
      trim: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changeRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'ChangeRequest',
    },
    type: {
      type: String,
      enum: ['addition', 'deletion', 'replacement', 'quantity_change'],
      required: true,
    },
    category: {
      type: String,
      enum: ['Civil', 'Electrical', 'Carpentry', 'Furniture', 'MEP', 'Landscape', 'Design'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'pm_review', 'commercial_review', 'management_approval', 'client_approval', 'approved', 'executed', 'rejected'],
      required: true,
      default: 'draft',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    impactAnalysis: {
      materialCost: { type: Number, default: 0 },
      laborCost: { type: Number, default: 0 },
      vendorCost: { type: Number, default: 0 },
      overheadCost: { type: Number, default: 0 },
      timelineImpactDays: { type: Number, default: 0 },
    },
    financialSummary: {
      originalCost: { type: Number, default: 0 },
      variationCost: { type: Number, default: 0 },
      netDifference: { type: Number, default: 0 },
      revisedProjectCost: { type: Number, default: 0 },
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['photo', 'drawing', 'design_ref', 'client_doc'],
          required: true,
        },
      },
    ],
    billingGenerated: { type: Boolean, default: false },
    billingGeneratedAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
VariationOrderSchema.index({ organizationId: 1, projectId: 1, voNumber: 1 }, { unique: true });

// Pre-query soft delete filters
VariationOrderSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

VariationOrderSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const VariationOrder: Model<IVariationOrder> =
  mongoose.models.VariationOrder || mongoose.model<IVariationOrder>('VariationOrder', VariationOrderSchema);

export default VariationOrder;
