import { Prisma, PrismaClient, type Document as PrismaDocument, type Exam as PrismaExam, type User as PrismaUser } from '@prisma/client';
import { getPrismaClient } from './prisma.ts';
import {
  ApplicationRecord,
  ApplicationStatus,
  DocumentRecord,
  DocumentType,
  ExamDirectoryEntry,
  ExamCategory,
  ExamItem,
  ExtractedFieldData,
  StudentProfile,
  UserAccount,
} from '../types/index.ts';
import { getRegistrationStatus } from '../utils/eligibilityEngine.ts';
import { getExamRegistrationStatus, type ExamDirectoryFilters, type ExamDirectoryQueryResult } from './examDirectory.ts';

type ApplicationWithExam = Prisma.ApplicationGetPayload<{ include: { exam: true } }>;
type ProfileWithUser = Prisma.UserProfileGetPayload<{ include: { user: { select: { email: true } } } }>;
type ExamRow = PrismaExam & {
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  directoryExamDate?: Date | null;
  directoryAdmitCardDate?: Date | null;
  resultDate?: Date | null;
  shortName?: string | null;
  level?: string | null;
  state?: string | null;
  conductingBody?: string | null;
  registrationUrl?: string | null;
  notificationUrl?: string | null;
  syllabusUrl?: string | null;
  applicationFee?: Prisma.JsonValue | null;
  eligibility?: string | null;
  ageLimit?: string | null;
  mode?: string | null;
  frequency?: string | null;
  lastVerifiedAt?: Date | null;
  slug?: string | null;
};

const dateFromIso = (value: string | undefined, fallback = new Date()): Date => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const dateFromMilliseconds = (value: number | null | undefined): Date | null =>
  value === null || value === undefined ? null : new Date(value);

const jsonValue = (value: object): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const jsonValueOrNull = (value: object | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value ? jsonValue(value) : Prisma.JsonNull;

const decodeJson = <T>(value: Prisma.JsonValue): T =>
  JSON.parse(JSON.stringify(value)) as T;

const userFromRow = (row: PrismaUser): UserAccount => ({
  id: row.id,
  email: row.email,
  fullName: row.fullName,
  ...(row.avatarUrl === null ? {} : { avatarUrl: row.avatarUrl }),
  isVerified: row.isVerified,
  ...(row.role === null ? {} : { role: row.role }),
  ...(row.institution === null ? {} : { institution: row.institution }),
  createdAt: row.createdAt.toISOString(),
  passwordHash: row.passwordHash,
  otpHash: row.otpHash,
  otpExpiresAt: row.otpExpiresAt?.getTime() ?? null,
  otpAttemptsRemaining: row.otpAttemptsRemaining ?? undefined,
  lastOtpSentAt: row.lastOtpSentAt?.getTime() ?? null,
  passwordResetToken: row.passwordResetTokenHash,
  passwordResetExpiresAt: row.passwordResetExpiresAt?.getTime() ?? null,
});

const profileFromRow = (row: ProfileWithUser): StudentProfile => ({
  id: row.userId,
  personalInfo: {
    fullName: row.personalFullName,
    dob: row.personalDob,
    gender: row.personalGender as StudentProfile['personalInfo']['gender'],
    nationality: row.personalNationality,
    category: row.personalCategory as StudentProfile['personalInfo']['category'],
    email: row.user.email,
    phoneNumber: row.personalPhoneNumber,
    ...(row.personalAltPhoneNumber === null ? {} : { altPhoneNumber: row.personalAltPhoneNumber }),
    address: {
      street: row.addressStreet,
      city: row.addressCity,
      state: row.addressState,
      pincode: row.addressPincode,
      country: row.addressCountry,
    },
    ...(row.fathersName === null ? {} : { fathersName: row.fathersName }),
    ...(row.mothersName === null ? {} : { mothersName: row.mothersName }),
  },
  academicInfo: {
    class10: {
      board: row.class10Board,
      schoolName: row.class10SchoolName,
      passingYear: row.class10PassingYear,
      percentage: row.class10Percentage,
      rollNumber: row.class10RollNumber,
      ...(row.class10MaxMarks === null ? {} : { maxMarks: row.class10MaxMarks }),
      ...(row.class10ObtainedMarks === null ? {} : { obtainedMarks: row.class10ObtainedMarks }),
    },
    class12: {
      status: row.class12Status as StudentProfile['academicInfo']['class12']['status'],
      board: row.class12Board,
      schoolName: row.class12SchoolName,
      passingYear: row.class12PassingYear,
      percentage: row.class12Percentage,
      rollNumber: row.class12RollNumber,
      stream: row.class12Stream as StudentProfile['academicInfo']['class12']['stream'],
      subjects: row.class12Subjects,
    },
    currentQualification: row.currentQualification,
    institution: row.academicInstitution,
    ...(row.cgpaOrPercentage === null ? {} : { cgpaOrPercentage: row.cgpaOrPercentage }),
    ...(row.yearOfGraduation === null ? {} : { yearOfGraduation: row.yearOfGraduation }),
  },
  preferredExamCategories: row.preferredExamCategories as ExamCategory[],
});

const documentFromRow = (row: PrismaDocument): DocumentRecord => ({
  id: row.id,
  type: row.type as DocumentType,
  title: row.title,
  description: row.description,
  requiredFor: row.requiredFor,
  status: row.status as DocumentRecord['status'],
  ...(row.fileUrl === null ? {} : { fileUrl: row.fileUrl }),
  ...(row.fileName === null ? {} : { fileName: row.fileName }),
  ...(row.mimeType === null ? {} : { mimeType: row.mimeType }),
  ...(row.fileSize === null ? {} : { fileSize: row.fileSize }),
  ...(row.uploadedAt === null ? {} : { uploadedAt: row.uploadedAt.toISOString() }),
  ...(row.extractedData === null ? {} : { extractedData: decodeJson<Record<string, string | number>>(row.extractedData) }),
  ...(row.detailedExtraction === null ? {} : { detailedExtraction: decodeJson<Record<string, ExtractedFieldData>>(row.detailedExtraction) }),
  ...(row.confidenceScore === null ? {} : { confidenceScore: row.confidenceScore }),
});

const examFromRow = (row: PrismaExam): ExamItem => {
  const today = new Date().toISOString().slice(0, 10);
  const directoryStatus = getExamRegistrationStatus(
    row.registrationStartDate?.toISOString().slice(0, 10) ?? null,
    row.registrationEndDate?.toISOString().slice(0, 10) ?? null,
    today,
  );
  return {
    id: row.id,
    name: row.name,
    fullName: row.fullName,
    authority: row.authority,
    category: row.category as ExamCategory,
    description: row.description,
    eligibilitySummary: row.eligibilitySummary,
    criteria: row.criteria as ExamItem['criteria'],
    applicationOpenDate: row.applicationOpenDate,
    applicationDeadline: row.applicationDeadline,
    admitCardDate: row.admitCardDate,
    examDate: row.examDate,
    feeINR: row.feeINR as ExamItem['feeINR'],
    officialWebsite: row.officialWebsite ?? '',
    popularCourses: row.popularCourses,
    documentsRequired: row.documentsRequired as DocumentType[],
    status: row.registrationStartDate || row.registrationEndDate
      ? directoryStatus === 'open'
        ? 'Registration Open'
        : directoryStatus === 'closed'
          ? 'Closed'
          : directoryStatus === 'upcoming'
            ? 'Upcoming'
            : 'Unknown'
      : getRegistrationStatus(row.applicationOpenDate, row.applicationDeadline, today),
    ...(row.sourceUrl === null ? {} : { sourceUrl: row.sourceUrl }),
    ...(row.verifiedAt === null ? {} : { verifiedAt: row.verifiedAt.toISOString() }),
    ...(row.applicationFields === null ? {} : { applicationFields: decodeJson<NonNullable<ExamItem['applicationFields']>>(row.applicationFields) }),
    ...(row.slug ? { slug: row.slug } : {}),
  };
};

const examDirectoryFromRow = (row: PrismaExam): ExamDirectoryEntry => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  shortName: row.shortName,
  category: row.category,
  level: row.level as ExamDirectoryEntry['level'],
  state: row.state,
  conductingBody: row.conductingBody || row.authority,
  officialWebsite: row.officialWebsite,
  registrationUrl: row.registrationUrl,
  notificationUrl: row.notificationUrl,
  syllabusUrl: row.syllabusUrl,
  registrationStartDate: row.registrationStartDate?.toISOString().slice(0, 10) ?? null,
  registrationEndDate: row.registrationEndDate?.toISOString().slice(0, 10) ?? null,
  examDate: row.directoryExamDate?.toISOString().slice(0, 10) ?? null,
  admitCardDate: row.directoryAdmitCardDate?.toISOString().slice(0, 10) ?? null,
  resultDate: row.resultDate?.toISOString().slice(0, 10) ?? null,
  applicationFee: row.applicationFee === null
    ? null
    : decodeJson<ExamDirectoryEntry['applicationFee']>(row.applicationFee),
  eligibility: row.eligibility,
  ageLimit: row.ageLimit,
  mode: row.mode as ExamDirectoryEntry['mode'],
  status: getExamRegistrationStatus(
    row.registrationStartDate?.toISOString().slice(0, 10) ?? null,
    row.registrationEndDate?.toISOString().slice(0, 10) ?? null,
  ),
  frequency: row.frequency,
  sourceUrl: row.sourceUrl,
  lastVerifiedAt: row.lastVerifiedAt?.toISOString().slice(0, 10) ?? null,
});

const applicationFromRow = (row: ApplicationWithExam): ApplicationRecord => ({
  id: row.id,
  examId: row.examId,
  examName: row.exam.name,
  authority: row.exam.authority,
  status: row.status as ApplicationStatus,
  progressPercent: row.progressPercent,
  lastUpdated: row.lastUpdated.toISOString(),
  deadline: row.exam.applicationDeadline,
  ...(row.applicationNumber === null ? {} : { applicationNumber: row.applicationNumber }),
  missingFields: row.missingFields,
  mappedFieldsCount: row.mappedFieldsCount,
  totalFieldsCount: row.totalFieldsCount,
  ...(row.submittedAt === null ? {} : { submittedAt: row.submittedAt.toISOString() }),
  officialPortalUrl: row.exam.registrationUrl ?? row.exam.officialWebsite ?? '',
});

const userUpdateData = (updates: Partial<UserAccount>): Prisma.UserUpdateInput => {
  const data: Prisma.UserUpdateInput = {};
  if (updates.fullName !== undefined) data.fullName = updates.fullName;
  if (updates.avatarUrl !== undefined) data.avatarUrl = updates.avatarUrl;
  if (updates.isVerified !== undefined) data.isVerified = updates.isVerified;
  if (updates.role !== undefined) data.role = updates.role;
  if (updates.institution !== undefined) data.institution = updates.institution;
  if (updates.passwordHash !== undefined) data.passwordHash = updates.passwordHash;
  if (updates.otpHash !== undefined) data.otpHash = updates.otpHash;
  if (updates.otpExpiresAt !== undefined) data.otpExpiresAt = dateFromMilliseconds(updates.otpExpiresAt);
  if (updates.otpAttemptsRemaining !== undefined) data.otpAttemptsRemaining = updates.otpAttemptsRemaining;
  if (updates.lastOtpSentAt !== undefined) data.lastOtpSentAt = dateFromMilliseconds(updates.lastOtpSentAt);
  if (updates.passwordResetToken !== undefined) data.passwordResetTokenHash = updates.passwordResetToken;
  if (updates.passwordResetExpiresAt !== undefined) data.passwordResetExpiresAt = dateFromMilliseconds(updates.passwordResetExpiresAt);
  return data;
};

const mergeProfile = (existing: StudentProfile, updates: Partial<StudentProfile>): StudentProfile => ({
  ...existing,
  ...updates,
  id: existing.id,
  preferredExamCategories: updates.preferredExamCategories ?? existing.preferredExamCategories,
  personalInfo: {
    ...existing.personalInfo,
    ...(updates.personalInfo ?? {}),
    email: existing.personalInfo.email,
    address: { ...existing.personalInfo.address, ...(updates.personalInfo?.address ?? {}) },
  },
  academicInfo: {
    ...existing.academicInfo,
    ...(updates.academicInfo ?? {}),
    class10: { ...existing.academicInfo.class10, ...(updates.academicInfo?.class10 ?? {}) },
    class12: { ...existing.academicInfo.class12, ...(updates.academicInfo?.class12 ?? {}) },
  },
});

export const profileUpdateData = (profile: StudentProfile) => ({
  personalFullName: profile.personalInfo.fullName,
  personalDob: profile.personalInfo.dob,
  personalGender: profile.personalInfo.gender,
  personalNationality: profile.personalInfo.nationality,
  personalCategory: profile.personalInfo.category,
  personalPhoneNumber: profile.personalInfo.phoneNumber,
  personalAltPhoneNumber: profile.personalInfo.altPhoneNumber ?? null,
  addressStreet: profile.personalInfo.address.street,
  addressCity: profile.personalInfo.address.city,
  addressState: profile.personalInfo.address.state,
  addressPincode: profile.personalInfo.address.pincode,
  addressCountry: profile.personalInfo.address.country,
  fathersName: profile.personalInfo.fathersName ?? null,
  mothersName: profile.personalInfo.mothersName ?? null,
  class10Board: profile.academicInfo.class10.board,
  class10SchoolName: profile.academicInfo.class10.schoolName,
  class10PassingYear: profile.academicInfo.class10.passingYear,
  class10Percentage: profile.academicInfo.class10.percentage,
  class10RollNumber: profile.academicInfo.class10.rollNumber,
  class10MaxMarks: profile.academicInfo.class10.maxMarks ?? null,
  class10ObtainedMarks: profile.academicInfo.class10.obtainedMarks ?? null,
  class12Status: profile.academicInfo.class12.status,
  class12Board: profile.academicInfo.class12.board,
  class12SchoolName: profile.academicInfo.class12.schoolName,
  class12PassingYear: profile.academicInfo.class12.passingYear,
  class12Percentage: profile.academicInfo.class12.percentage,
  class12RollNumber: profile.academicInfo.class12.rollNumber,
  class12Stream: profile.academicInfo.class12.stream,
  class12Subjects: profile.academicInfo.class12.subjects,
  currentQualification: profile.academicInfo.currentQualification,
  academicInstitution: profile.academicInfo.institution,
  cgpaOrPercentage: profile.academicInfo.cgpaOrPercentage ?? null,
  yearOfGraduation: profile.academicInfo.yearOfGraduation ?? null,
  preferredExamCategories: profile.preferredExamCategories ?? [],
});

const documentData = (document: DocumentRecord) => ({
  id: document.id,
  type: document.type,
  title: document.title,
  description: document.description,
  requiredFor: document.requiredFor,
  status: document.status,
  fileUrl: document.fileUrl ?? null,
  fileName: document.fileName ?? null,
  mimeType: document.mimeType ?? null,
  fileSize: document.fileSize ?? null,
  uploadedAt: document.uploadedAt ? dateFromIso(document.uploadedAt) : null,
  extractedData: jsonValueOrNull(document.extractedData),
  detailedExtraction: jsonValueOrNull(document.detailedExtraction),
  confidenceScore: document.confidenceScore ?? null,
});

const examData = (exam: ExamItem) => ({
  id: exam.id,
  slug: exam.slug ?? exam.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name: exam.name,
  fullName: exam.fullName,
  authority: exam.authority,
  category: exam.category,
  description: exam.description,
  eligibilitySummary: exam.eligibilitySummary,
  criteria: jsonValue(exam.criteria),
  applicationOpenDate: exam.applicationOpenDate,
  applicationDeadline: exam.applicationDeadline,
  admitCardDate: exam.admitCardDate,
  examDate: exam.examDate,
  feeINR: jsonValue(exam.feeINR),
  officialWebsite: exam.officialWebsite,
  conductingBody: exam.authority,
  popularCourses: exam.popularCourses,
  documentsRequired: exam.documentsRequired,
  status: exam.status,
  sourceUrl: exam.sourceUrl ?? null,
  verifiedAt: exam.verifiedAt ? dateFromIso(exam.verifiedAt) : null,
  applicationFields: exam.applicationFields ? jsonValue(exam.applicationFields) : Prisma.JsonNull,
});

export class DatabaseManager {
  constructor(private readonly injectedClient?: PrismaClient) {}

  private get client(): PrismaClient {
    return this.injectedClient ?? getPrismaClient();
  }

  async checkConnection(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async getUserById(userId: string): Promise<UserAccount | undefined> {
    const user = await this.client.user.findUnique({ where: { id: userId } });
    return user ? userFromRow(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<UserAccount | undefined> {
    const user = await this.client.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return user ? userFromRow(user) : undefined;
  }

  async getSession(tokenHash: string): Promise<{ userId: string; expiresAt: number } | undefined> {
    const session = await this.client.session.findUnique({ where: { tokenHash } });
    return session ? { userId: session.userId, expiresAt: session.expiresAt.getTime() } : undefined;
  }

  async saveSession(tokenHash: string, userId: string, expiresAt: number): Promise<void> {
    await this.client.session.upsert({
      where: { tokenHash },
      create: { tokenHash, userId, expiresAt: new Date(expiresAt) },
      update: { userId, expiresAt: new Date(expiresAt) },
    });
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.client.session.deleteMany({ where: { tokenHash } });
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    await this.client.session.deleteMany({ where: { userId } });
  }

  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const result = await transaction.user.updateMany({
        where: { id: userId },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
      });
      if (!result.count) throw new Error('User not found.');
      await transaction.session.deleteMany({ where: { userId } });
    });
  }

  async getUserByPasswordResetToken(tokenHash: string): Promise<UserAccount | undefined> {
    const user = await this.client.user.findFirst({
      where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
    });
    return user ? userFromRow(user) : undefined;
  }

  async updateUser(userId: string, updates: Partial<UserAccount>): Promise<UserAccount | undefined> {
    const result = await this.client.user.updateMany({ where: { id: userId }, data: userUpdateData(updates) });
    if (!result.count) return undefined;
    return this.getUserById(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.user.deleteMany({ where: { id: userId } });
  }

  async createUser(account: UserAccount, initialProfile?: StudentProfile): Promise<UserAccount> {
    if (!account.passwordHash) throw new Error('A password hash is required to create an account.');
    const profile = initialProfile ?? this.createEmptyProfile(account);
    if (profile.id !== account.id) throw new Error('The initial profile owner does not match the account.');
    const user = await this.client.user.create({
      data: {
        id: account.id,
        email: account.email.trim().toLowerCase(),
        fullName: account.fullName,
        avatarUrl: account.avatarUrl ?? null,
        isVerified: account.isVerified,
        role: account.role ?? null,
        institution: account.institution ?? null,
        passwordHash: account.passwordHash,
        otpHash: account.otpHash ?? null,
        otpExpiresAt: dateFromMilliseconds(account.otpExpiresAt),
        otpAttemptsRemaining: account.otpAttemptsRemaining ?? null,
        lastOtpSentAt: dateFromMilliseconds(account.lastOtpSentAt),
        passwordResetTokenHash: account.passwordResetToken ?? null,
        passwordResetExpiresAt: dateFromMilliseconds(account.passwordResetExpiresAt),
        createdAt: dateFromIso(account.createdAt),
        profile: { create: profileUpdateData(profile) },
      },
    });
    return userFromRow(user);
  }

  async getProfile(userId: string): Promise<StudentProfile | undefined> {
    const profile = await this.client.userProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    return profile ? profileFromRow(profile) : undefined;
  }

  async updateProfile(userId: string, updates: Partial<StudentProfile>): Promise<StudentProfile> {
    return this.client.$transaction(async (transaction) => {
      const current = await transaction.userProfile.findUnique({
        where: { userId },
        include: { user: { select: { email: true } } },
      });
      if (!current) throw new Error('Profile not found.');
      const merged = mergeProfile(profileFromRow(current), updates);
      await transaction.userProfile.update({ where: { userId }, data: profileUpdateData(merged) });
      if (updates.personalInfo?.fullName) {
        await transaction.user.update({ where: { id: userId }, data: { fullName: updates.personalInfo.fullName } });
      }
      return merged;
    });
  }

  async getDocuments(userId: string): Promise<DocumentRecord[]> {
    const documents = await this.client.document.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } });
    return documents.map(documentFromRow);
  }

  async saveDocument(userId: string, document: DocumentRecord): Promise<DocumentRecord[]> {
    await this.client.document.upsert({
      where: { userId_type: { userId, type: document.type } },
      create: { ...documentData(document), userId },
      update: documentData(document),
    });
    return this.getDocuments(userId);
  }

  async updateDocument(userId: string, docId: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord[]> {
    const result = await this.client.document.updateMany({
      where: { id: docId, userId },
      data: {
        ...(updates.title === undefined ? {} : { title: updates.title }),
        ...(updates.description === undefined ? {} : { description: updates.description }),
      },
    });
    if (!result.count) throw new Error('Document not found.');
    return this.getDocuments(userId);
  }

  async confirmDocumentExtraction(
    userId: string,
    docId: string,
    profileUpdates: Partial<StudentProfile>,
    extraction: Record<string, ExtractedFieldData>,
    extractedData: Record<string, string | number>,
  ): Promise<{ profile: StudentProfile; documents: DocumentRecord[] }> {
    const result = await this.client.$transaction(async (transaction) => {
      const [profileRow, document] = await Promise.all([
        transaction.userProfile.findUnique({
          where: { userId },
          include: { user: { select: { email: true } } },
        }),
        transaction.document.findFirst({ where: { id: docId, userId, fileUrl: { not: null } } }),
      ]);
      if (!profileRow || !document) throw new Error('Uploaded document or profile was not found.');

      const profile = mergeProfile(profileFromRow(profileRow), profileUpdates);
      const confidenceValues = Object.values(extraction)
        .filter((field) => field.value && !field.manuallyEdited)
        .map((field) => field.confidence);
      const confidenceScore = !Object.values(extraction).some((field) => field.manuallyEdited) && confidenceValues.length
        ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
        : null;

      await transaction.userProfile.update({ where: { userId }, data: profileUpdateData(profile) });
      await transaction.document.update({
        where: { id: document.id },
        data: {
          status: 'Pending Review',
          detailedExtraction: jsonValue(extraction),
          extractedData: jsonValue(extractedData),
          confidenceScore,
        },
      });
      const documents = await transaction.document.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } });
      return { profile, documents: documents.map(documentFromRow) };
    });
    if (profileUpdates.personalInfo?.fullName) {
      await this.client.user.update({ where: { id: userId }, data: { fullName: profileUpdates.personalInfo.fullName } });
    }
    return result;
  }

  async deleteDocument(userId: string, docId: string): Promise<DocumentRecord[]> {
    await this.client.document.deleteMany({ where: { id: docId, userId } });
    return this.getDocuments(userId);
  }

  async getApplications(userId: string): Promise<ApplicationRecord[]> {
    const applications = await this.client.application.findMany({
      where: { userId },
      include: { exam: true },
      orderBy: { lastUpdated: 'desc' },
    });
    return applications.map(applicationFromRow);
  }

  async saveApplication(
    userId: string,
    application: Partial<ApplicationRecord> & { examId: string },
  ): Promise<ApplicationRecord> {
    return this.client.$transaction(async (transaction) => {
      const examRow = await transaction.exam.findFirst({
        where: { id: application.examId, verifiedAt: { not: null }, AND: [{ sourceUrl: { not: null } }, { NOT: { sourceUrl: '' } }] },
      });
      if (!examRow) throw new Error('Cannot save an application without an available verified exam record.');

      const existing = await transaction.application.findUnique({
        where: { userId_examId: { userId, examId: examRow.id } },
      });
      const data = {
        status: application.status ?? existing?.status ?? 'In Progress',
        progressPercent: application.progressPercent ?? existing?.progressPercent ?? 0,
        applicationNumber: application.applicationNumber ?? existing?.applicationNumber ?? null,
        missingFields: application.missingFields ?? existing?.missingFields ?? [],
        mappedFieldsCount: application.mappedFieldsCount ?? existing?.mappedFieldsCount ?? 0,
        totalFieldsCount: application.totalFieldsCount ?? existing?.totalFieldsCount ?? 0,
        submittedAt: application.submittedAt === undefined
          ? existing?.submittedAt ?? null
          : application.submittedAt
            ? dateFromIso(application.submittedAt)
            : null,
      };
      const saved = existing
        ? await transaction.application.update({ where: { id: existing.id }, data, include: { exam: true } })
        : await transaction.application.create({
            data: { ...data, userId, examId: examRow.id },
            include: { exam: true },
          });
      return applicationFromRow(saved);
    });
  }

  async getExams(): Promise<ExamItem[]> {
    const exams = await this.client.exam.findMany({
      where: { verifiedAt: { not: null }, AND: [{ sourceUrl: { not: null } }, { NOT: { sourceUrl: '' } }] },
      orderBy: { applicationDeadline: 'asc' },
    });
    return exams.map(examFromRow);
  }

  async getExamById(examId: string): Promise<ExamItem | undefined> {
    const exam = await this.client.exam.findFirst({
      where: { id: examId, verifiedAt: { not: null }, AND: [{ sourceUrl: { not: null } }, { NOT: { sourceUrl: '' } }] },
    });
    return exam ? examFromRow(exam) : undefined;
  }

  async getExamDirectory(
    filters: ExamDirectoryFilters,
  ): Promise<ExamDirectoryQueryResult<ExamDirectoryEntry>> {
    const where: Prisma.ExamWhereInput = {
      verifiedAt: { not: null },
      sourceUrl: { not: null },
      AND: [{ NOT: { sourceUrl: '' } }],
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.state ? { state: filters.state } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { shortName: { contains: filters.search, mode: 'insensitive' } },
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { conductingBody: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.client.exam.findMany({
      where,
      orderBy: { registrationEndDate: { sort: filters.sortOrder, nulls: 'last' } },
    });
    const filteredRows = rows.filter((row) => {
      if (!filters.status) return true;
      return getExamRegistrationStatus(
        row.registrationStartDate?.toISOString().slice(0, 10) ?? null,
        row.registrationEndDate?.toISOString().slice(0, 10) ?? null,
      ) === filters.status;
    });
    const total = filteredRows.length;
    const start = (filters.page - 1) * filters.limit;
    return {
      exams: filteredRows.slice(start, start + filters.limit).map(examDirectoryFromRow),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getExamDirectoryBySlug(slug: string): Promise<ExamDirectoryEntry | undefined> {
    const exam = await this.client.exam.findFirst({
      where: {
        slug,
        verifiedAt: { not: null },
        sourceUrl: { not: null },
        AND: [{ NOT: { sourceUrl: '' } }],
      },
    });
    return exam ? examDirectoryFromRow(exam) : undefined;
  }

  private createEmptyProfile(account: UserAccount): StudentProfile {
    return {
      id: account.id,
      preferredExamCategories: [],
      personalInfo: {
        fullName: account.fullName,
        dob: '',
        gender: '',
        nationality: '',
        category: '',
        email: account.email,
        phoneNumber: '',
        address: { street: '', city: '', state: '', pincode: '', country: '' },
      },
      academicInfo: {
        class10: { board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '' },
        class12: { status: '', board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '', stream: '', subjects: [] },
        currentQualification: '',
        institution: '',
      },
    };
  }
}

export const db = new DatabaseManager();
