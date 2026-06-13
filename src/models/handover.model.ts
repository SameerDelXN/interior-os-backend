// =============================================================================
// InteriorOS Backend — Handover Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHandoverCheckitem {
  task: string;
  status: 'pending' | 'completed';
  completedAt?: Date;
}

export interface IHandoverDocument {
  name: string;
  url: string;
  type: 'warranty' | 'manual' | 'certificate';
  uploadedAt: Date;
}

export interface IHandover extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  completionPercentage: number;
  checklist: IHandoverCheckitem[];
  documents: IHandoverDocument[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HandoverSchema = new Schema<IHandover>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    checklist: [
      {
        task: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'completed'],
          default: 'pending',
        },
        completedAt: Date,
      },
    ],
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['warranty', 'manual', 'certificate'],
          required: true,
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

HandoverSchema.index({ organizationId: 1, projectId: 1 }, { unique: true });

HandoverSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

HandoverSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const Handover: Model<IHandover> = mongoose.models.Handover || mongoose.model<IHandover>('Handover', HandoverSchema);
export default Handover;
//
