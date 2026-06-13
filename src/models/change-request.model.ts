// =============================================================================
// InteriorOS Backend — Change Request Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChangeRequest extends Document {
  _id: mongoose.Types.ObjectId;
  crNumber: string;
  projectId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  requestedDate: Date;
  category: 'design' | 'material' | 'layout' | 'mep' | 'scope' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  areaAffected?: string;
  currentDesign?: string;
  proposedDesign?: string;
  reasonForChange?: string;
  status: 'draft' | 'submitted' | 'design_review' | 'pm_review' | 'commercial_review' | 'client_review' | 'approved' | 'rejected' | 'on_hold';
  impactAssessment: {
    costImpact: number;
    scheduleImpact: number; // in days
    resourceImpact?: string;
    procurementImpact?: string;
    qualityImpact?: string;
    riskImpact?: string;
  };
  designReview?: {
    designerComments?: string;
    updatedDrawings: Array<{ name: string; url: string }>;
    threeDRenders: Array<{ name: string; url: string }>;
    materialSamples: Array<{ name: string; url: string }>;
  };
  aiEvaluation?: {
    predictedCostImpact: number;
    predictedTimelineImpact: number;
    predictedProcurementChanges?: string;
    predictedResourceChanges?: string;
    evaluatedAt: Date;
    confidenceScore: number;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChangeRequestSchema = new Schema<IChangeRequest>(
  {
    crNumber: {
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
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ['design', 'material', 'layout', 'mep', 'scope', 'other'],
      required: true,
      default: 'design',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    areaAffected: { type: String, trim: true },
    currentDesign: { type: String, trim: true },
    proposedDesign: { type: String, trim: true },
    reasonForChange: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'design_review', 'pm_review', 'commercial_review', 'client_review', 'approved', 'rejected', 'on_hold'],
      required: true,
      default: 'draft',
      index: true,
    },
    impactAssessment: {
      costImpact: { type: Number, default: 0 },
      scheduleImpact: { type: Number, default: 0 },
      resourceImpact: String,
      procurementImpact: String,
      qualityImpact: String,
      riskImpact: String,
    },
    designReview: {
      designerComments: String,
      updatedDrawings: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      threeDRenders: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      materialSamples: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
    },
    aiEvaluation: {
      predictedCostImpact: { type: Number, default: 0 },
      predictedTimelineImpact: { type: Number, default: 0 },
      predictedProcurementChanges: String,
      predictedResourceChanges: String,
      evaluatedAt: Date,
      confidenceScore: { type: Number, default: 0 },
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

// Indexes
ChangeRequestSchema.index({ organizationId: 1, projectId: 1, crNumber: 1 }, { unique: true });

// Pre-query soft delete filters
ChangeRequestSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

ChangeRequestSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const ChangeRequest: Model<IChangeRequest> =
  mongoose.models.ChangeRequest || mongoose.model<IChangeRequest>('ChangeRequest', ChangeRequestSchema);

export default ChangeRequest;
