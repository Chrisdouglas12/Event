import mongoose from 'mongoose';

// Binary assets (booklet, programme, etc.) stored directly in MongoDB so
// deployments do not depend on local files surviving a rebuild.
const resourceSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/octet-stream',
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { collection: 'resources', timestamps: true }
);

export const Resource = (mongoose.models.Resource || mongoose.model('Resource', resourceSchema)) as mongoose.Model<any>;
