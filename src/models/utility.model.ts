// =============================================================================
// InteriorOS Backend — Utility System Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUtilityCheckpoint {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  readings?: string;
  checkedAt?: Date;
}

export interface IUtilitySystem extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  system: 'electrical' | 'hvac' | 'phe' | 'fire_fighting' | 'stp' | 'elv' | 'other';
  plannedProgress: number;
  actualProgress: number;
  checkpoints: IUtilityCheckpoint[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UtilitySystemSchema = new Schema<IUtilitySystem>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    system: {
      type: String,
      enum: ['electrical', 'hvac', 'phe', 'fire_fighting', 'stp', 'elv', 'other'],
      required: true,
      index: true,
    },
    plannedProgress: { type: Number, default: 0, min: 0, max: 100 },
    actualProgress: { type: Number, default: 0, min: 0, max: 100 },
    checkpoints: [
      {
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'passed', 'failed'],
          default: 'pending',
        },
        readings: String,
        checkedAt: Date,
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

UtilitySystemSchema.index({ organizationId: 1, projectId: 1, system: 1 }, { unique: true });

UtilitySystemSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

UtilitySystemSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const UtilitySystem: Model<IUtilitySystem> = mongoose.models.UtilitySystem || mongoose.model<IUtilitySystem>('UtilitySystem', UtilitySystemSchema);
export default UtilitySystem;
//
