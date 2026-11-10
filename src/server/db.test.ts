import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Prisma, PrismaClient } from '@prisma/client';
import { DatabaseManager } from './db.ts';
import { importJsonDatabase } from '../../scripts/import-json-to-postgres.ts';
import { ApplicationRecord, DocumentRecord, ExamItem, StudentProfile, UserAccount } from '../types/index.ts';

const createUser = async (id: string, email: string): Promise<UserAccount> => ({
  id,
  email,
  fullName: 'Synthetic Test Candidate',
  isVerified: true,
  createdAt: new Date().toISOString(),
  passwordHash: await bcrypt.hash('Synthetic-Test-Password1', 4),
});

const createExam = (id = 'test-exam-isolation'): ExamItem => ({
  id,
  name: 'Synthetic Exam',
  fullName: 'Synthetic Examination for Integration Tests',
  authority: 'Synthetic Test Authority',
  category: 'Engineering',
  description: '',
  eligibilitySummary: '',
  criteria: {},
  applicationOpenDate: '2099-01-01',
  applicationDeadline: '2099-02-01',
  admitCardDate: '',
  examDate: '',
  feeINR: { general: 0, reserved: 0 },
  officialWebsite: 'https://example.test',
  popularCourses: [],
  documentsRequired: [],
  status: 'Upcoming',
  sourceUrl: 'https://example.test/notice',
  verifiedAt: new Date().toISOString(),
});

const createProfile = (user: UserAccount): StudentProfile => ({
  id: user.id,
  preferredExamCategories: [],
  personalInfo: {
    fullName: user.fullName,
    dob: '',
    gender: '',
    nationality: '',
    category: '',
    email: user.email,
    phoneNumber: '',
    address: { street: '', city: '', state: '', pincode: '', country: '' },
  },
  academicInfo: {
    class10: { board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '' },
    class12: { status: '', board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '', stream: '', subjects: [] },
    currentQualification: '',
    institution: '',
  },
});

const documentFor = (id: string, userId: string): DocumentRecord => ({
  id,
  type: 'class10_marksheet',
  title: 'Synthetic test document',
  description: '',
  requiredFor: [],
  status: 'Uploaded',
  fileUrl: `/api/user/documents/${userId}/file/synthetic.pdf`,
  fileName: 'synthetic.pdf',
  mimeType: 'application/pdf',
  uploadedAt: new Date().toISOString(),
});

const testDatabaseUrl = process.env.REGISTRA_TEST_DATABASE_URL;

test('JSON import rejects an unsupported source shape before connecting to a database', async () => {
  await assert.rejects(importJsonDatabase({ users: [] }), /supported legacy structure/);
});

test('profile update rolls back when updating the related user name fails', async () => {
  let profileName = 'Original Name';
  let userName = 'Original Name';
  let userUpdateAttempted = false;
  const profileRow = new Proxy({
    userId: 'rollback-test-user',
    personalFullName: profileName,
    user: { email: 'rollback-test@example.test' },
  }, {
    get(target, property) {
      if (property in target) return Reflect.get(target, property);
      if (property === 'class12Subjects' || property === 'preferredExamCategories') return [];
      if (property === 'class10PassingYear' || property === 'class10Percentage' ||
          property === 'class12PassingYear' || property === 'class12Percentage') return 0;
      return '';
    },
  }) as unknown as Prisma.UserProfileGetPayload<{ include: { user: { select: { email: true } } } }>;

  const client = {
    $transaction: async <T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
      const before = { profileName, userName };
      const transaction = {
        userProfile: {
          findUnique: async () => ({ ...profileRow, personalFullName: profileName }),
          update: async ({ data }: { data: { personalFullName: string } }) => {
            profileName = data.personalFullName;
          },
        },
        user: {
          update: async () => {
            userUpdateAttempted = true;
            throw new Error('Forced user name update failure.');
          },
        },
      } as unknown as Prisma.TransactionClient;

      try {
        return await operation(transaction);
      } catch (error) {
        profileName = before.profileName;
        userName = before.userName;
        throw error;
      }
    },
  } as unknown as PrismaClient;

  const database = new DatabaseManager(client);
  await assert.rejects(
    database.updateProfile('rollback-test-user', {
      personalInfo: { ...createProfile({
        id: 'rollback-test-user',
        email: 'rollback-test@example.test',
        fullName: 'Original Name',
        isVerified: true,
        createdAt: new Date().toISOString(),
      }).personalInfo, fullName: 'Updated Name' },
    }),
    /Forced user name update failure/,
  );
  assert.equal(userUpdateAttempted, true);
  assert.equal(profileName, 'Original Name');
  assert.equal(userName, 'Original Name');
});

if (!testDatabaseUrl) {
  test('Prisma integration tests (set REGISTRA_TEST_DATABASE_URL to an isolated test database)', { skip: true }, () => {});
} else {
  test('Prisma persistence preserves account isolation, relations, and uniqueness', async () => {
    const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: testDatabaseUrl }) });
    const database = new DatabaseManager(client);
    try {
      await client.$connect();
      await client.user.deleteMany();
      await client.exam.deleteMany();

      const userA = await createUser('test-user-a', 'test-user-a@example.test');
      const userB = await createUser('test-user-b', 'test-user-b@example.test');
      await database.createUser(userA, createProfile(userA));
      await database.createUser(userB, createProfile(userB));
      await client.exam.create({ data: {
        id: createExam().id,
        slug: createExam().id,
        name: createExam().name,
        fullName: createExam().fullName,
        authority: createExam().authority,
        category: createExam().category,
        description: createExam().description,
        eligibilitySummary: createExam().eligibilitySummary,
        criteria: {},
        applicationOpenDate: createExam().applicationOpenDate,
        applicationDeadline: createExam().applicationDeadline,
        admitCardDate: '',
        examDate: '',
        feeINR: { general: 0, reserved: 0 },
        officialWebsite: createExam().officialWebsite,
        popularCourses: [],
        documentsRequired: [],
        status: 'Upcoming',
        sourceUrl: createExam().sourceUrl,
        verifiedAt: new Date(createExam().verifiedAt!),
      } });

      const savedProfile = await database.updateProfile(userA.id, {
        personalInfo: { ...createProfile(userA).personalInfo, fullName: 'Updated Test Candidate', phoneNumber: '0000000000' },
      });
      assert.equal(savedProfile.personalInfo.phoneNumber, '0000000000');
      assert.equal(savedProfile.personalInfo.fullName, 'Updated Test Candidate');
      assert.equal((await database.getUserById(userA.id))?.fullName, 'Updated Test Candidate');
      assert.equal((await database.getProfile(userB.id))?.personalInfo.phoneNumber, '');

      await database.saveDocument(userA.id, documentFor('test-document-a', userA.id));
      assert.equal((await database.getDocuments(userA.id)).length, 1);
      assert.equal((await database.getDocuments(userB.id)).length, 0);
      assert.deepEqual(await database.deleteDocument(userB.id, 'test-document-a'), []);
      assert.equal((await database.getDocuments(userA.id)).length, 1);

      assert.equal((await database.getExams()).length, 1);
      const application: Partial<ApplicationRecord> & { examId: string } = {
        examId: createExam().id,
        status: 'In Progress',
      };
      const firstApplication = await database.saveApplication(userA.id, application);
      const duplicateApplication = await database.saveApplication(userA.id, application);
      assert.equal(firstApplication.id, duplicateApplication.id);
      assert.equal((await database.getApplications(userA.id)).length, 1);
      assert.equal((await database.getApplications(userB.id)).length, 0);
      await assert.rejects(
        database.saveApplication(userB.id, { examId: 'missing-test-exam' }),
        /verified exam record/,
      );

      await assert.rejects(
        database.createUser(await createUser('test-user-duplicate', userA.email)),
        (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002'),
      );

      const passwordHash = (await database.getUserByEmail(userA.email))?.passwordHash;
      assert.ok(passwordHash);
      assert.equal(await bcrypt.compare('Synthetic-Test-Password1', passwordHash), true);

      const tokenHash = 'synthetic-session-token-hash';
      await database.saveSession(tokenHash, userA.id, Date.now() - 1);
      assert.ok((await database.getSession(tokenHash))!.expiresAt < Date.now());
      await database.deleteSession(tokenHash);
      assert.equal(await database.getSession(tokenHash), undefined);

      const activeTokenHash = 'synthetic-active-session-token-hash';
      await database.saveSession(activeTokenHash, userA.id, Date.now() + 60_000);
      await database.updatePasswordAndRevokeSessions(
        userA.id,
        await bcrypt.hash('Synthetic-Test-Password2', 4),
      );
      assert.equal(await database.getSession(activeTokenHash), undefined);
      const updatedPasswordHash = (await database.getUserByEmail(userA.email))?.passwordHash;
      assert.ok(updatedPasswordHash);
      assert.equal(await bcrypt.compare('Synthetic-Test-Password2', updatedPasswordHash), true);

      await assert.rejects(
        client.application.create({
          data: {
            userId: userA.id,
            examId: 'missing-test-exam',
            status: 'In Progress',
          },
        }),
        (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2003'),
      );

      const importedUser = await createUser('test-import-user', 'test-import-user@example.test');
      const importedExam = createExam('test-import-exam');
      const importedDocument = documentFor('test-import-document', importedUser.id);
      const importedSessionHash = crypto.createHash('sha256').update('synthetic-import-session').digest('hex');
      const legacyDatabase = {
        users: [importedUser],
        profiles: { [importedUser.id]: createProfile(importedUser) },
        documents: { [importedUser.id]: [importedDocument] },
        applications: {
          [importedUser.id]: [{
            id: 'test-import-application',
            examId: importedExam.id,
            status: 'In Progress',
            progressPercent: 0,
            lastUpdated: new Date().toISOString(),
            missingFields: [],
            mappedFieldsCount: 0,
            totalFieldsCount: 0,
          }],
        },
        exams: [importedExam],
        sessions: { [importedSessionHash]: { userId: importedUser.id, expiresAt: Date.now() + 60_000 } },
      };
      const firstImport = await importJsonDatabase(legacyDatabase, client);
      assert.equal(firstImport.failures.length, 0);
      assert.deepEqual(
        [firstImport.users.imported, firstImport.profiles.imported, firstImport.documents.imported,
          firstImport.applications.imported, firstImport.exams.imported, firstImport.sessions.imported],
        [1, 1, 1, 1, 1, 1],
      );
      const repeatedImport = await importJsonDatabase(legacyDatabase, client);
      assert.equal(repeatedImport.failures.length, 0);
      assert.deepEqual(
        [repeatedImport.users.imported, repeatedImport.profiles.imported, repeatedImport.documents.imported,
          repeatedImport.applications.imported, repeatedImport.exams.imported, repeatedImport.sessions.imported],
        [0, 0, 0, 0, 0, 0],
      );
      assert.deepEqual(
        [repeatedImport.users.skipped, repeatedImport.profiles.skipped, repeatedImport.documents.skipped,
          repeatedImport.applications.skipped, repeatedImport.exams.skipped, repeatedImport.sessions.skipped],
        [1, 1, 1, 1, 1, 1],
      );
    } finally {
      await client.user.deleteMany({ where: { id: { in: ['test-user-a', 'test-user-b', 'test-import-user'] } } }).catch(() => undefined);
      await client.exam.deleteMany({ where: { id: { in: [createExam().id, 'test-import-exam'] } } }).catch(() => undefined);
      await client.$disconnect();
    }
  });
}

test('database connection failures are surfaced to the caller', async () => {
  const client = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: 'invalid-database-url' }),
  });
  try {
    await assert.rejects(new DatabaseManager(client).checkConnection());
  } finally {
    await client.$disconnect();
  }
});
