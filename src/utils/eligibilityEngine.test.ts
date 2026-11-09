import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, getDaysRemaining, calculateProfileCompletion, evaluateEligibility, mapProfileToExamFields } from './eligibilityEngine';
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
  { id: 'd1', type: 'class10_marksheet', title: '10th Marksheet', description: 'CBSE', requiredFor: ['All'], status: 'Verified' },
  { id: 'd2', type: 'class12_marksheet', title: '12th Marksheet', description: 'CBSE', requiredFor: ['All'], status: 'Verified' },
  { id: 'd3', type: 'photograph', title: 'Passport Photo', description: 'Recent photo', requiredFor: ['All'], status: 'Verified' },
  { id: 'd4', type: 'signature', title: 'Digital Signature', description: 'Clean signature', requiredFor: ['All'], status: 'Uploaded' },
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
};

test('calculateAge correctly computes age relative to reference date', () => {
  const age = calculateAge('2006-04-15', '2026-08-01');
  assert.equal(age, 20);
});

test('getDaysRemaining returns positive number for future deadline', () => {
  const days = getDaysRemaining('2026-12-05', '2026-11-08');
  assert.equal(days, 27);
});

test('calculateProfileCompletion computes weighted completeness', () => {
  const completion = calculateProfileCompletion(mockProfile, mockDocs);
  assert.ok(completion.overall >= 80, `Expected >= 80, got ${completion.overall}`);
  assert.equal(completion.sections.personal.completed, true);
  assert.equal(completion.sections.academic.completed, true);
  assert.equal(completion.sections.contact.completed, true);
  assert.equal(completion.sections.documents.completed, true); // 4 of 5 uploaded/verified = 80%
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

test('mapProfileToExamFields outputs structured demographic and academic sections', () => {
  const mapped = mapProfileToExamFields(mockProfile, 'JEE Main');
  assert.equal(mapped.length, 4);
  const fullNameField = mapped[0].fields.find(f => f.examField === 'Candidate Full Name');
  assert.equal(fullNameField?.studentValue, 'Aryan Sharma');
  assert.equal(fullNameField?.status, 'Verified');
});
