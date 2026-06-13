// =============================================================================
// InteriorOS Backend — Meeting Minutes (MOM) Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMOMActionItem {
  description: string;
  assignee?: mongoose.Types.ObjectId;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'closed';
}

export interface IMeetingMinutes extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  attendees: string[];
  agenda: string;
  notes: string;
  actionItems: IMOMActionItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingMinutesSchema = new Schema<IMeetingMinutes>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
    attendees: [{ type: String }],
    agenda: { type: String, required: true },
    notes: { type: String, required: true },
    actionItems: [
      {
        description: { type: String, required: true },
        assignee: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: {
          type: String,
          enum: ['open', 'in_progress', 'closed'],
          default: 'open',
        },
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

MeetingMinutesSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

MeetingMinutesSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const MeetingMinutes: Model<IMeetingMinutes> = mongoose.models.MeetingMinutes || mongoose.model<IMeetingMinutes>('MeetingMinutes', MeetingMinutesSchema);
export default MeetingMinutes;
//
