import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema);
export default Media;
