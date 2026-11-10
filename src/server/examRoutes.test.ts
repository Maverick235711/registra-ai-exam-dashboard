import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ExamDirectoryEntry } from '../types/index.ts';
import type { ExamDirectoryFilters } from './examDirectory.ts';
import { createExamRouter } from './examRoutes.ts';

const sampleExam: ExamDirectoryEntry = {
  id: 'upsc-cse',
  slug: 'upsc-cse',
  name: 'Civil Services Examination',
  shortName: 'UPSC CSE',
  category: 'UPSC',
  level: 'national',
  state: null,
  conductingBody: 'Union Public Service Commission',
  officialWebsite: 'https://upsc.gov.in/',
  registrationUrl: null,
  notificationUrl: null,
  syllabusUrl: null,
  registrationStartDate: null,
  registrationEndDate: null,
  examDate: null,
  admitCardDate: null,
  resultDate: null,
  applicationFee: null,
  eligibility: null,
  ageLimit: null,
  mode: null,
  status: 'tbd',
  frequency: null,
  sourceUrl: 'https://upsc.gov.in/',
  lastVerifiedAt: '2026-11-10',
};

test('exam directory API applies validated filters and pagination', async () => {
  let receivedFilters: ExamDirectoryFilters | undefined;
  const app = express();
  app.use('/api/exams', createExamRouter({
    getExamDirectory: async (filters) => {
      receivedFilters = filters;
      return {
        exams: [sampleExam],
        pagination: { page: filters.page, limit: filters.limit, total: 1, totalPages: 1 },
      };
    },
    getExamDirectoryBySlug: async (slug) => slug === sampleExam.slug ? sampleExam : undefined,
  }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/exams?category=UPSC&level=national&status=tbd&page=2&limit=5`,
    );
    assert.equal(response.status, 200);
    const result = await response.json() as { exams: ExamDirectoryEntry[]; pagination: { page: number; limit: number } };
    assert.equal(result.exams[0].slug, 'upsc-cse');
    assert.deepEqual(result.pagination, { page: 2, limit: 5, total: 1, totalPages: 1 });
    assert.deepEqual(receivedFilters, {
      category: 'UPSC',
      level: 'national',
      status: 'tbd',
      page: 2,
      limit: 5,
      sortOrder: 'asc',
    });

    const invalid = await fetch(`http://127.0.0.1:${address.port}/api/exams?level=global`);
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_EXAM_QUERY');

    const detail = await fetch(`http://127.0.0.1:${address.port}/api/exams/upsc-cse`);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).exam.slug, 'upsc-cse');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
