// =============================================================================
// InteriorOS Backend — CRM Customer Model (ported from sky-lite-api Customer)
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISiteMeasurements {
  carpetArea?: string;
  ceilingHeight?: string;
  rooms?: string;
  notes?: string;
}

export interface IRequirement {
  roomName?: string;
  description?: string;
  theme?: string;
}

export interface IDesignFile {
  name?: string;
  url?: string;
  fileType?: string;
  uploadedAt: Date;
}

export interface IQuotationItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface IQuotation {
  version?: number;
  items: IQuotationItem[];
  subtotal?: number;
  tax?: number;
  taxPercentage?: number;
  discount?: number;
  grandTotal?: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  createdAt: Date;
  notes?: string;
}

export interface ICrmCustomer extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  leadNumber: string;
  leadSource?:
    | 'Phone Call'
    | 'Walk-in'
    | 'Referral'
    | 'Existing Customer'
    | 'Builder Reference'
    | 'Architect Reference'
    | 'Society Reference'
    | 'Social Media'
    | 'Other';
  name: string;
  mobileNumber: string;
  alternateNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  propertyType?: 'Flat' | 'Villa' | 'Office' | 'Shop' | 'Other';
  propertyAddress?: string;
  projectLocation?: string;

  assignedSalesExecutive?: mongoose.Types.ObjectId;
  designerAssigned?: mongoose.Types.ObjectId;

  priority: 'Low' | 'Medium' | 'High';
  budgetRange?: string;
  possessionDate?: Date;

  status:
    | 'New Lead'
    | 'Contacted'
    | 'Meeting Scheduled'
    | 'Measurement Done'
    | 'Requirement Completed'
    | 'Design Approved'
    | 'Quotation Sent'
    | 'Booking Pending'
    | 'Won'
    | 'Lost';
  remarks?: string;

  lostReason?: 'Budget' | 'Competitor' | 'No Response' | 'Possession Delayed' | 'Cancelled' | 'Other';
  competitorName?: string;
  futureFollowUpDate?: Date;

  siteVisitScheduledDate?: Date;
  siteMeasurements?: ISiteMeasurements;
  sitePhotos: string[];

  requirements: IRequirement[];
  designFiles: IDesignFile[];
  quotations: IQuotation[];

  createdBy: mongoose.Types.ObjectId;
  linkedProject?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const SiteMeasurementsSchema = new Schema<ISiteMeasurements>(
  {
    carpetArea: String,
    ceilingHeight: String,
    rooms: String,
    notes: String,
  },
  { _id: false }
);

const RequirementSchema = new Schema<IRequirement>({
  roomName: String,
  description: String,
  theme: String,
});

const DesignFileSchema = new Schema<IDesignFile>({
  name: String,
  url: String,
  fileType: String,
  uploadedAt: { type: Date, default: Date.now },
});

const QuotationItemSchema = new Schema<IQuotationItem>(
  {
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>({
  version: Number,
  items: [QuotationItemSchema],
  subtotal: Number,
  tax: Number,
  taxPercentage: Number,
  discount: Number,
  grandTotal: Number,
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected'], default: 'Sent' },
  createdAt: { type: Date, default: Date.now },
  notes: String,
});

const CrmCustomerSchema = new Schema<ICrmCustomer>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    leadNumber: { type: String, index: true },
    leadSource: {
      type: String,
      enum: [
        'Phone Call',
        'Walk-in',
        'Referral',
        'Existing Customer',
        'Builder Reference',
        'Architect Reference',
        'Society Reference',
        'Social Media',
        'Other',
      ],
    },
    name: { type: String, required: [true, 'Please provide customer name'], trim: true },
    mobileNumber: { type: String, required: [true, 'Please provide mobile number'], trim: true },
    alternateNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    propertyType: { type: String, enum: ['Flat', 'Villa', 'Office', 'Shop', 'Other'] },
    propertyAddress: { type: String, trim: true },
    projectLocation: { type: String, trim: true },

    assignedSalesExecutive: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    designerAssigned: { type: Schema.Types.ObjectId, ref: 'User' },

    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    budgetRange: { type: String },
    possessionDate: { type: Date },

    status: {
      type: String,
      enum: [
        'New Lead',
        'Contacted',
        'Meeting Scheduled',
        'Measurement Done',
        'Requirement Completed',
        'Design Approved',
        'Quotation Sent',
        'Booking Pending',
        'Won',
        'Lost',
      ],
      default: 'New Lead',
      index: true,
    },
    remarks: { type: String },

    lostReason: { type: String, enum: ['Budget', 'Competitor', 'No Response', 'Possession Delayed', 'Cancelled', 'Other'] },
    competitorName: { type: String },
    futureFollowUpDate: { type: Date },

    siteVisitScheduledDate: { type: Date },
    siteMeasurements: SiteMeasurementsSchema,
    sitePhotos: [{ type: String }],

    requirements: [RequirementSchema],
    designFiles: [DesignFileSchema],
    quotations: [QuotationSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    linkedProject: { type: Schema.Types.ObjectId, ref: 'Project' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

CrmCustomerSchema.index({ organizationId: 1, leadNumber: 1 }, { unique: true });

export const CrmCustomer: Model<ICrmCustomer> =
  mongoose.models.CrmCustomer || mongoose.model<ICrmCustomer>('CrmCustomer', CrmCustomerSchema);

export default CrmCustomer;
