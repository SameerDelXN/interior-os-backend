// =============================================================================
// InteriorOS Backend — Drawing Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDrawingRevision {
  revision: string;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  changes?: string;
  createdAt: Date;
}

export interface IDrawing extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  drawingNumber: string;
  title: string;
  drawingType: '2D' | '3D';
  discipline: string;
  fileType?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  revisions: IDrawingRevision[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DrawingSchema = new Schema<IDrawing>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    drawingNumber: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    drawingType: {
      type: String,
      enum: ['2D', '3D'],
      default: '2D',
      index: true,
    },
    discipline: {
      type: String,
      default: 'gfc',
      index: true,
    },
    fileType: { type: String },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    revisions: [
      {
        revision: { type: String, required: true },
        url: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        changes: String,
        createdAt: { type: Date, default: Date.now },
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

DrawingSchema.index({ organizationId: 1, projectId: 1, drawingNumber: 1 }, { unique: true });

DrawingSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

DrawingSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const Drawing: Model<IDrawing> = mongoose.models.Drawing || mongoose.model<IDrawing>('Drawing', DrawingSchema);
export default Drawing;
//
