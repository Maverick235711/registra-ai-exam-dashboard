import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, getDaysRemaining, getRegistrationStatus, calculateProfileCompletion, evaluateEligibility, mapProfileToExamFields } from './eligibilityEngine';
import { StudentProfile, ExamItem, DocumentRecord } from '../types';

const mockProfile: StudentProfile = {
  id: 'usr_001',
  personalInfo: {
    fullName: 'Aryan Sharma',
    dob: '2006-04-15',
    gender: 'Male',
    nationality: 'Indian',
    category: 'General',
    email: 'aryan.sharma@example.com',
    phoneNumber: '+91 98765 43210',
    address: {
      street: '42, Vasant Vihar',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110057',
      country: 'India',
    },
  },
  academicInfo: {
    class10: {
      board: 'CBSE',
      schoolName: 'Delhi Public School, R.K. Puram',
      passingYear: 2022,
      percentage: 94.2,
      rollNumber: 'CBSE10-847291',
    },
    class12: {
      status: 'Passed',
      board: 'CBSE',
      schoolName: 'Delhi Public School, R.K. Puram',
      passingYear: 2024,
      percentage: 88.5,
      rollNumber: 'CBSE12-918237',
      stream: 'PCM',
      subjects: ['Physics', 'Chemistry', 'Mathematics', 'English Core', 'Computer Science'],
    },
    currentQualification: 'Senior Secondary (10+2)',
    institution: 'Delhi Public School',
  },
};

const mockDocs: DocumentRecord[] = [
  { id: 'd1', type: 'class10_marksheet', title: '10th Marksheet', description: 'CBSE', requiredFor: ['All'], status: 'Verified', fileUrl: '/test/10th.pdf' },
  { id: 'd2', type: 'class12_marksheet', title: '12th Marksheet', description: 'CBSE', requiredFor: ['All'], status: 'Verified', fileUrl: '/test/12th.pdf' },
  { id: 'd3', type: 'photograph', title: 'Passport Photo', description: 'Recent photo', requiredFor: ['All'], status: 'Verified', fileUrl: '/test/photo.png' },
  { id: 'd4', type: 'signature', title: 'Digital Signature', description: 'Clean signature', requiredFor: ['All'], status: 'Uploaded', fileUrl: '/test/signature.png' },
  { id: 'd5', type: 'identity_proof', title: 'Aadhaar Card', description: 'Govt ID', requiredFor: ['All'], status: 'Missing' },
];

const mockJeeExam: ExamItem = {
  id: 'exam_jee_main',
  name: 'JEE Main 2027',
  fullName: 'Joint Entrance Examination (Main)',
  authority: 'National Testing Agency (NTA)',
  category: 'Engineering',
  description: 'Gateway for admission into NITs, IIITs, and CFTIs.',
  eligibilitySummary: '10+2 with Physics, Mathematics & Chemistry/CS. Minimum 75% for NIT/IIIT admission.',
  criteria: {
    minAgeYears: 16,
    maxAgeYears: 25,
    requiredStream: ['PCM', 'PCMB'],
    requiredSubjects: ['Physics', 'Mathematics'],
    minClass12Percentage: 75,
  },
  applicationOpenDate: '2026-11-01',
  applicationDeadline: '2026-12-05',
  admitCardDate: '2027-01-10',
  examDate: '2027-01-24',
  feeINR: { general: 1000, reserved: 500, female: 800 },
  officialWebsite: 'https://jeemain.nta.nic.in',
  popularCourses: ['B.Tech Computer Science', 'B.Tech Electrical', 'B.Tech Mechanical'],
  documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet'],
  status: 'Registration Open',
  applicationFields: [
    { key: 'personal.fullName', label: 'Candidate Full Name', profileField: 'personalInfo.fullName' },
    { key: 'personal.email', label: 'Email Address', profileField: 'personalInfo.email' },
    { key: 'academic.subjects', label: 'Class 12 Subjects', profileField: 'academicInfo.class12.subjects' },
    { key: 'documents.identity', label: 'Identity Proof', documentType: 'identity_proof' },
  ],
};

test('calculateAge correctly computes age relative to reference date', () => {
  const age = calculateAge('2006-04-15', '2026-08-01');
  assert.equal(age, 20);
});

test('getDaysRemaining returns positive number for future deadline', () => {
  const days = getDaysRemaining('2026-12-05', '2026-11-08');
  assert.equal(days, 27);
});

test('registration status uses actual date boundaries and rejects invalid dates', () => {
  assert.equal(getRegistrationStatus('2026-11-01', '2026-11-30', '2026-11-01'), 'Registration Open');
  assert.equal(getRegistrationStatus('2026-11-01', '2026-11-30', '2026-12-01'), 'Closed');
  assert.equal(getRegistrationStatus('unknown', '2026-11-30', '2026-11-01'), 'Unknown');
});

test('calculateProfileCompletion computes weighted completeness', () => {
  const completion = calculateProfileCompletion(mockProfile, mockDocs);
  assert.ok(completion.overall >= 80, `Expected >= 80, got ${completion.overall}`);
  assert.equal(completion.sections.personal.completed, true);
  assert.equal(completion.sections.academic.completed, true);
  assert.equal(completion.sections.contact.completed, true);
  assert.equal(completion.sections.documents.completed, false);
  assert.equal(completion.sections.documents.score, 80);
  assert.equal(completion.sections.documents.pendingReviewCount, 1);
});

test('evaluateEligibility marks Aryan eligible for JEE Main 2027', () => {
  const result = evaluateEligibility(mockProfile, mockJeeExam, '2026-11-08');
  assert.equal(result.isEligible, true);
  assert.equal(result.scorePercentage, 100);
  assert.ok(result.checks.every(c => c.met));
});

test('evaluateEligibility flags student when percentage requirement is not met', () => {
  const lowScorerProfile: StudentProfile = {
    ...mockProfile,
    academicInfo: {
      ...mockProfile.academicInfo,
      class12: {
        ...mockProfile.academicInfo.class12,
        percentage: 68.0,
      },
    },
  };
  const result = evaluateEligibility(lowScorerProfile, mockJeeExam, '2026-11-08');
  assert.equal(result.isEligible, false);
  const pctCheck = result.checks.find(c => c.criteriaName === 'Class 12 Minimum Aggregate');
  assert.ok(pctCheck);
  assert.equal(pctCheck?.met, false);
});

test('mapProfileToExamFields maps only configured fields and marks missing documents', () => {
  const mapped = mapProfileToExamFields(mockProfile, mockJeeExam, mockDocs);
  const fields = mapped.flatMap((group) => group.fields);
  assert.equal(fields.length, 4);
  const fullNameField = fields.find(f => f.examField === 'Candidate Full Name');
  assert.equal(fullNameField?.studentValue, 'Aryan Sharma');
  assert.equal(fullNameField?.status, 'Auto-Mapped');
  assert.equal(fields.find((field) => field.examField === 'Identity Proof')?.status, 'Missing');
});

test('verified uploaded documents count as mapped application fields', () => {
  const documents = [
    ...mockDocs,
    {
      id: 'd6',
      type: 'identity_proof' as const,
      title: 'Identity Proof',
      description: 'Government ID',
      requiredFor: ['JEE Main'],
      status: 'Verified' as const,
      fileUrl: '/test/identity.pdf',
      fileName: 'identity.pdf',
    },
  ];
  const mapped = mapProfileToExamFields(mockProfile, mockJeeExam, documents);
  const identityField = mapped.flatMap((group) => group.fields).find((field) => field.examField === 'Identity Proof');
  assert.equal(identityField?.status, 'Verified');
  assert.equal(identityField?.studentValue, 'identity.pdf');
});

test('new profile completion is zero until required account data is saved', () => {
  const emptyProfile: StudentProfile = {
    ...mockProfile,
    personalInfo: {
      ...mockProfile.personalInfo,
      fullName: '',
      dob: '',
      gender: '',
      nationality: '',
      category: '',
      email: '',
      phoneNumber: '',
      address: { street: '', city: '', state: '', pincode: '', country: '' },
    },
    academicInfo: {
      ...mockProfile.academicInfo,
      class10: { board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '' },
      class12: { status: '', board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '', stream: '', subjects: [] },
      currentQualification: '',
      institution: '',
    },
  };
  assert.equal(calculateProfileCompletion(emptyProfile).overall, 0);
});

test('eligibility remains undetermined when required profile information is missing', () => {
  const incompleteProfile: StudentProfile = {
    ...mockProfile,
    personalInfo: { ...mockProfile.personalInfo, dob: '' },
    academicInfo: { ...mockProfile.academicInfo, class12: { ...mockProfile.academicInfo.class12, percentage: 0, stream: '', subjects: [] } },
  };
  const result = evaluateEligibility(incompleteProfile, mockJeeExam, '2026-11-08');
  assert.equal(result.isEligible, false);
  assert.equal(result.sufficientInformation, false);
  assert.ok(result.missingInfo.includes('Date of birth'));
  assert.ok(result.missingInfo.includes('Class 12 percentage'));
});
