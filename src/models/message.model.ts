// =============================================================================
// InteriorOS Backend — Message Model
// =============================================================================

import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  projectId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  reactions: Array<{
    emoji: string;
    users: mongoose.Types.ObjectId[];
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying of project messages sorted by time
messageSchema.index({ projectId: 1, createdAt: -1 });
// Delete existing model in development to ensure schema updates take effect
if (process.env.NODE_ENV !== 'production' && mongoose.models.Message) {
  delete mongoose.models.Message;
}

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
