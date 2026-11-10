import { DocumentRecord, DocumentType, EligibilityResult, ExamItem, StudentProfile } from '../types';

export const REQUIRED_PROFILE_DOCUMENTS: DocumentType[] = [
  'class10_marksheet',
  'class12_marksheet',
  'photograph',
  'signature',
  'identity_proof',
];

export function createEmptyProfile(): StudentProfile {
  return {
    id: '',
    preferredExamCategories: [],
    personalInfo: {
      fullName: '',
      dob: '',
      gender: '',
      nationality: '',
      category: '',
      email: '',
      phoneNumber: '',
      address: { street: '', city: '', state: '', pincode: '', country: '' },
      fathersName: '',
      mothersName: '',
    },
    academicInfo: {
      class10: { board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '' },
      class12: {
        status: '',
        board: '',
        schoolName: '',
        passingYear: 0,
        percentage: 0,
        rollNumber: '',
        stream: '',
        subjects: [],
      },
      currentQualification: '',
      institution: '',
    },
  };
}

const currentDateOnly = () => new Date().toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

export function getRegistrationStatus(
  openDate: string,
  deadline: string,
  referenceDate: string = currentDateOnly(),
): 'Registration Open' | 'Upcoming' | 'Closed' | 'Unknown' {
  const open = parseDateOnly(openDate);
  const close = parseDateOnly(deadline);
  const today = parseDateOnly(referenceDate);
  if (!open || !close || !today || close < open) return 'Unknown';
  if (today < open) return 'Upcoming';
  if (today <= close) return 'Registration Open';
  return 'Closed';
}

export function calculateAge(dobString: string, referenceDateString: string = currentDateOnly()): number | null {
  const dob = parseDateOnly(dobString);
  const ref = parseDateOnly(referenceDateString);
  if (!dob || !ref || dob > ref) return null;

  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const monthDifference = ref.getUTCMonth() - dob.getUTCMonth();
  if (monthDifference < 0 || (monthDifference === 0 && ref.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function getDaysRemaining(deadlineDateString: string, referenceDateString: string = currentDateOnly()): number | null {
  const deadline = parseDateOnly(deadlineDateString);
  const referenceDate = parseDateOnly(referenceDateString);
  if (!deadline || !referenceDate) return null;
  return Math.round((deadline.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
}

const hasValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
};

export function calculateProfileCompletion(profile: StudentProfile, documents: DocumentRecord[] = []): {
  overall: number;
  sections: {
    personal: { completed: boolean; score: number; filledCount: number; totalCount: number };
    academic: { completed: boolean; score: number; filledCount: number; totalCount: number };
    documents: { completed: boolean; score: number; uploadedCount: number; pendingReviewCount: number; requiredCount: number };
    contact: { completed: boolean; score: number; filledCount: number; totalCount: number };
  };
} {
  const { personalInfo: personal, academicInfo: academic } = profile;
  const personalFields: unknown[] = [
    personal.fullName,
    personal.dob,
    personal.gender,
    personal.nationality,
    personal.category,
  ];
  const contactFields: unknown[] = [
    personal.email,
    personal.phoneNumber,
    personal.address.street,
    personal.address.city,
    personal.address.state,
    personal.address.pincode,
    personal.address.country,
  ];
  const academicFields: unknown[] = [
    academic.class10.board,
    academic.class10.schoolName,
    academic.class10.passingYear,
    academic.class10.percentage,
    academic.class10.rollNumber,
    academic.class12.status,
    academic.class12.board,
    academic.class12.schoolName,
    academic.class12.passingYear,
    academic.class12.percentage,
    academic.class12.rollNumber,
    academic.class12.stream,
    academic.class12.subjects,
    academic.currentQualification,
  ];
  const filled = (fields: unknown[]) => fields.filter(hasValue).length;
  const section = (fields: unknown[]) => {
    const filledCount = filled(fields);
    const score = Math.round((filledCount / fields.length) * 100);
    return { completed: score === 100, score, filledCount, totalCount: fields.length };
  };

  const uploadedTypes = REQUIRED_PROFILE_DOCUMENTS.filter((type) => {
    const document = documents.find((item) => item.type === type);
    return Boolean(document?.fileUrl && ['Verified', 'Uploaded', 'Pending Review'].includes(document.status));
  });
  const pendingReviewCount = uploadedTypes.filter((type) => {
    const document = documents.find((item) => item.type === type);
    return document?.status !== 'Verified';
  }).length;
  const documentScore = Math.round((uploadedTypes.length / REQUIRED_PROFILE_DOCUMENTS.length) * 100);
  const personalSection = section(personalFields);
  const contactSection = section(contactFields);
  const academicSection = section(academicFields);
  const totalRequired = personalFields.length + contactFields.length + academicFields.length + REQUIRED_PROFILE_DOCUMENTS.length;
  const totalComplete = personalSection.filledCount + contactSection.filledCount + academicSection.filledCount + uploadedTypes.length;

  return {
    overall: Math.round((totalComplete / totalRequired) * 100),
    sections: {
      personal: personalSection,
      contact: contactSection,
      academic: academicSection,
      documents: {
        completed: documentScore === 100,
        score: documentScore,
        uploadedCount: uploadedTypes.length,
        pendingReviewCount,
        requiredCount: REQUIRED_PROFILE_DOCUMENTS.length,
      },
    },
  };
}

export function evaluateEligibility(
  profile: StudentProfile,
  exam: ExamItem,
  referenceDateString: string = currentDateOnly(),
): EligibilityResult {
  const checks: EligibilityResult['checks'] = [];
  const missingInfo: string[] = [];
  const { criteria } = exam;
  let requiredCriteria = 0;

  if (criteria.minAgeYears !== undefined || criteria.maxAgeYears !== undefined) {
    requiredCriteria += 1;
    const age = calculateAge(profile.personalInfo.dob, referenceDateString);
    const met = age !== null &&
      (criteria.minAgeYears === undefined || age >= criteria.minAgeYears) &&
      (criteria.maxAgeYears === undefined || age <= criteria.maxAgeYears);
    const expected = criteria.minAgeYears !== undefined && criteria.maxAgeYears !== undefined
      ? `${criteria.minAgeYears} to ${criteria.maxAgeYears} years`
      : criteria.minAgeYears !== undefined
        ? `At least ${criteria.minAgeYears} years`
        : `Maximum ${criteria.maxAgeYears} years`;
    if (age === null) missingInfo.push('Date of birth');
    checks.push({
      criteriaName: 'Age Limit',
      met,
      expected,
      actual: age === null ? 'Not provided or invalid' : `${age} years`,
      notes: age === null ? 'Date of birth is required to assess the age criterion' : met ? 'Within prescribed age bracket' : 'Age requirement not met',
    });
  }

  if (criteria.minClass12Percentage !== undefined) {
    requiredCriteria += 1;
    const percentage = profile.academicInfo.class12.percentage;
    const supplied = Number.isFinite(percentage) && percentage > 0;
    const met = supplied && percentage >= criteria.minClass12Percentage;
    if (!supplied) missingInfo.push('Class 12 percentage');
    checks.push({
      criteriaName: 'Class 12 Minimum Aggregate',
      met,
      expected: `${criteria.minClass12Percentage}% or equivalent CGPA`,
      actual: supplied ? `${percentage}%` : 'Not provided',
      notes: !supplied ? 'Class 12 percentage is required to assess this criterion' : met ? 'Qualifying score satisfied' : `Short by ${(criteria.minClass12Percentage - percentage).toFixed(1)}%`,
    });
  }

  if (criteria.minClass10Percentage !== undefined) {
    requiredCriteria += 1;
    const percentage = profile.academicInfo.class10.percentage;
    const supplied = Number.isFinite(percentage) && percentage > 0;
    const met = supplied && percentage >= criteria.minClass10Percentage;
    if (!supplied) missingInfo.push('Class 10 percentage');
    checks.push({
      criteriaName: 'Class 10 Minimum Aggregate',
      met,
      expected: `${criteria.minClass10Percentage}% or equivalent`,
      actual: supplied ? `${percentage}%` : 'Not provided',
      notes: !supplied ? 'Class 10 percentage is required to assess this criterion' : met ? 'Qualifying score satisfied' : `Short by ${(criteria.minClass10Percentage - percentage).toFixed(1)}%`,
    });
  }

  if (criteria.requiredStream?.length) {
    requiredCriteria += 1;
    const stream = profile.academicInfo.class12.stream;
    const supplied = Boolean(stream);
    const met = supplied && criteria.requiredStream.includes(stream);
    if (!supplied) missingInfo.push('Class 12 stream');
    checks.push({
      criteriaName: 'Academic Stream / Disciplines',
      met,
      expected: criteria.requiredStream.join(' or '),
      actual: supplied ? stream : 'Not provided',
      notes: !supplied ? 'Class 12 stream is required to assess this criterion' : met ? 'Stream criteria fulfilled' : `Requires ${criteria.requiredStream.join(', ')}`,
    });
  }

  if (criteria.requiredSubjects?.length) {
    requiredCriteria += 1;
    const subjects = profile.academicInfo.class12.subjects;
    if (!subjects.length) missingInfo.push('Class 12 subjects');
    const missingSubjects = criteria.requiredSubjects.filter((subject) =>
      !subjects.some((item) => item.toLowerCase().includes(subject.toLowerCase())),
    );
    const met = subjects.length > 0 && missingSubjects.length === 0;
    checks.push({
      criteriaName: 'Mandatory Subjects in 10+2',
      met,
      expected: criteria.requiredSubjects.join(', '),
      actual: subjects.length ? subjects.join(', ') : 'Not provided',
      notes: !subjects.length ? 'Class 12 subjects are required to assess this criterion' : met ? 'All mandatory subjects present' : `Missing: ${missingSubjects.join(', ')}`,
    });
  }

  if (criteria.allowedQualifications?.length) {
    requiredCriteria += 1;
    const qualification = profile.academicInfo.currentQualification;
    const supplied = Boolean(qualification.trim());
    const met = supplied && criteria.allowedQualifications.some((item) => qualification.toLowerCase().includes(item.toLowerCase()));
    if (!supplied) missingInfo.push('Current educational qualification');
    checks.push({
      criteriaName: 'Current Educational Qualification',
      met,
      expected: criteria.allowedQualifications.join(' / '),
      actual: supplied ? qualification : 'Not provided',
      notes: !supplied ? 'Current qualification is required to assess this criterion' : met ? 'Acceptable qualification level' : 'Required qualification not matched',
    });
  }

  if (criteria.allowedCategories?.length) {
    requiredCriteria += 1;
    const category = profile.personalInfo.category;
    const supplied = Boolean(category);
    const met = supplied && criteria.allowedCategories.includes(category);
    if (!supplied) missingInfo.push('Reservation category');
    checks.push({
      criteriaName: 'Reservation Category',
      met,
      expected: criteria.allowedCategories.join(' / '),
      actual: supplied ? category : 'Not provided',
      notes: !supplied ? 'Reservation category is required to assess this criterion' : met ? 'Category meets this criterion' : 'Category requirement not met',
    });
  }

  if (requiredCriteria === 0) missingInfo.push('Eligibility criteria are not configured for this examination');
  const sufficientInformation = requiredCriteria > 0 && missingInfo.length === 0;
  const passedCount = checks.filter((check) => check.met).length;
  const isEligible = sufficientInformation && passedCount === checks.length;
  const scorePercentage = checks.length ? Math.round((passedCount / checks.length) * 100) : 0;
  const aiExplanation = !sufficientInformation
    ? `Eligibility for ${exam.name} cannot be determined yet. Provide: ${[...new Set(missingInfo)].join(', ')}. Confirm requirements against the official examination notice.`
    : isEligible
      ? `The saved profile currently meets the configured eligibility criteria for ${exam.name}. Confirm all details against the official examination notice before applying.`
      : `The saved profile does not meet these configured criteria for ${exam.name}: ${checks.filter((check) => !check.met).map((check) => check.criteriaName).join(', ')}. Review the official notification before proceeding.`;

  return {
    examId: exam.id,
    examName: exam.name,
    isEligible,
    sufficientInformation,
    scorePercentage,
    checks,
    missingInfo: [...new Set(missingInfo)],
    aiExplanation,
  };
}

export function mapProfileToExamFields(profile: StudentProfile, exam: ExamItem, documents: DocumentRecord[] = []): {
  category: string;
  fields: {
    examField: string;
    studentValue: string;
    status: 'Verified' | 'Auto-Mapped' | 'Missing' | 'Manual Review';
  }[];
}[] {
  const definitions = exam.applicationFields ?? [];
  if (!definitions.length) return [];

  const readProfileField = (path: string | undefined): unknown => {
    if (!path) return undefined;
    return path.split('.').reduce<unknown>((value, segment) => {
      if (!value || typeof value !== 'object') return undefined;
      return (value as Record<string, unknown>)[segment];
    }, profile);
  };
  const groups = new Map<string, { examField: string; studentValue: string; status: 'Verified' | 'Auto-Mapped' | 'Missing' | 'Manual Review' }[]>();

  for (const definition of definitions) {
    const value = readProfileField(definition.profileField);
    const present = hasValue(value);
    const document = definition.documentType
      ? documents.find((item) => item.type === definition.documentType && Boolean(item.fileUrl))
      : undefined;
    const status = definition.documentType
      ? document?.status === 'Verified'
        ? 'Verified'
        : document ? 'Manual Review' : 'Missing'
      : present ? 'Auto-Mapped' : 'Missing';
    const groupName = definition.key.split('.')[0] || 'Application';
    const group = groups.get(groupName) ?? [];
    const mappedValue = definition.documentType ? document?.fileName ?? '' : value;
    group.push({
      examField: definition.label,
      studentValue: Array.isArray(mappedValue) ? mappedValue.join(', ') : mappedValue === undefined || mappedValue === null ? '' : String(mappedValue),
      status,
    });
    groups.set(groupName, group);
  }

  return [...groups.entries()].map(([category, fields]) => ({ category, fields }));
}
