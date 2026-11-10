import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { getExamRegistrationStatus } from '../src/server/examDirectory.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'data', 'exams');
const allowedOfficialDomains = [
  'gov.in', 'nic.in', 'ac.in', 'ibps.in', 'bank.in', 'licindia.in', 'nabard.org', 'rbi.org.in',
  'bitsadmission.com', 'bits-pilani.ac.in', 'wbjeeb.nic.in', 'mahacet.org', 'cetonline.karnataka.gov.in', 'cee.kerala.gov.in',
  'cets.apsche.ap.gov.in', 'eapcet.tsche.ac.in', 'comedk.org', 'vit.ac.in', 'nbe.edu.in',
  'natboard.edu.in', 'aiimsexams.ac.in', 'aiimsexams.org', 'mcc.nic.in', 'clatconsortiumofnlu.ac.in', 'nift.ac.in',
  'nid.edu', 'admissions.nid.edu', 'ugcnet.nta.ac.in', 'ctet.nic.in', 'iimcat.ac.in', 'nta.ac.in',
  'jeeadv.ac.in', 'iitg.ac.in', 'indianrailways.gov.in', 'rrbapply.gov.in',
];
const allowedCategories = [
  'UPSC', 'SSC', 'Railways', 'Banking & Insurance', 'Engineering', 'Medical', 'Management', 'Undergraduate',
  'Teaching & Eligibility',
];

interface ExamSeedRecord {
  id?: string;
  slug: string;
  name: string;
  shortName: string | null;
  category: string;
  level: 'national' | 'state';
  state: string | null;
  conductingBody: string;
  officialWebsite: string | null;
  registrationUrl: string | null;
  notificationUrl: string | null;
  syllabusUrl: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  examDate: string | null;
  admitCardDate: string | null;
  resultDate: string | null;
  applicationFee: { general: number | null; reserved: number | null } | null;
  eligibility: string | null;
  ageLimit: string | null;
  mode: 'online' | 'offline' | null;
  frequency: string | null;
  sourceUrl: string;
  verifiedAt: string;
  lastVerifiedAt: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nullableString = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} must be a non-empty string or null.`);
  return value.trim();
};

const requiredString = (value: unknown, field: string): string => {
  const text = nullableString(value, field);
  if (!text) throw new Error(`${field} is required.`);
  return text;
};

const officialUrl = (value: unknown, field: string, required = false): string | null => {
  const url = nullableString(value, field);
  if (!url) {
    if (required) throw new Error(`${field} is required and must be an official URL.`);
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' ||
      !allowedOfficialDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    throw new Error(`${field} must use a verified official government, education, or exam-board domain.`);
  }
  return parsed.toString();
};

const dateOnly = (value: unknown, field: string, required = false): string | null => {
  const date = nullableString(value, field);
  if (!date) {
    if (required) throw new Error(`${field} is required.`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new Error(`${field} must be a real YYYY-MM-DD date.`);
  }
  return date;
};

const optionalText = (value: unknown, field: string): string | null => {
  const text = nullableString(value, field);
  return text;
};

const validateSeedRecord = (value: unknown): ExamSeedRecord => {
  if (!isRecord(value)) throw new Error('Each exam record must be an object.');
  const slug = nullableString(value.slug, 'slug');
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('slug must contain lowercase letters, numbers, and hyphens only.');
  const name = requiredString(value.name, 'name');
  const category = requiredString(value.category, 'category');
  if (!allowedCategories.includes(category)) {
    throw new Error(`category must match an existing exam filter: ${allowedCategories.join(', ')}.`);
  }
  const conductingBody = requiredString(value.conductingBody, 'conductingBody');
  const id = value.id === undefined ? null : optionalText(value.id, 'id');
  const level = value.level;
  if (level !== 'national' && level !== 'state') throw new Error('level must be national or state.');
  const state = nullableString(value.state, 'state');
  if (level === 'state' && !state) throw new Error('State-level exams must include the state name.');
  const mode = value.mode;
  if (mode !== null && mode !== 'online' && mode !== 'offline') throw new Error('mode must be online, offline, or null.');

  let applicationFee: ExamSeedRecord['applicationFee'] = null;
  if (value.applicationFee !== null) {
    if (!isRecord(value.applicationFee)) throw new Error('applicationFee must be an object or null.');
    const feeValue = (fee: unknown, field: string) => {
      if (fee === null) return null;
      if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) throw new Error(`${field} must be a non-negative number or null.`);
      return fee;
    };
    applicationFee = {
      general: feeValue(value.applicationFee.general, 'applicationFee.general'),
      reserved: feeValue(value.applicationFee.reserved, 'applicationFee.reserved'),
    };
  }

  return {
    id: id ?? slug,
    slug,
    name,
    shortName: optionalText(value.shortName, 'shortName'),
    category,
    level,
    state,
    conductingBody,
    officialWebsite: officialUrl(value.officialWebsite, 'officialWebsite'),
    registrationUrl: officialUrl(value.registrationUrl, 'registrationUrl'),
    notificationUrl: officialUrl(value.notificationUrl, 'notificationUrl'),
    syllabusUrl: officialUrl(value.syllabusUrl, 'syllabusUrl'),
    registrationStartDate: dateOnly(value.registrationStartDate, 'registrationStartDate'),
    registrationEndDate: dateOnly(value.registrationEndDate, 'registrationEndDate'),
    examDate: dateOnly(value.directoryExamDate ?? value.examDate, 'directoryExamDate'),
    admitCardDate: dateOnly(value.directoryAdmitCardDate ?? value.admitCardDate, 'directoryAdmitCardDate'),
    resultDate: dateOnly(value.resultDate, 'resultDate'),
    applicationFee,
    eligibility: optionalText(value.eligibility, 'eligibility'),
    ageLimit: optionalText(value.ageLimit, 'ageLimit'),
    mode,
    frequency: optionalText(value.frequency, 'frequency'),
    sourceUrl: officialUrl(value.sourceUrl, 'sourceUrl', true)!,
    verifiedAt: dateOnly(value.verifiedAt ?? value.lastVerifiedAt, 'verifiedAt', true)!,
    lastVerifiedAt: dateOnly(value.lastVerifiedAt ?? value.verifiedAt, 'lastVerifiedAt', true)!,
  };
};

const prisma = process.env.DATABASE_URL
  ? new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) })
  : null;

if (!prisma) throw new Error('DATABASE_URL must be configured to seed exams.');

try {
  const availableFiles = (await readdir(dataDirectory)).filter((file) => file.endsWith('.json')).sort();
  const requestedFile = process.argv[2];
  if (requestedFile && (path.basename(requestedFile) !== requestedFile || !requestedFile.endsWith('.json'))) {
    throw new Error('Specify an exam data JSON filename within data/exams/.');
  }
  const files = requestedFile
    ? availableFiles.filter((file) => file === requestedFile)
    : availableFiles;
  if (requestedFile && !files.length) throw new Error(`Exam data file not found: ${requestedFile}.`);
  if (!files.length) throw new Error(`No exam category JSON files found in ${dataDirectory}.`);
  const counts = new Map<string, { inserted: number; updated: number }>();
  const seenSlugs = new Set<string>();
  for (const file of files) {
    const parsed: unknown = JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8'));
    if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array.`);
    for (const [index, rawRecord] of parsed.entries()) {
      let record: ExamSeedRecord;
      try {
        record = validateSeedRecord(rawRecord);
      } catch (error) {
        throw new Error(`${file} record ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (seenSlugs.has(record.slug)) throw new Error(`Duplicate exam slug "${record.slug}" in ${file}.`);
      seenSlugs.add(record.slug);

      const start = record.registrationStartDate ? new Date(`${record.registrationStartDate}T00:00:00.000Z`) : null;
      const end = record.registrationEndDate ? new Date(`${record.registrationEndDate}T00:00:00.000Z`) : null;
      if (start && end && start > end) {
        throw new Error(`${file} record ${index + 1}: registrationEndDate cannot precede registrationStartDate.`);
      }
      const examDate = record.examDate ? new Date(`${record.examDate}T00:00:00.000Z`) : null;
      const admitCardDate = record.admitCardDate ? new Date(`${record.admitCardDate}T00:00:00.000Z`) : null;
      const resultDate = record.resultDate ? new Date(`${record.resultDate}T00:00:00.000Z`) : null;
      const verifiedAt = new Date(`${record.verifiedAt}T00:00:00.000Z`);
      const legacyStatus = getExamRegistrationStatus(record.registrationStartDate, record.registrationEndDate);
      const legacyFee = record.applicationFee ?? { general: null, reserved: null };
      const data = {
        slug: record.slug,
        name: record.name,
        shortName: record.shortName,
        fullName: record.name,
        authority: record.conductingBody,
        conductingBody: record.conductingBody,
        category: record.category,
        level: record.level,
        state: record.state,
        description: record.eligibility ?? '',
        eligibility: record.eligibility,
        eligibilitySummary: record.eligibility ?? '',
        ageLimit: record.ageLimit,
        mode: record.mode,
        frequency: record.frequency,
        criteria: {},
        applicationOpenDate: record.registrationStartDate ?? '',
        applicationDeadline: record.registrationEndDate ?? '',
        registrationStartDate: start,
        registrationEndDate: end,
        examDate: record.examDate ?? '',
        directoryExamDate: examDate,
        admitCardDate: record.admitCardDate ?? '',
        directoryAdmitCardDate: admitCardDate,
        resultDate,
        applicationFee: record.applicationFee === null ? Prisma.JsonNull : record.applicationFee as Prisma.InputJsonValue,
        feeINR: legacyFee as Prisma.InputJsonValue,
        officialWebsite: record.officialWebsite,
        registrationUrl: record.registrationUrl,
        notificationUrl: record.notificationUrl,
        syllabusUrl: record.syllabusUrl,
        popularCourses: [],
        documentsRequired: [],
        status: legacyStatus,
        sourceUrl: record.sourceUrl,
        verifiedAt,
        lastVerifiedAt: verifiedAt,
      };
      const existing = await prisma!.exam.findUnique({ where: { slug: record.slug }, select: { id: true } });
      await prisma!.exam.upsert({
        where: { slug: record.slug },
        create: { id: record.id ?? record.slug, ...data },
        update: data,
      });
      const categoryCount = counts.get(record.category) ?? { inserted: 0, updated: 0 };
      if (existing) categoryCount.updated += 1;
      else categoryCount.inserted += 1;
      counts.set(record.category, categoryCount);
    }
  }
  for (const [category, categoryCount] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`${category}: ${categoryCount.inserted} inserted, ${categoryCount.updated} updated`);
  }
  const totals = [...counts.values()].reduce(
    (sum, categoryCount) => ({ inserted: sum.inserted + categoryCount.inserted, updated: sum.updated + categoryCount.updated }),
    { inserted: 0, updated: 0 },
  );
  console.log(`Seed complete: ${totals.inserted} inserted, ${totals.updated} updated from ${files.length} category files.`);
} finally {
  await prisma.$disconnect();
}
