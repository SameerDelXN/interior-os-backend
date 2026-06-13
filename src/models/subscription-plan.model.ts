// =============================================================================
// InteriorOS Backend — Subscription Plan Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'both';
  features: string[];
  limits: {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    max3DModels: number;
  };
  trialDays: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Plan description is required'],
      trim: true,
      maxlength: 500,
    },
    price: {
      monthly: { type: Number, required: true, min: 0 },
      yearly: { type: Number, required: true, min: 0 },
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'both'],
      default: 'both',
    },
    features: [{ type: String, trim: true }],
    limits: {
      maxProjects: { type: Number, default: 5, min: -1 },   // -1 = unlimited
      maxUsers: { type: Number, default: 10, min: -1 },
      maxStorageGB: { type: Number, default: 10, min: -1 },
      max3DModels: { type: Number, default: 3, min: -1 },
    },
    trialDays: { type: Number, default: 14, min: 0 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
SubscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
SubscriptionPlanSchema.index({ name: 'text', description: 'text' });

export const SubscriptionPlan: Model<ISubscriptionPlan> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);

export default SubscriptionPlan;
