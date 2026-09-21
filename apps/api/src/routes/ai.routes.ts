import { Router } from 'express';
import { z } from 'zod';
import { aiLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { getConfig } from '../config/config.js';
import { bookingHelp, symptomGuide } from '../services/ai.service.js';

const router = Router();

router.get('/status', (_req, res) => {
  const cfg = getConfig();
  res.json({
    data: {
      enabled: cfg.AI_ENABLED && cfg.OPENROUTER_API_KEY.length > 0,
      model: cfg.OPENROUTER_MODEL,
      provider: 'openrouter',
    },
  });
});

router.post(
  '/symptom-guide',
  aiLimiter,
  validateBody(z.object({ symptoms: z.string().min(3).max(2000), language: z.string().max(20).optional() })),
  async (req, res, next) => {
    try {
      const result = await symptomGuide({ symptoms: req.body.symptoms, language: req.body.language });
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/booking-help',
  aiLimiter,
  validateBody(z.object({ query: z.string().min(3).max(2000) })),
  async (req, res, next) => {
    try {
      const result = await bookingHelp({ query: req.body.query });
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
