// =============================================================================
// InteriorOS Backend — Notification Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'info' | 'success' | 'warning' | 'error' | 'action_required';
  category: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: mongoose.Types.ObjectId;
  relatedEntity?: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'action_required'],
      default: 'info',
    },
    category: {
      type: String,
      required: true,
      enum: [
        'project', 'task', 'milestone', 'rfi', 'snag', 'ncr',
        'procurement', 'drawing', 'dpr', 'mom', 'risk',
        'handover', 'user', 'system',
      ],
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 500 },
    actionUrl: { type: String },
    actionLabel: { type: String },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedEntity: {
      type: { type: String },
      id: { type: Schema.Types.ObjectId },
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 day TTL

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
