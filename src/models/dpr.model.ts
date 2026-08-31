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

export interface IDPRLabourReport {
  agencyActivity: string;
  skilled: number;
  unskilled: number;
  currentWork: string;
  statusAsPerBarChart: string;
}

export interface IDPRMaterialReceipt {
  supplierName: string;
  challanNo: string;
  receiptNo: string;
  materialDetails: string;
  uom: string;
  qty: number | string;
}

export interface IDPRTomorrowPlanning {
  agencyActivity: string;
  skilled: number;
  unskilled: number;
  targetedWorks: string;
  remarkConcern: string;
}

export interface IDPRMaterialRequirement {
  materialDescription: string;
  uom: string;
  qty: number | string;
}

export interface IDPR extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  weather?: string;
  manpower: IDPRManpower[];
  activities: IDPRActivity[];
  labourReports: IDPRLabourReport[];
  materialReceipts: IDPRMaterialReceipt[];
  tomorrowPlanning: IDPRTomorrowPlanning[];
  materialRequirements: IDPRMaterialRequirement[];
  siteInstructions?: string;
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
    labourReports: [
      {
        agencyActivity: { type: String, default: '' },
        skilled: { type: Number, default: 0 },
        unskilled: { type: Number, default: 0 },
        currentWork: { type: String, default: '' },
        statusAsPerBarChart: { type: String, default: '' },
      },
    ],
    materialReceipts: [
      {
        supplierName: { type: String, default: '' },
        challanNo: { type: String, default: '' },
        receiptNo: { type: String, default: '' },
        materialDetails: { type: String, default: '' },
        uom: { type: String, default: '' },
        qty: { type: Schema.Types.Mixed, default: '' },
      },
    ],
    tomorrowPlanning: [
      {
        agencyActivity: { type: String, default: '' },
        skilled: { type: Number, default: 0 },
        unskilled: { type: Number, default: 0 },
        targetedWorks: { type: String, default: '' },
        remarkConcern: { type: String, default: '' },
      },
    ],
    materialRequirements: [
      {
        materialDescription: { type: String, default: '' },
        uom: { type: String, default: '' },
        qty: { type: Schema.Types.Mixed, default: '' },
      },
    ],
    siteInstructions: { type: String, default: '' },
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
