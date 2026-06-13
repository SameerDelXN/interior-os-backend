// =============================================================================
// InteriorOS Backend — Organization Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  subscription: {
    plan: string;
    planId?: mongoose.Types.ObjectId;
    status: 'active' | 'inactive' | 'trial' | 'expired';
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
  };
  settings: {
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
  };
  features: string[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    logo: { type: String },
    website: { type: String, trim: true },
    industry: {
      type: String,
      required: true,
      default: 'Interior Fit-Out',
      enum: [
        'Interior Fit-Out',
        'Design & Build',
        'MEP Contractor',
        'Workplace Construction',
        'Project Management Consultancy',
        'Architecture',
        'General Contracting',
        'Other',
      ],
    },
    size: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
      default: 'small',
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    contact: {
      email: String,
      phone: String,
    },
    subscription: {
      plan: {
        type: String,
        default: 'trial',
      },
      planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
      status: {
        type: String,
        enum: ['active', 'inactive', 'trial', 'expired'],
        default: 'trial',
      },
      trialEndsAt: Date,
      currentPeriodEnd: Date,
    },
    settings: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'INR' },
      language: { type: String, default: 'en' },
    },
    features: [{ type: String }],
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
OrganizationSchema.index({ name: 'text' });
OrganizationSchema.index({ isActive: 1, isDeleted: 1 });
OrganizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Soft delete query filter
OrganizationSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

OrganizationSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

// Virtuals
OrganizationSchema.virtual('users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organizationId',
});

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
