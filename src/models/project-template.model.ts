// =============================================================================
// InteriorOS Backend — Project Template Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplateWbs {
  name: string; // Building level name
  floors?: Array<{
    name: string; // Floor level name
    zones?: Array<{
      name: string; // Zone level name
      areas?: Array<{
        name: string; // Area level name
        packages?: Array<{
          name: string; // Package level name
          trade: 'civil' | 'interior' | 'mep' | 'electrical' | 'hvac' | 'phe' | 'fire_fighting' | 'elv' | 'other';
          tasks?: Array<{
            name: string;
            description?: string;
            priority?: 'low' | 'medium' | 'high' | 'critical';
            durationDays: number;
          }>;
        }>;
      }>;
    }>;
  }>;
}

export interface ITemplateMilestone {
  name: string;
  offsetDays: number; // Offset days from project start
  linkedTaskNames: string[]; // List of task names associated with this milestone
}

export interface ITemplateProcurement {
  vendorName: string;
  materialName: string;
  amount: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
}

export interface IProjectTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: 'Residential' | 'Commercial';
  description: string;
  wbs: ITemplateWbs[];
  milestones: ITemplateMilestone[];
  procurement: ITemplateProcurement[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTemplateSchema = new Schema<IProjectTemplate>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ['Residential', 'Commercial'], required: true },
    description: { type: String, required: true },
    wbs: { type: Schema.Types.Mixed, default: [] },
    milestones: { type: Schema.Types.Mixed, default: [] },
    procurement: { type: Schema.Types.Mixed, default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProjectTemplateSchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

ProjectTemplateSchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const ProjectTemplate: Model<IProjectTemplate> =
  mongoose.models.ProjectTemplate || mongoose.model<IProjectTemplate>('ProjectTemplate', ProjectTemplateSchema);

export default ProjectTemplate;
