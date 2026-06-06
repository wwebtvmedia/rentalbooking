import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Apartment from '../models/Apartment.js';
import { authMiddleware, requireRole } from '../auth/index.js';

const router = express.Router();
router.use(authMiddleware);

const hasRole = (req, role) => Array.isArray(req.user?.roles) && req.user.roles.includes(role);

// A review is published only once the guest party has confirmed AND a moderator approved.
function recomputeStatus(review) {
  if (review.status === 'rejected') return;
  review.status = review.guestConfirmed && review.moderatorApproved ? 'published' : 'pending';
}

function publicView(r) {
  return {
    _id: r._id,
    type: r.type,
    rating: r.rating,
    comment: r.comment,
    authorName: r.authorName,
    createdAt: r.createdAt,
    ...(r.hostReply ? { hostReply: r.hostReply, hostReplyAt: r.hostReplyAt } : {}),
  };
}

// Create a review (guest -> flat, or host -> guest). Always starts 'pending'.
router.post('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const { apartmentId, type = 'flat', rating, comment = '', guestId } = req.body || {};
    if (!apartmentId || !mongoose.Types.ObjectId.isValid(apartmentId)) {
      return res.status(400).json({ error: 'Invalid apartmentId' });
    }
    const r = Number(rating);
    if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: 'rating must be 1-5' });

    const apt = await Apartment.findById(apartmentId);
    if (!apt) return res.status(404).json({ error: 'Apartment not found' });

    const resolvedType = type === 'guest' ? 'guest' : 'flat';
    let gId;
    if (resolvedType === 'guest') {
      if (!hasRole(req, 'host') && !hasRole(req, 'admin')) {
        return res.status(403).json({ error: 'Only a host can review a guest' });
      }
      if (!guestId) return res.status(400).json({ error: 'guestId is required for a guest review' });
      gId = String(guestId);
    } else {
      gId = String(req.user.id);
    }

    const review = await Review.create({
      apartmentId,
      type: resolvedType,
      rating: r,
      comment: String(comment).slice(0, 2000),
      authorId: String(req.user.id),
      authorName: req.user.name || 'Member',
      authorRole: (Array.isArray(req.user.roles) ? req.user.roles[0] : '') || '',
      guestId: gId,
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The guest party confirms the review (step 1 of moderation).
router.post('/:id/confirm', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    if (String(req.user.id) !== review.guestId && !hasRole(req, 'admin')) {
      return res.status(403).json({ error: 'Only the guest can confirm this review' });
    }
    review.guestConfirmed = true;
    recomputeStatus(review);
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The owning host replies to a comment (always allowed). Admins may reply to any.
router.post('/:id/reply', requireRole('host'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    const apt = await Apartment.findById(review.apartmentId, 'hostId');
    if (!hasRole(req, 'admin') && apt?.hostId?.toString() !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the owning host can reply' });
    }
    review.hostReply = String(req.body?.text || '').slice(0, 2000);
    review.hostReplyAt = new Date();
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderator approves (step 2) — publishes once the guest has also confirmed.
router.post('/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    review.moderatorApproved = true;
    recomputeStatus(review);
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderator rejects a review.
router.post('/:id/reject', requireRole('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    review.status = 'rejected';
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderator queue: reviews awaiting approval.
router.get('/pending', requireRole('admin'), async (req, res) => {
  try {
    const list = await Review.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: published reviews + aggregate rating. Filter by apartmentId (flat reviews)
// or guestId (guest reviews).
router.get('/', async (req, res) => {
  try {
    const { apartmentId, guestId, type = 'flat' } = req.query;
    const q = { status: 'published', type: type === 'guest' ? 'guest' : 'flat' };
    if (apartmentId) {
      if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        return res.json({ summary: { count: 0, averageRating: 0 }, reviews: [] });
      }
      q.apartmentId = apartmentId;
    }
    if (guestId) q.guestId = String(guestId);

    const list = await Review.find(q).sort({ createdAt: -1 }).limit(200);
    const count = list.length;
    const averageRating = count ? Number((list.reduce((a, b) => a + b.rating, 0) / count).toFixed(2)) : 0;
    res.json({ summary: { count, averageRating }, reviews: list.map(publicView) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
