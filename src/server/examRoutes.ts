import { Router, type Request, type Response } from 'express';
import type { ExamDirectoryEntry } from '../types/index.ts';
import { parseExamDirectoryFilters, type ExamDirectoryFilters, type ExamDirectoryQueryResult } from './examDirectory.ts';

export interface ExamDirectoryStore {
  getExamDirectory(filters: ExamDirectoryFilters): Promise<ExamDirectoryQueryResult<ExamDirectoryEntry>>;
  getExamDirectoryBySlug(slug: string): Promise<ExamDirectoryEntry | undefined>;
}

export const createExamRouter = (store: ExamDirectoryStore): Router => {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    let filters: ExamDirectoryFilters;
    try {
      filters = parseExamDirectoryFilters(req.query as Record<string, unknown>);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid exam filters.',
        code: 'INVALID_EXAM_QUERY',
      });
      return;
    }

    try {
      res.json(await store.getExamDirectory(filters));
    } catch (error) {
      console.error('[Exams] Directory list query failed:', error);
      res.status(500).json({ error: 'Unable to load the exam directory.' });
    }
  });

  router.get('/:slug', async (req: Request, res: Response) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug)) {
      res.status(400).json({ error: 'Invalid exam slug.', code: 'INVALID_EXAM_SLUG' });
      return;
    }
    try {
      const exam = await store.getExamDirectoryBySlug(req.params.slug);
      if (!exam) {
        res.status(404).json({ error: 'Exam not found.' });
        return;
      }
      res.json({ exam });
    } catch (error) {
      console.error('[Exams] Directory detail query failed:', error);
      res.status(500).json({ error: 'Unable to load this exam.' });
    }
  });

  return router;
};
