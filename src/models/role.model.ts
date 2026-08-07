// =============================================================================
// InteriorOS Backend — Role & Permission Models
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// ── Permission Model ─────────────────────────────────────────────────────────

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'manage';

export type ModuleName =
  | 'dashboard'
  | 'projects'
  | 'wbs'
  | 'tasks'
  | 'milestones'
  | 'dpr'
  | 'weekly_reports'
  | 'procurement'
  | 'purchase_orders'
  | 'vendors'
  | 'drawings'
  | 'rfis'
  | 'mom'
  | 'risks'
  | 'snags'
  | 'ncrs'
  | 'utilities'
  | 'photos'
  | 'handover'
  | 'boq'
  | 'change_requests'
  | 'variation_orders'
  | 'users'
  | 'roles'
  | 'organization'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'audit_logs'
  | 'filemgt'
  | 'financials';

export interface IPermission {
  module: ModuleName;
  actions: PermissionAction[];
}

// ── Role Model ───────────────────────────────────────────────────────────────

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  permissions: IPermission[];
  isSystem: boolean; // System roles can't be deleted
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
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
        'settings', 'audit_logs', 'filemgt', 'financials',
      ],
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    }],
  },
  { _id: false }
);

const RoleSchema = new Schema<IRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, trim: true, maxlength: 200 },
    permissions: [PermissionSchema],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
RoleSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
RoleSchema.index({ organizationId: 1, isActive: 1 });

// Soft delete filter
RoleSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

RoleSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

// ── Default System Roles Template ────────────────────────────────────────────

const allModules: ModuleName[] = [
  'dashboard', 'projects', 'wbs', 'tasks', 'milestones',
  'dpr', 'weekly_reports', 'procurement', 'purchase_orders',
  'vendors', 'drawings', 'rfis', 'mom', 'risks', 'snags',
  'ncrs', 'utilities', 'photos', 'handover', 'boq', 'change_requests', 'variation_orders', 'users',
  'roles', 'organization', 'reports', 'notifications',
  'settings', 'audit_logs', 'filemgt', 'financials',
];

const allActions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];
const readOnly: PermissionAction[] = ['read'];
const standardActions: PermissionAction[] = ['create', 'read', 'update'];

export const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    slug: 'admin',
    description: 'Full access to all modules',
    permissions: allModules.map(module => ({ module, actions: allActions })),
    isSystem: true,
  },
  project_manager: {
    name: 'Project Manager',
    slug: 'project-manager',
    description: 'Manage projects and related modules',
    permissions: allModules
      .filter(m => !['organization', 'roles', 'settings', 'audit_logs'].includes(m))
      .map(module => ({ module, actions: standardActions.concat(['approve', 'export']) })),
    isSystem: true,
  },
  engineer: {
    name: 'Engineer',
    slug: 'engineer',
    description: 'Standard access for project engineers',
    permissions: [
      'dashboard', 'projects', 'wbs', 'tasks', 'milestones',
      'dpr', 'drawings', 'rfis', 'snags', 'ncrs', 'photos', 'mom', 'boq', 'filemgt',
    ].map(module => ({ module: module as ModuleName, actions: standardActions })),
    isSystem: true,
  },
  viewer: {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access',
    permissions: allModules
      .filter(m => !['roles', 'settings', 'audit_logs'].includes(m))
      .map(module => ({ module, actions: readOnly })),
    isSystem: true,
  },
};

export default Role;
