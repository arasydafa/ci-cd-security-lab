import { Router } from 'express';
import { ChallengeManager } from '@cicd-lab/simulator';

const router = Router();
const manager = new ChallengeManager();

// GET /api/v1/challenges — list all challenges
router.get('/', (_req, res) => {
  const challenges = manager.getAll();
  const { level, topic } = _req.query;

  let filtered = challenges;
  if (level && typeof level === 'string') {
    filtered = filtered.filter((c) => c.level === level);
  }
  if (topic && typeof topic === 'string') {
    filtered = filtered.filter((c) => c.topic === topic);
  }

  res.json({
    data: filtered.map((c) => ({
      id: c.id,
      title: c.title,
      level: c.level,
      topic: c.topic,
      category: c.category,
      points: c.points,
      estimatedTime: c.estimatedTime,
      tags: c.tags,
    })),
  });
});

// GET /api/v1/challenges/:id — get challenge details
router.get('/:id', (req, res) => {
  const challenge = manager.getById(req.params.id);
  if (!challenge) {
    res.status(404).json({
      error: {
        code: 'CHALLENGE_NOT_FOUND',
        message: `Challenge "${req.params.id}" not found`,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const scenario = manager.getScenario(req.params.id);
  const vulnerable = manager.getVulnerableWorkflow(req.params.id);

  res.json({
    data: {
      ...challenge,
      scenario,
      vulnerableWorkflow: vulnerable,
      hintCount: challenge.paths.hints.length,
    },
  });
});

// GET /api/v1/challenges/:id/hint/:number — get a hint
router.get('/:id/hint/:number', (req, res) => {
  const hintNum = parseInt(req.params.number, 10);
  if (isNaN(hintNum) || hintNum < 1) {
    res.status(400).json({
      error: {
        code: 'INVALID_HINT_NUMBER',
        message: 'Hint number must be a positive integer',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const hint = manager.getHint(req.params.id, hintNum - 1);
  if (!hint) {
    res.status(404).json({
      error: {
        code: 'HINT_NOT_FOUND',
        message: `Hint ${hintNum} not available`,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  res.json({ data: { hint, number: hintNum } });
});

// GET /api/v1/challenges/:id/solution — get solution workflow
router.get('/:id/solution', (req, res) => {
  const solution = manager.getSolutionWorkflow(req.params.id);
  if (!solution) {
    res.status(404).json({
      error: {
        code: 'SOLUTION_NOT_FOUND',
        message: 'Solution not available for this challenge',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  res.json({ data: { workflow: solution } });
});

export { router as challengesRouter };
