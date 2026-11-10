import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamRegistrationStatus, parseExamDirectoryFilters } from './examDirectory.ts';

test('registration status is derived only from complete official dates', () => {
  const today = '2026-11-10';
  assert.equal(getExamRegistrationStatus(null, null, today), 'tbd');
  assert.equal(getExamRegistrationStatus('2026-11-11', '2026-11-20', today), 'upcoming');
  assert.equal(getExamRegistrationStatus('2026-11-01', '2026-11-20', today), 'open');
  assert.equal(getExamRegistrationStatus('2026-10-01', '2026-11-09', today), 'closed');
  assert.equal(getExamRegistrationStatus(null, '2026-11-20', today), 'tbd');
});

test('exam directory filters parse category, level, state, status, search, pagination, and sort', () => {
  assert.deepEqual(parseExamDirectoryFilters({
    category: 'UPSC',
    level: 'state',
    state: 'Maharashtra',
    status: 'open',
    search: 'civil services',
    page: '2',
    limit: '25',
    sort: 'registrationEndDate',
    sortOrder: 'desc',
  }), {
    category: 'UPSC',
    level: 'state',
    state: 'Maharashtra',
    status: 'open',
    search: 'civil services',
    page: 2,
    limit: 25,
    sortOrder: 'desc',
  });
});

test('exam directory filters reject invalid levels, statuses, and pagination', () => {
  assert.throws(() => parseExamDirectoryFilters({ level: 'global' }), /level/);
  assert.throws(() => parseExamDirectoryFilters({ status: 'active' }), /status/);
  assert.throws(() => parseExamDirectoryFilters({ page: '0' }), /positive integer/);
  assert.throws(() => parseExamDirectoryFilters({ limit: '101' }), /must not exceed 100/);
});
