import { Router } from 'express';

const router = Router();

// Placeholder — full implementation in Phase 2 with SQLite
router.get('/', (_req, res) => {
  res.json({
    data: {
      message: 'Progress tracking will be available after Phase 2',
      challengesCompleted: 0,
      totalPoints: 0,
    },
  });
});

export { router as progressRouter };
