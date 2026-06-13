// =============================================================================
// InteriorOS Backend — Weekly Report Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeeklyReport extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  weekStart: Date;
  weekEnd: Date;
  completedActivities: string[];
  delayedActivities: string[];
  risks: string[];
  nextWeekPlan: string[];
  submittedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyReportSchema = new Schema<IWeeklyReport>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    completedActivities: [{ type: String }],
    delayedActivities: [{ type: String }],
    risks: [{ type: String }],
    nextWeekPlan: [{ type: String }],
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

WeeklyReportSchema.index({ organizationId: 1, projectId: 1, weekStart: 1 }, { unique: true });

WeeklyReportSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

WeeklyReportSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const WeeklyReport: Model<IWeeklyReport> = mongoose.models.WeeklyReport || mongoose.model<IWeeklyReport>('WeeklyReport', WeeklyReportSchema);
export default WeeklyReport;
