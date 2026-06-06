import mongoose from 'mongoose';

// A rating + comment, either of a flat (written by a guest) or of a guest (written by a host).
// Every review is double-gated: it is published only once BOTH the guest party has confirmed
// it AND a moderator (admin) has approved it. The owning host may always reply to it.
const ReviewSchema = new mongoose.Schema({
  apartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
  // 'flat'  -> a guest reviews the residence
  // 'guest' -> a host reviews the guest
  type: { type: String, enum: ['flat', 'guest'], required: true },

  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },

  // Author + the guest party. Stored as strings to tolerate non-ObjectId identities
  // (e.g. agent/admin tokens) without Mongoose cast errors.
  authorId: { type: String },
  authorName: { type: String, default: '' },
  authorRole: { type: String, default: '' },
  guestId: { type: String }, // the guest: the author for 'flat' reviews, the subject for 'guest' reviews

  // Two-step moderation — published only when both are true.
  guestConfirmed: { type: Boolean, default: false },
  moderatorApproved: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },

  // The owning host's answer to the comment (always allowed).
  hostReply: { type: String, default: '' },
  hostReplyAt: { type: Date },
}, { timestamps: true });

ReviewSchema.index({ apartmentId: 1, type: 1, status: 1 });
ReviewSchema.index({ guestId: 1, type: 1, status: 1 });

export default mongoose.model('Review', ReviewSchema);
