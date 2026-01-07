import { Router } from 'express';
import { createBidRecommendations } from '../services/aiAssistant';

const router = Router();

router.post('/bid-assist', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    return res.status(400).json({ error: 'lineItems are required' });
  }

  try {
    const recommendation = createBidRecommendations(payload);
    res.json(recommendation);
  } catch (error) {
    console.error('AI assistant error', error);
    res.status(500).json({ error: 'Failed to build bid recommendation' });
  }
});

export default router;


