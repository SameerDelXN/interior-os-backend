// =============================================================================
// InteriorOS Backend — Daily Progress Report (DPR) Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDPRActivity {
  category: string;
  description: string;
  plannedProgress: number;
  actualProgress: number;
  remarks?: string;
}

export interface IDPRManpower {
  trade: string;
  count: number;
  contractor: string;
}

export interface IDPR extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  weather?: string;
  manpower: IDPRManpower[];
  activities: IDPRActivity[];
  photos: string[];
  submittedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DPRSchema = new Schema<IDPR>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    date: { type: Date, required: true },
    weather: String,
    manpower: [
      {
        trade: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
        contractor: { type: String, required: true },
      },
    ],
    activities: [
      {
        category: { type: String, required: true },
        description: { type: String, required: true },
        plannedProgress: { type: Number, required: true, min: 0, max: 100 },
        actualProgress: { type: Number, required: true, min: 0, max: 100 },
        remarks: String,
      },
    ],
    photos: [{ type: String }],
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DPRSchema.index({ organizationId: 1, projectId: 1, date: 1 }, { unique: true });

DPRSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

DPRSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const DailyProgressReport: Model<IDPR> = mongoose.models.DailyProgressReport || mongoose.model<IDPR>('DailyProgressReport', DPRSchema);
export default DailyProgressReport;
