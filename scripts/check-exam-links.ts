import { readdir, readFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'data', 'exams');
const urlFields = ['officialWebsite', 'registrationUrl', 'notificationUrl', 'syllabusUrl', 'sourceUrl'] as const;
const urls = new Set<string>();
const execFile = promisify(execFileCallback);

const curlProbe = async (url: string, method: 'HEAD' | 'GET'): Promise<number> => {
  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '20',
    '--output',
    '/dev/null',
    '--write-out',
    '%{http_code}',
    '--user-agent',
    'REGISTRA exam directory link checker',
  ];
  if (method === 'HEAD') args.push('--head');
  else args.push('--range', '0-0');
  args.push(url);
  const { stdout } = await execFile('curl', args, { timeout: 25000, maxBuffer: 1024 });
  const status = Number(stdout);
  if (!Number.isInteger(status) || status < 100) throw new Error('curl did not return an HTTP status.');
  return status;
};

const isSuccessfulStatus = (status: number): boolean => status >= 200 && status < 400;

const files = (await readdir(dataDirectory)).filter((file) => file.endsWith('.json')).sort();
for (const file of files) {
  const records: unknown = JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8'));
  if (!Array.isArray(records)) throw new Error(`${file} must contain a JSON array.`);
  for (const [index, record] of records.entries()) {
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      throw new Error(`${file} record ${index + 1} must be an object.`);
    }
    const exam = record as Record<string, unknown>;
    for (const field of urlFields) {
      if (exam[field] !== null && exam[field] !== undefined) {
        if (typeof exam[field] !== 'string') throw new Error(`${file} record ${index + 1}: ${field} must be a URL or null.`);
        urls.add(exam[field]);
      }
    }
  }
}

if (!urls.size) {
  console.log('No URLs found in exam data.');
  process.exit(0);
}

let failures = 0;
for (const url of urls) {
  let headStatus: number | undefined;
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    headStatus = response.status;
    if (isSuccessfulStatus(headStatus)) {
      console.log(`OK ${headStatus} HEAD ${url}`);
      continue;
    }
  } catch (error) {
    console.warn(`HEAD unavailable ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const response = await fetch(url, {
      headers: { range: 'bytes=0-0' },
      signal: AbortSignal.timeout(15000),
    });
    const getStatus = response.status;
    await response.body?.cancel();
    if (isSuccessfulStatus(getStatus)) {
      console.log(`OK ${getStatus} GET fallback ${url}`);
      continue;
    }
    headStatus ??= getStatus;
  } catch (error) {
    console.warn(`GET unavailable ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const curlStatus = await curlProbe(url, 'HEAD');
    if (isSuccessfulStatus(curlStatus)) {
      console.log(`OK ${curlStatus} curl HEAD fallback ${url}`);
      continue;
    }
    const curlGetStatus = await curlProbe(url, 'GET');
    if (isSuccessfulStatus(curlGetStatus)) {
      console.log(`OK ${curlGetStatus} curl GET fallback ${url}`);
      continue;
    }
    failures += 1;
    console.error(`BROKEN HEAD ${headStatus ?? 'unavailable'}; GET ${curlGetStatus} ${url}`);
  } catch (error) {
    failures += 1;
    console.error(`ERROR ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) {
  console.error(`${failures} of ${urls.size} unique URL(s) failed the HEAD check.`);
  process.exitCode = 1;
} else {
  console.log(`All ${urls.size} unique URL(s) passed the HEAD check.`);
}
