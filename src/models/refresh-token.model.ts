// =============================================================================
// InteriorOS Backend — Refresh Token Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  isRevoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index — auto-delete expired tokens
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      platform: String,
    },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

export default RefreshToken;
