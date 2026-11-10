import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../src/server/prisma.ts';
import { profileUpdateData } from '../src/server/db.ts';
import { ExamCategory, StudentProfile } from '../src/types/index.ts';

type JsonRecord = Record<string, unknown>;
type ImportBucket = { imported: number; skipped: number; failed: number };
type ImportSummary = {
  users: ImportBucket;
  profiles: ImportBucket;
  documents: ImportBucket;
  applications: ImportBucket;
  exams: ImportBucket;
  sessions: ImportBucket;
  failures: string[];
};

const demoUserIds = new Set(['usr_26ucc005', 'usr_fresh_applicant', 'usr_verified_applicant']);
const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requiredString = (record: JsonRecord, key: string): string => {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid ${key}`);
  return value;
};

const optionalString = (record: JsonRecord, key: string): string | null => {
  const value = record[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`invalid ${key}`);
  return value;
};

const stringArray = (record: JsonRecord, key: string): string[] => {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Error(`invalid ${key}`);
  return value;
};

const jsonObject = (record: JsonRecord, key: string): Prisma.InputJsonValue => {
  const value = record[key];
  if (!isRecord(value)) throw new Error(`invalid ${key}`);
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const optionalJson = (record: JsonRecord, key: string): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  const value = record[key];
  if (value === undefined || value === null) return Prisma.JsonNull;
  if (!isRecord(value)) throw new Error(`invalid ${key}`);
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const jsonValue = (record: JsonRecord, key: string): Prisma.InputJsonValue => {
  const value = record[key];
  if (!isRecord(value) && !Array.isArray(value)) throw new Error(`invalid ${key}`);
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const dateValue = (value: unknown, key: string, fallback?: Date): Date | null => {
  if (value === undefined || value === null || value === '') return fallback ?? null;
  const parsed = typeof value === 'number' ? new Date(value) : typeof value === 'string' ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) throw new Error(`invalid ${key}`);
  return parsed;
};

const stringField = (record: JsonRecord, key: string, fallback = ''): string => {
  const value = record[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error(`invalid ${key}`);
  return value;
};

const numberField = (record: JsonRecord, key: string, fallback = 0): number => {
  const value = record[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`invalid ${key}`);
  return value;
};

const optionalNumber = (record: JsonRecord, key: string): number | null => {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`invalid ${key}`);
  return value;
};

const integerField = (record: JsonRecord, key: string, fallback: number): number => {
  const value = record[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`invalid ${key}`);
  return value;
};

const nestedRecord = (record: JsonRecord, key: string): JsonRecord => {
  if (!isRecord(record[key])) throw new Error(`invalid ${key}`);
  return record[key];
};

const profileFromLegacy = (raw: unknown, userId: string, email: string, fullName: string): StudentProfile => {
  if (!isRecord(raw) || raw.id !== userId) throw new Error('invalid profile owner');
  const personal = nestedRecord(raw, 'personalInfo');
  const address = nestedRecord(personal, 'address');
  const academic = nestedRecord(raw, 'academicInfo');
  const class10 = nestedRecord(academic, 'class10');
  const class12 = nestedRecord(academic, 'class12');
  const categories = stringArray(raw, 'preferredExamCategories');
  const validCategories: ExamCategory[] = ['Engineering', 'Medical', 'Management', 'Civil Services', 'Undergraduate', 'Government & Banking'];
  if (categories.some((category) => !validCategories.includes(category as ExamCategory))) throw new Error('invalid preferred exam categories');
  const gender = stringField(personal, 'gender');
  const category = stringField(personal, 'category');
  const class12Status = stringField(class12, 'status');
  const class12Stream = stringField(class12, 'stream');
  const class10MaxMarks = optionalNumber(class10, 'maxMarks');
  const class10ObtainedMarks = optionalNumber(class10, 'obtainedMarks');
  const cgpaOrPercentage = optionalNumber(academic, 'cgpaOrPercentage');
  const yearOfGraduation = optionalNumber(academic, 'yearOfGraduation');
  const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say', ''];
  const validCategoriesForProfile = ['General', 'OBC-NCL', 'SC', 'ST', 'EWS', ''];
  const validStatuses = ['Passed', 'Appearing', ''];
  const validStreams = ['PCM', 'PCB', 'PCMB', 'Commerce', 'Arts', 'Other', ''];
  if (!validGenders.includes(gender) || !validCategoriesForProfile.includes(category) ||
      !validStatuses.includes(class12Status) || !validStreams.includes(class12Stream)) {
    throw new Error('invalid profile enum');
  }
  return {
    id: userId,
    preferredExamCategories: categories as ExamCategory[],
    personalInfo: {
      fullName: stringField(personal, 'fullName', fullName),
      dob: stringField(personal, 'dob'),
      gender: gender as StudentProfile['personalInfo']['gender'],
      nationality: stringField(personal, 'nationality'),
      category: category as StudentProfile['personalInfo']['category'],
      email,
      phoneNumber: stringField(personal, 'phoneNumber'),
      ...(personal.altPhoneNumber === undefined || personal.altPhoneNumber === null ? {} : { altPhoneNumber: stringField(personal, 'altPhoneNumber') }),
      address: {
        street: stringField(address, 'street'),
        city: stringField(address, 'city'),
        state: stringField(address, 'state'),
        pincode: stringField(address, 'pincode'),
        country: stringField(address, 'country'),
      },
      ...(personal.fathersName === undefined || personal.fathersName === null ? {} : { fathersName: stringField(personal, 'fathersName') }),
      ...(personal.mothersName === undefined || personal.mothersName === null ? {} : { mothersName: stringField(personal, 'mothersName') }),
    },
    academicInfo: {
      class10: {
        board: stringField(class10, 'board'),
        schoolName: stringField(class10, 'schoolName'),
        passingYear: numberField(class10, 'passingYear'),
        percentage: numberField(class10, 'percentage'),
        rollNumber: stringField(class10, 'rollNumber'),
        ...(class10MaxMarks === null ? {} : { maxMarks: class10MaxMarks }),
        ...(class10ObtainedMarks === null ? {} : { obtainedMarks: class10ObtainedMarks }),
      },
      class12: {
        status: class12Status as StudentProfile['academicInfo']['class12']['status'],
        board: stringField(class12, 'board'),
        schoolName: stringField(class12, 'schoolName'),
        passingYear: numberField(class12, 'passingYear'),
        percentage: numberField(class12, 'percentage'),
        rollNumber: stringField(class12, 'rollNumber'),
        stream: class12Stream as StudentProfile['academicInfo']['class12']['stream'],
        subjects: stringArray(class12, 'subjects'),
      },
      currentQualification: stringField(academic, 'currentQualification'),
      institution: stringField(academic, 'institution'),
      ...(cgpaOrPercentage === null ? {} : { cgpaOrPercentage }),
      ...(yearOfGraduation === null ? {} : { yearOfGraduation }),
    },
  };
};

const emptyProfile = (userId: string, fullName: string, email: string): StudentProfile =>
  profileFromLegacy({
    id: userId,
    personalInfo: { fullName, email, address: {} },
    academicInfo: { class10: {}, class12: {} },
  }, userId, email, fullName);

const parseRoot = (value: unknown): JsonRecord => {
  if (!isRecord(value) || !Array.isArray(value.users) || !Array.isArray(value.exams) ||
      !isRecord(value.profiles) || !isRecord(value.documents) || !isRecord(value.applications) ||
      (value.sessions !== undefined && !isRecord(value.sessions))) {
    throw new Error('The JSON database does not match the supported legacy structure.');
  }
  return value;
};

const emptySummary = (): ImportSummary => ({
  users: { imported: 0, skipped: 0, failed: 0 },
  profiles: { imported: 0, skipped: 0, failed: 0 },
  documents: { imported: 0, skipped: 0, failed: 0 },
  applications: { imported: 0, skipped: 0, failed: 0 },
  exams: { imported: 0, skipped: 0, failed: 0 },
  sessions: { imported: 0, skipped: 0, failed: 0 },
  failures: [],
});

const failureCode = (error: unknown): string => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode ?? 'DATABASE_CONNECTION';
  if (error instanceof Error && error.message.startsWith('DATABASE_URL must be configured')) return 'DATABASE_URL_NOT_CONFIGURED';
  if (error instanceof Error && error.message.includes('supported legacy structure')) return 'INVALID_SOURCE';
  if (error instanceof Error && error.message.startsWith('existing ')) return 'IMPORT_CONFLICT';
  return error instanceof Error && error.message.startsWith('invalid ') ? 'INVALID_RECORD' : 'UNKNOWN_ERROR';
};

export async function importJsonDatabase(value: unknown, client?: PrismaClient): Promise<ImportSummary> {
  const legacy = parseRoot(value);
  const database = client ?? getPrismaClient();
  const summary = emptySummary();
  const profiles = legacy.profiles as JsonRecord;
  const documentsByUser = legacy.documents as JsonRecord;
  const applicationsByUser = legacy.applications as JsonRecord;
  const sessions = (legacy.sessions ?? {}) as JsonRecord;
  const users = legacy.users as unknown[];
  const exams = legacy.exams as unknown[];
  const importedUsers = new Set<string>();
  const demoIds = new Set<string>();
  const handledProfiles = new Set<string>();

  const reportFailure = (bucket: keyof Omit<ImportSummary, 'failures'>, label: string, error: unknown) => {
    summary[bucket].failed += 1;
    summary.failures.push(`${label}: ${failureCode(error)}`);
  };

  for (const [index, rawUser] of users.entries()) {
    try {
      if (!isRecord(rawUser)) throw new Error('invalid user');
      const id = requiredString(rawUser, 'id');
      if (demoUserIds.has(id)) {
        demoIds.add(id);
        summary.users.skipped += 1;
        continue;
      }
      const email = requiredString(rawUser, 'email').trim().toLowerCase();
      const fullName = requiredString(rawUser, 'fullName');
      const passwordHash = requiredString(rawUser, 'passwordHash');
      if (typeof rawUser.isVerified !== 'boolean') throw new Error('invalid isVerified');
      const otpAttemptsRemaining = optionalNumber(rawUser, 'otpAttemptsRemaining');
      if (otpAttemptsRemaining !== null && (!Number.isInteger(otpAttemptsRemaining) || otpAttemptsRemaining < 0)) {
        throw new Error('invalid otpAttemptsRemaining');
      }
      const createdAt = dateValue(rawUser.createdAt, 'createdAt');
      if (!createdAt) throw new Error('invalid createdAt');
      const existing = await database.user.findUnique({ where: { id } });
      if (existing) {
        if (existing.email !== email) throw new Error('existing account conflicts with import source');
        summary.users.skipped += 1;
        importedUsers.add(id);
        const existingProfile = await database.userProfile.findUnique({ where: { userId: id } });
        if (existingProfile) {
          summary.profiles.skipped += 1;
          handledProfiles.add(id);
        }
        continue;
      }

      const profileRecord = profiles[id];
      const profileData = profileRecord === undefined
        ? emptyProfile(id, fullName, email)
        : profileFromLegacy(profileRecord, id, email, fullName);

      const resetToken = optionalString(rawUser, 'passwordResetToken');
      await database.user.create({
        data: {
          id,
          email,
          fullName,
          avatarUrl: optionalString(rawUser, 'avatarUrl'),
          isVerified: rawUser.isVerified,
          role: optionalString(rawUser, 'role'),
          institution: optionalString(rawUser, 'institution'),
          passwordHash,
          otpHash: optionalString(rawUser, 'otpHash'),
          otpExpiresAt: dateValue(rawUser.otpExpiresAt, 'otpExpiresAt'),
          otpAttemptsRemaining,
          lastOtpSentAt: dateValue(rawUser.lastOtpSentAt, 'lastOtpSentAt'),
          passwordResetTokenHash: resetToken ? crypto.createHash('sha256').update(resetToken).digest('hex') : null,
          passwordResetExpiresAt: dateValue(rawUser.passwordResetExpiresAt, 'passwordResetExpiresAt'),
          createdAt,
          profile: { create: { userId: id, ...profileUpdateData(profileData) } },
        },
      });
      summary.users.imported += 1;
      summary.profiles.imported += 1;
      importedUsers.add(id);
      handledProfiles.add(id);
    } catch (error) {
      reportFailure('users', `user record ${index + 1}`, error);
    }
  }

  for (const [userId, rawProfile] of Object.entries(profiles)) {
    if (demoIds.has(userId)) continue;
    if (handledProfiles.has(userId)) continue;
    try {
      if (!importedUsers.has(userId)) throw new Error('profile owner was not imported');
      const existing = await database.userProfile.findUnique({ where: { userId } });
      if (existing) {
        summary.profiles.skipped += 1;
        handledProfiles.add(userId);
        continue;
      }
      const user = await database.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('profile owner was not imported');
      const profile = profileFromLegacy(rawProfile, userId, user.email, user.fullName);
      await database.userProfile.create({
        data: {
          userId,
          ...profileUpdateData(profile),
        },
      });
      summary.profiles.imported += 1;
      handledProfiles.add(userId);
    } catch (error) {
      reportFailure('profiles', `profile record ${userId ? 'for an account' : ''}`, error);
    }
  }

  for (const [index, rawExam] of exams.entries()) {
    try {
      if (!isRecord(rawExam)) throw new Error('invalid exam');
      const id = requiredString(rawExam, 'id');
      if (await database.exam.findUnique({ where: { id } })) {
        summary.exams.skipped += 1;
        continue;
      }
      const applicationFields = rawExam.applicationFields === undefined
        ? Prisma.JsonNull
        : jsonValue(rawExam, 'applicationFields');
      await database.exam.create({
        data: {
          id,
          slug: typeof rawExam.slug === 'string'
            ? rawExam.slug
            : id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: requiredString(rawExam, 'name'),
          fullName: requiredString(rawExam, 'fullName'),
          authority: requiredString(rawExam, 'authority'),
          category: requiredString(rawExam, 'category'),
          description: typeof rawExam.description === 'string' ? rawExam.description : '',
          eligibilitySummary: typeof rawExam.eligibilitySummary === 'string' ? rawExam.eligibilitySummary : '',
          criteria: jsonObject(rawExam, 'criteria'),
          applicationOpenDate: requiredString(rawExam, 'applicationOpenDate'),
          applicationDeadline: requiredString(rawExam, 'applicationDeadline'),
          admitCardDate: typeof rawExam.admitCardDate === 'string' ? rawExam.admitCardDate : '',
          examDate: typeof rawExam.examDate === 'string' ? rawExam.examDate : '',
          feeINR: jsonObject(rawExam, 'feeINR'),
          officialWebsite: requiredString(rawExam, 'officialWebsite'),
          popularCourses: stringArray(rawExam, 'popularCourses'),
          documentsRequired: stringArray(rawExam, 'documentsRequired'),
          status: typeof rawExam.status === 'string' ? rawExam.status : 'Unknown',
          sourceUrl: optionalString(rawExam, 'sourceUrl'),
          verifiedAt: dateValue(rawExam.verifiedAt, 'verifiedAt'),
          applicationFields,
        },
      });
      summary.exams.imported += 1;
    } catch (error) {
      reportFailure('exams', `exam record ${index + 1}`, error);
    }
  }

  for (const [userId, rawDocuments] of Object.entries(documentsByUser)) {
    if (demoIds.has(userId)) continue;
    if (!Array.isArray(rawDocuments)) {
      reportFailure('documents', 'documents collection', new Error('invalid document collection'));
      continue;
    }
    for (const [index, rawDocument] of rawDocuments.entries()) {
      try {
        if (!importedUsers.has(userId)) throw new Error('document owner was not imported');
        if (!isRecord(rawDocument)) throw new Error('invalid document');
        const id = requiredString(rawDocument, 'id');
        const type = requiredString(rawDocument, 'type');
        const confidenceScore = optionalNumber(rawDocument, 'confidenceScore');
        if (confidenceScore !== null && (!Number.isInteger(confidenceScore) || confidenceScore < 0 || confidenceScore > 100)) {
          throw new Error('invalid confidenceScore');
        }
        const [existingById, existingByType] = await Promise.all([
          database.document.findUnique({ where: { id } }),
          database.document.findUnique({ where: { userId_type: { userId, type } } }),
        ]);
        if (existingById || existingByType) {
          if (!existingById || !existingByType || existingById.userId !== userId ||
              existingById.type !== type || existingByType.id !== id) {
            throw new Error('existing document conflicts with import source');
          }
          summary.documents.skipped += 1;
          continue;
        }
        await database.document.create({
          data: {
            id,
            userId,
            type,
            title: requiredString(rawDocument, 'title'),
            description: typeof rawDocument.description === 'string' ? rawDocument.description : '',
            requiredFor: stringArray(rawDocument, 'requiredFor'),
            status: requiredString(rawDocument, 'status'),
            fileUrl: optionalString(rawDocument, 'fileUrl'),
            fileName: optionalString(rawDocument, 'fileName'),
            mimeType: optionalString(rawDocument, 'mimeType'),
            fileSize: optionalString(rawDocument, 'fileSize'),
            uploadedAt: dateValue(rawDocument.uploadedAt, 'uploadedAt'),
            extractedData: optionalJson(rawDocument, 'extractedData'),
            detailedExtraction: optionalJson(rawDocument, 'detailedExtraction'),
            confidenceScore,
          },
        });
        summary.documents.imported += 1;
      } catch (error) {
        reportFailure('documents', `document record ${index + 1}`, error);
      }
    }
  }

  for (const [userId, rawApplications] of Object.entries(applicationsByUser)) {
    if (demoIds.has(userId)) continue;
    if (!Array.isArray(rawApplications)) {
      reportFailure('applications', 'applications collection', new Error('invalid application collection'));
      continue;
    }
    for (const [index, rawApplication] of rawApplications.entries()) {
      try {
        if (!importedUsers.has(userId)) throw new Error('application owner was not imported');
        if (!isRecord(rawApplication)) throw new Error('invalid application');
        const id = requiredString(rawApplication, 'id');
        const examId = requiredString(rawApplication, 'examId');
        const progressPercent = integerField(rawApplication, 'progressPercent', 0);
        const mappedFieldsCount = integerField(rawApplication, 'mappedFieldsCount', 0);
        const totalFieldsCount = integerField(rawApplication, 'totalFieldsCount', 0);
        if (progressPercent < 0 || progressPercent > 100 || mappedFieldsCount < 0 || totalFieldsCount < 0) {
          throw new Error('invalid application counts');
        }
        const [existingById, existingByUserExam] = await Promise.all([
          database.application.findUnique({ where: { id } }),
          database.application.findUnique({ where: { userId_examId: { userId, examId } } }),
        ]);
        if (existingById || existingByUserExam) {
          if (!existingById || !existingByUserExam || existingById.userId !== userId ||
              existingById.examId !== examId || existingByUserExam.id !== id) {
            throw new Error('existing application conflicts with import source');
          }
          summary.applications.skipped += 1;
          continue;
        }
        await database.application.create({
          data: {
            id,
            userId,
            examId,
            status: requiredString(rawApplication, 'status'),
            progressPercent,
            lastUpdated: dateValue(rawApplication.lastUpdated, 'lastUpdated', new Date())!,
            applicationNumber: optionalString(rawApplication, 'applicationNumber'),
            missingFields: stringArray(rawApplication, 'missingFields'),
            mappedFieldsCount,
            totalFieldsCount,
            submittedAt: dateValue(rawApplication.submittedAt, 'submittedAt'),
          },
        });
        summary.applications.imported += 1;
      } catch (error) {
        reportFailure('applications', `application record ${index + 1}`, error);
      }
    }
  }

  for (const [tokenHash, rawSession] of Object.entries(sessions)) {
    try {
      if (!isRecord(rawSession)) throw new Error('invalid session');
      if (!/^[a-f0-9]{64}$/i.test(tokenHash)) throw new Error('invalid session token hash');
      const userId = requiredString(rawSession, 'userId');
      if (demoIds.has(userId)) continue;
      if (!importedUsers.has(userId)) throw new Error('session owner was not imported');
      const expiresAt = dateValue(rawSession.expiresAt, 'expiresAt');
      if (!expiresAt || expiresAt <= new Date()) {
        summary.sessions.skipped += 1;
        continue;
      }
      const existing = await database.session.findUnique({ where: { tokenHash } });
      if (existing) {
        if (existing.userId !== userId) throw new Error('existing session conflicts with import source');
        summary.sessions.skipped += 1;
        continue;
      }
      await database.session.create({ data: { tokenHash, userId, expiresAt } });
      summary.sessions.imported += 1;
    } catch (error) {
      reportFailure('sessions', 'session record', error);
    }
  }

  return summary;
}

async function main(): Promise<void> {
  const filePath = path.resolve(process.argv[2] ?? process.env.JSON_IMPORT_FILE ?? 'data/registra_db.json');
  const client = getPrismaClient();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const summary = await importJsonDatabase(JSON.parse(raw), client);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failures.length) process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error: unknown) => {
    console.error('JSON import failed:', failureCode(error));
    process.exitCode = 1;
  });
}
