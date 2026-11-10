import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, apiService } from './apiService.ts';

test('login sends JSON credentials with cookies and preserves server authentication errors', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const responseBody = calls.length === 1
      ? { error: 'Invalid email or password.' }
      : { error: 'Database query failed in development.', code: 'P2021' };
    return new Response(JSON.stringify(responseBody), {
      status: calls.length === 1 ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      apiService.login('candidate@example.test', 'Synthetic-Password1'),
      (error: unknown) => error instanceof ApiError
        && error.status === 401
        && error.message === 'Invalid email or password.',
    );
    await assert.rejects(
      apiService.login('candidate@example.test', 'Synthetic-Password1'),
      (error: unknown) => error instanceof ApiError
        && error.status === 500
        && error.code === 'P2021'
        && error.message === 'Database query failed in development.',
    );

    assert.equal(calls.length, 2);
    for (const { input, init } of calls) {
      assert.equal(input, '/api/auth/login');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.credentials, 'include');
      assert.equal(init?.headers instanceof Headers && init.headers.get('Content-Type'), 'application/json');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: 'candidate@example.test',
        password: 'Synthetic-Password1',
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
