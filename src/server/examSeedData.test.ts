import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExamDirectoryEntry } from '../types/index.ts';
import { getExamRegistrationStatus, type ExamDirectoryFilters } from './examDirectory.ts';
import { createExamRouter } from './examRoutes.ts';

const dataDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/exams');
const allowedCategories = new Set([
  'UPSC',
  'SSC',
  'Railways',
  'Banking & Insurance',
  'Engineering',
  'Medical',
  'Management',
  'Undergraduate',
  'Teaching & Eligibility',
]);
const officialDomains = [
  'gov.in',
  'nic.in',
  'ac.in',
  'ibps.in',
  'bank.in',
  'licindia.in',
  'nabard.org',
  'rbi.org.in',
  'bitsadmission.com',
  'wbjeeb.nic.in',
  'mahacet.org',
  'cetonline.karnataka.gov.in',
  'cee.kerala.gov.in',
  'cets.apsche.ap.gov.in',
  'eapcet.tsche.ac.in',
  'comedk.org',
  'vit.ac.in',
  'nbe.edu.in',
  'natboard.edu.in',
  'aiimsexams.ac.in',
  'aiimsexams.org',
  'mcc.nic.in',
  'clatconsortiumofnlu.ac.in',
  'nift.ac.in',
  'nid.edu',
  'ugcnet.nta.ac.in',
  'ctet.nic.in',
  'iimcat.ac.in',
  'nta.ac.in',
  'jeeadv.ac.in',
  'iitg.ac.in',
  'indianrailways.gov.in',
  'rrbapply.gov.in',
];

test('all exam seed records are unique, visible, dated, and use official URLs and existing categories', async () => {
  const slugs = new Set<string>();
  const counts = new Map<string, number>();
  const files = (await readdir(dataDirectory)).filter((file) => file.endsWith('.json'));
  assert.ok(files.includes('state-psc.json'));
  assert.ok(files.includes('police-defence.json'));
  assert.ok(files.includes('phase1.json'));

  for (const file of files) {
    const records: unknown = JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8'));
    assert.ok(Array.isArray(records), `${file} must contain a JSON array`);
    for (const [index, raw] of records.entries()) {
      assert.equal(typeof raw, 'object', `${file} record ${index + 1} must be an object`);
      assert.ok(raw !== null && !Array.isArray(raw), `${file} record ${index + 1} must be an object`);
      const record = raw as Record<string, unknown>;
      const label = `${file} record ${index + 1}`;

      assert.equal(typeof record.slug, 'string', `${label} is missing slug`);
      const slug = record.slug as string;
      assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label} has an invalid slug`);
      assert.ok(!slugs.has(slug), `duplicate exam slug: ${slug}`);
      slugs.add(slug);

      assert.equal(typeof record.sourceUrl, 'string', `${label} must have a sourceUrl`);
      assert.ok((record.sourceUrl as string).trim(), `${label} sourceUrl cannot be empty`);
      const verifiedAt = record.verifiedAt;
      assert.equal(typeof verifiedAt, 'string', `${label} must be seeded with verifiedAt`);
      assert.match(verifiedAt as string, /^\d{4}-\d{2}-\d{2}$/, `${label} verifiedAt must be an ISO date`);
      assert.equal(typeof record.lastVerifiedAt, 'string', `${label} must have lastVerifiedAt`);

      assert.equal(typeof record.category, 'string', `${label} must have a category`);
      assert.ok(allowedCategories.has(record.category as string), `${label} uses a category absent from the existing filter`);
      counts.set(record.category as string, (counts.get(record.category as string) ?? 0) + 1);

      for (const field of ['sourceUrl', 'officialWebsite', 'registrationUrl', 'notificationUrl', 'syllabusUrl']) {
        const value = record[field];
        if (value === null || value === undefined) continue;
        assert.equal(typeof value, 'string', `${label} ${field} must be a URL or null`);
        const url = new URL(value as string);
        assert.equal(url.protocol, 'https:', `${label} ${field} must use HTTPS`);
        assert.ok(
          officialDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)),
          `${label} ${field} uses a non-official domain: ${url.hostname}`,
        );
      }
    }
  }

  assert.ok((counts.get('Engineering') ?? 0) > 0);
  assert.ok((counts.get('Railways') ?? 0) > 0);
  assert.ok((counts.get('Medical') ?? 0) > 0);

  const phase1 = JSON.parse(await readFile(path.join(dataDirectory, 'phase1.json'), 'utf8')) as Record<string, unknown>[];
  assert.equal(phase1.length, 15);
  assert.deepEqual(
  phase1.map((record) => record.slug).sort(),
  [
    'cat',
    'cuet-ug',
    'gate',
    'ibps-po',
    'jee-advanced',
    'jee-main',
    'neet-ug',
    'rrb-group-d',
    'rrb-ntpc',
    'sbi-po',
    'ssc-chsl',
    'ssc-cgl',
    'ugc-net',
    'upsc-cse',
    'upsc-nda',
  ].sort(),
  );
});

test('seeded Engineering, Railways, and Medical records are returned by category-filtered exam API', async () => {
  const files = (await readdir(dataDirectory)).filter((file) => file.endsWith('.json'));
  const exams: ExamDirectoryEntry[] = [];
  for (const file of files) {
    const records: unknown = JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8'));
    assert.ok(Array.isArray(records));
    for (const raw of records) {
      const record = raw as Record<string, unknown>;
      const start = record.registrationStartDate as string | null;
      const end = record.registrationEndDate as string | null;
      exams.push({
        id: typeof record.id === 'string' ? record.id : record.slug as string,
        slug: record.slug as string,
        name: record.name as string,
        shortName: typeof record.shortName === 'string' ? record.shortName : null,
        category: record.category as string,
        level: record.level as 'national' | 'state',
        state: typeof record.state === 'string' ? record.state : null,
        conductingBody: record.conductingBody as string,
        officialWebsite: typeof record.officialWebsite === 'string' ? record.officialWebsite : null,
        registrationUrl: typeof record.registrationUrl === 'string' ? record.registrationUrl : null,
        notificationUrl: typeof record.notificationUrl === 'string' ? record.notificationUrl : null,
        syllabusUrl: typeof record.syllabusUrl === 'string' ? record.syllabusUrl : null,
        registrationStartDate: start,
        registrationEndDate: end,
        examDate: typeof (record.directoryExamDate ?? record.examDate) === 'string'
          ? record.directoryExamDate as string ?? record.examDate as string
          : null,
        admitCardDate: typeof (record.directoryAdmitCardDate ?? record.admitCardDate) === 'string'
          ? record.directoryAdmitCardDate as string ?? record.admitCardDate as string
          : null,
        resultDate: typeof record.resultDate === 'string' ? record.resultDate : null,
        applicationFee: record.applicationFee as ExamDirectoryEntry['applicationFee'] ?? null,
        eligibility: typeof record.eligibility === 'string' ? record.eligibility : null,
        ageLimit: typeof record.ageLimit === 'string' ? record.ageLimit : null,
        mode: record.mode === 'online' || record.mode === 'offline' ? record.mode : null,
        status: getExamRegistrationStatus(start, end),
        frequency: typeof record.frequency === 'string' ? record.frequency : null,
        sourceUrl: record.sourceUrl as string,
        lastVerifiedAt: (record.verifiedAt ?? record.lastVerifiedAt) as string,
      });
    }
  }

  const app = express();
  app.use('/api/exams', createExamRouter({
    getExamDirectory: async (filters: ExamDirectoryFilters) => {
      const filtered = exams.filter((exam) =>
        (!filters.category || exam.category === filters.category) &&
        (!filters.level || exam.level === filters.level) &&
        (!filters.state || exam.state === filters.state) &&
        (!filters.status || exam.status === filters.status) &&
        (!filters.search || exam.name.toLowerCase().includes(filters.search.toLowerCase())),
      );
      const start = (filters.page - 1) * filters.limit;
      return {
        exams: filtered.slice(start, start + filters.limit),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / filters.limit),
        },
      };
    },
    getExamDirectoryBySlug: async (slug) => exams.find((exam) => exam.slug === slug),
  }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;

  try {
    for (const category of ['Engineering', 'Railways', 'Medical', 'Teaching & Eligibility']) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/exams?category=${encodeURIComponent(category)}`);
      assert.equal(response.status, 200);
      const result = await response.json() as { exams: ExamDirectoryEntry[] };
      assert.ok(result.exams.length > 0, `category=${category} should return at least one seeded record`);
      assert.ok(result.exams.every((exam) => exam.category === category));
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
