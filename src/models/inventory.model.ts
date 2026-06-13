// =============================================================================
// InteriorOS Backend — Inventory Model
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventory extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  productName: string;
  totalReceived: number;
  installedQuantity: number;
  unit: string;
  installHistory: Array<{
    _id?: mongoose.Types.ObjectId;
    quantity: number;
    date: Date;
    notes?: string;
  }>;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    productName: { type: String, required: true, trim: true },
    totalReceived: { type: Number, required: true, default: 0, min: 0 },
    installedQuantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, trim: true },
    installHistory: [
      {
        quantity: { type: Number, required: true, min: 1 },
        date: { type: Date, required: true, default: Date.now },
        notes: String,
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

// Ensure a product name is unique within a single project
InventorySchema.index({ organizationId: 1, projectId: 1, productName: 1 }, { unique: true });

// Pre-query soft delete filters
InventorySchema.pre('find', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

InventorySchema.pre('findOne', function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
});

export const Inventory: Model<IInventory> = mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
export default Inventory;
