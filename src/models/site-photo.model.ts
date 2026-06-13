// =============================================================================
// InteriorOS Backend — Site Photo Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISitePhoto extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  caption?: string;
  category: 'progress' | 'snag' | 'delivery' | 'other';
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SitePhotoSchema = new Schema<ISitePhoto>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    caption: String,
    category: {
      type: String,
      enum: ['progress', 'snag', 'delivery', 'other'],
      default: 'progress',
      index: true,
    },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SitePhotoSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

SitePhotoSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const SitePhoto: Model<ISitePhoto> = mongoose.models.SitePhoto || mongoose.model<ISitePhoto>('SitePhoto', SitePhotoSchema);
export default SitePhoto;
//
