// =============================================================================
// InteriorOS Backend — ProjectMember Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IPermission } from './role.model';

export interface IProjectMember extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  projectRole: 'project_manager' | 'site_engineer' | 'quantity_surveyor' | 'designer' | 'client_representative' | 'sub_contractor' | 'viewer';
  permissions: IPermission[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MemberPermissionSchema = new Schema(
  {
    module: {
      type: String,
      required: true,
      enum: [
        'dashboard', 'projects', 'wbs', 'tasks', 'milestones',
        'dpr', 'weekly_reports', 'procurement', 'purchase_orders',
        'vendors', 'drawings', 'rfis', 'mom', 'risks', 'snags',
        'ncrs', 'utilities', 'photos', 'handover', 'boq', 'change_requests', 'variation_orders', 'users',
        'roles', 'organization', 'reports', 'notifications',
        'settings', 'audit_logs', 'filemgt',
      ],
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    }],
  },
  { _id: false }
);

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    projectRole: {
      type: String,
      enum: ['project_manager', 'site_engineer', 'quantity_surveyor', 'designer', 'client_representative', 'sub_contractor', 'viewer'],
      default: 'viewer',
    },
    permissions: {
      type: [MemberPermissionSchema],
      default: [],
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

// Soft delete query filter
ProjectMemberSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

ProjectMemberSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const ProjectMember: Model<IProjectMember> =
  mongoose.models.ProjectMember || mongoose.model<IProjectMember>('ProjectMember', ProjectMemberSchema);

export default ProjectMember;
