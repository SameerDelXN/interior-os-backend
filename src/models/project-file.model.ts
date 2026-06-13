// =============================================================================
// InteriorOS Backend — Project File Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProjectFile extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  type: 'folder' | 'file';
  parentId: mongoose.Types.ObjectId | null;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectFileSchema = new Schema<IProjectFile>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['folder', 'file'], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'ProjectFile', default: null, index: true },
    fileUrl: String,
    fileType: String,
    fileSize: Number,
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

ProjectFileSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

ProjectFileSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const ProjectFile: Model<IProjectFile> =
  mongoose.models.ProjectFile || mongoose.model<IProjectFile>('ProjectFile', ProjectFileSchema);

export default ProjectFile;
