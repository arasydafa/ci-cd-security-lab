import { Router } from 'express';
import { z } from 'zod';
import { ChallengeManager } from '@cicd-lab/simulator';

const router = Router();
const manager = new ChallengeManager();

const SimulateSchema = z.object({
  challengeId: z.string().min(1),
  workflowYaml: z.string().optional(),
  hintsUsed: z.number().int().min(0).optional(),
  elapsedMs: z.number().min(0).optional(),
});

// POST /api/v1/simulate — run a workflow simulation
router.post('/', async (req, res) => {
  const parsed = SimulateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const { challengeId, workflowYaml, hintsUsed, elapsedMs } = parsed.data;

  try {
    // Explicit user invocation over the API: allow real step execution.
    process.env.CICD_LAB_EXEC = '1';
    const result = await manager.runSimulation(challengeId, workflowYaml, hintsUsed ?? 0, elapsedMs);
    res.json({ data: result });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'SIMULATION_ERROR',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export { router as simulationRouter };
