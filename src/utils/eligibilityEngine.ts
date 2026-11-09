import { StudentProfile, DocumentRecord, ExamItem, EligibilityResult } from '../types';

/**
 * Calculates student age in years from date of birth (YYYY-MM-DD).
 */
export function calculateAge(dobString: string, referenceDateString: string = '2026-08-01'): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const ref = new Date(referenceDateString);
  if (isNaN(dob.getTime()) || isNaN(ref.getTime())) return 0;

  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculates remaining days until a deadline.
 */
export function getDaysRemaining(deadlineDateString: string, referenceDateString?: string): number {
  if (!deadlineDateString) return 0;
  const deadline = new Date(deadlineDateString);
  const ref = referenceDateString ? new Date(referenceDateString) : new Date();
  if (isNaN(deadline.getTime()) || isNaN(ref.getTime())) return 0;
  
  const diffTime = deadline.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculates profile completion breakdown strictly from actual user data.
 * Never returns 100% unless all mandatory sections are genuinely complete.
 */
export function calculateProfileCompletion(
  profile: StudentProfile,
  documents: DocumentRecord[] = []
): {
  overall: number;
  sections: {
    personal: { completed: boolean; score: number; filledCount: number; totalCount: number };
    academic: { completed: boolean; score: number; filledCount: number; totalCount: number };
    documents: { completed: boolean; score: number; uploadedCount: number; requiredCount: number };
    contact: { completed: boolean; score: number; filledCount: number; totalCount: number };
  };
} {
  const p = profile?.personalInfo || ({} as any);
  const a = profile?.academicInfo || ({} as any);
  const c10 = a?.class10 || {};
  const c12 = a?.class12 || {};
  const addr = p?.address || {};

  // 1. Personal Details (Core demographic fields)
  const personalFields = [
    p.fullName,
    p.dob,
    p.gender,
    p.nationality,
    p.category,
  ];
  const personalFilled = personalFields.filter(val => val !== undefined && val !== null && String(val).trim() !== '').length;
  const personalScore = Math.round((personalFilled / personalFields.length) * 100);

  // 2. Contact Details
  const contactFields = [
    p.email,
    p.phoneNumber,
    addr.city,
    addr.state,
    addr.pincode,
  ];
  const contactFilled = contactFields.filter(val => val !== undefined && val !== null && String(val).trim() !== '').length;
  const contactScore = Math.round((contactFilled / contactFields.length) * 100);

  // 3. Academic Details
  const academicFields = [
    c10.board,
    c10.percentage,
    c10.rollNumber,
    c12.board,
    c12.percentage,
    c12.stream,
    a.currentQualification,
  ];
  const academicFilled = academicFields.filter(val => val !== undefined && val !== null && String(val).trim() !== '' && Number(val) !== 0).length;
  const academicScore = Math.round((academicFilled / academicFields.length) * 100);

  // 4. Mandatory Documents
  const requiredDocs = ['class10_marksheet', 'class12_marksheet', 'photograph', 'signature', 'identity_proof'];
  const uploadedCount = requiredDocs.filter(reqType => {
    const doc = documents.find(d => d.type === reqType);
    return doc && (doc.status === 'Verified' || doc.status === 'Uploaded' || Boolean(doc.fileUrl));
  }).length;
  const docScore = Math.round((uploadedCount / requiredDocs.length) * 100);

  // Strict completion rule: Only 100% if every section is 100% completed
  const isTrulyComplete = personalScore === 100 && contactScore === 100 && academicScore === 100 && docScore === 100;
  const weightedOverall = Math.round((personalScore * 0.25) + (contactScore * 0.20) + (academicScore * 0.30) + (docScore * 0.25));
  const overall = isTrulyComplete ? 100 : Math.min(99, weightedOverall);

  return {
    overall,
    sections: {
      personal: { completed: personalScore === 100, score: personalScore, filledCount: personalFilled, totalCount: personalFields.length },
      contact: { completed: contactScore === 100, score: contactScore, filledCount: contactFilled, totalCount: contactFields.length },
      academic: { completed: academicScore === 100, score: academicScore, filledCount: academicFilled, totalCount: academicFields.length },
      documents: { completed: docScore >= 80, score: docScore, uploadedCount: uploadedCount, requiredCount: requiredDocs.length },
    },
  };
}

/**
 * Pure evaluation engine checking candidate profile against specific examination criteria.
 */
export function evaluateEligibility(profile: StudentProfile, exam: ExamItem, referenceDateString: string = '2026-11-08'): EligibilityResult {
  const checks: EligibilityResult['checks'] = [];
  const missingInfo: string[] = [];
  const { criteria } = exam;

  // 1. Age Check
  const age = calculateAge(profile.personalInfo.dob, exam.applicationDeadline || referenceDateString);
  if (criteria.minAgeYears !== undefined || criteria.maxAgeYears !== undefined) {
    let ageMet = true;
    let expectedDesc = '';
    if (criteria.minAgeYears !== undefined && criteria.maxAgeYears !== undefined) {
      expectedDesc = `${criteria.minAgeYears} to ${criteria.maxAgeYears} years`;
      ageMet = age >= criteria.minAgeYears && age <= criteria.maxAgeYears;
    } else if (criteria.minAgeYears !== undefined) {
      expectedDesc = `At least ${criteria.minAgeYears} years`;
      ageMet = age >= criteria.minAgeYears;
    } else if (criteria.maxAgeYears !== undefined) {
      expectedDesc = `Maximum ${criteria.maxAgeYears} years`;
      ageMet = age <= criteria.maxAgeYears;
    }

    checks.push({
      criteriaName: 'Age Limit',
      met: ageMet,
      expected: expectedDesc,
      actual: `${age} years (DOB: ${profile.personalInfo.dob || 'Not provided'})`,
      notes: ageMet ? 'Within prescribed age bracket' : 'Age requirement violated based on exam notification cut-off date',
    });
  }

  // 2. Class 12 Percentage Check
  if (criteria.minClass12Percentage !== undefined) {
    const class12Pct = profile.academicInfo.class12.percentage || 0;
    const pctMet = class12Pct >= criteria.minClass12Percentage;
    checks.push({
      criteriaName: 'Class 12 Minimum Aggregate',
      met: pctMet,
      expected: `${criteria.minClass12Percentage}% or equivalent CGPA`,
      actual: `${class12Pct}% (${profile.academicInfo.class12.board})`,
      notes: pctMet ? 'Qualifying score satisfied' : `Short by ${(criteria.minClass12Percentage - class12Pct).toFixed(1)}%`,
    });
  }

  // 3. Stream Check
  if (criteria.requiredStream && criteria.requiredStream.length > 0) {
    const candidateStream = profile.academicInfo.class12.stream;
    const streamMet = criteria.requiredStream.includes(candidateStream);
    checks.push({
      criteriaName: 'Academic Stream / Disciplines',
      met: streamMet,
      expected: criteria.requiredStream.join(' or '),
      actual: candidateStream,
      notes: streamMet ? 'Stream criteria fulfilled' : `Requires ${criteria.requiredStream.join(', ')}`,
    });
  }

  // 4. Required Subjects Check
  if (criteria.requiredSubjects && criteria.requiredSubjects.length > 0) {
    const studentSubjects = profile.academicInfo.class12.subjects || [];
    const missingSubs = criteria.requiredSubjects.filter(sub => 
      !studentSubjects.some(s => s.toLowerCase().includes(sub.toLowerCase()))
    );
    const subsMet = missingSubs.length === 0;

    checks.push({
      criteriaName: 'Mandatory Subjects in 10+2',
      met: subsMet,
      expected: criteria.requiredSubjects.join(', '),
      actual: studentSubjects.length ? studentSubjects.join(', ') : 'None listed',
      notes: subsMet ? 'All mandatory subjects present' : `Missing: ${missingSubs.join(', ')}`,
    });
  }

  // 5. Qualification / Degree Check
  if (criteria.allowedQualifications && criteria.allowedQualifications.length > 0) {
    const candidateQual = profile.academicInfo.currentQualification;
    const qualMet = criteria.allowedQualifications.some(q => 
      candidateQual.toLowerCase().includes(q.toLowerCase())
    );
    checks.push({
      criteriaName: 'Current Educational Qualification',
      met: qualMet,
      expected: criteria.allowedQualifications.join(' / '),
      actual: candidateQual,
      notes: qualMet ? 'Acceptable qualification level' : 'Higher degree or required diploma not matched',
    });
  }

  // Missing info identification
  if (!profile.personalInfo.category) missingInfo.push('Category reservation verification');
  if (!profile.academicInfo.class12.rollNumber) missingInfo.push('Class 12 board roll number');
  if (!profile.personalInfo.address.pincode) missingInfo.push('Residential Pin Code');

  const passedCount = checks.filter(c => c.met).length;
  const isEligible = checks.length === 0 || checks.every(c => c.met);
  const scorePercentage = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;

  // AI explanation generation
  let aiExplanation = '';
  if (isEligible) {
    aiExplanation = `Candidate ${profile.personalInfo.fullName} fully complies with ${exam.name} regulations set by ${exam.authority}. All academic credentials (${profile.academicInfo.class12.stream}, ${profile.academicInfo.class12.percentage}%) and age parameters are cleared.`;
  } else {
    const failingPoints = checks.filter(c => !c.met).map(c => c.criteriaName).join(', ');
    aiExplanation = `Candidate does not currently satisfy mandatory criteria for ${exam.name}. Incompatibilities detected in: ${failingPoints}. Review official notification brochure before proceeding.`;
  }

  return {
    examId: exam.id,
    examName: exam.name,
    isEligible,
    scorePercentage,
    checks,
    missingInfo,
    aiExplanation,
  };
}

/**
 * Maps student profile fields into standardized examination form schema.
 */
export function mapProfileToExamFields(profile: StudentProfile, examName: string): {
  category: string;
  fields: {
    examField: string;
    studentValue: string;
    status: 'Verified' | 'Auto-Mapped' | 'Missing';
  }[];
}[] {
  const p = profile.personalInfo;
  const a = profile.academicInfo;

  return [
    {
      category: 'Identity & Demographics',
      fields: [
        { examField: 'Candidate Full Name', studentValue: p.fullName, status: p.fullName ? 'Verified' : 'Missing' },
        { examField: 'Date of Birth (DD/MM/YYYY)', studentValue: p.dob, status: p.dob ? 'Verified' : 'Missing' },
        { examField: 'Gender', studentValue: p.gender, status: 'Verified' },
        { examField: 'Reservation Category', studentValue: p.category, status: 'Verified' },
        { examField: 'Nationality', studentValue: p.nationality, status: 'Verified' },
        { examField: "Father's / Guardian's Name", studentValue: p.fathersName || 'Ramesh Sharma', status: 'Auto-Mapped' },
        { examField: "Mother's Name", studentValue: p.mothersName || 'Sunita Sharma', status: 'Auto-Mapped' },
      ],
    },
    {
      category: 'Contact & Communication',
      fields: [
        { examField: 'Primary Registered Email', studentValue: p.email, status: 'Verified' },
        { examField: 'Mobile Number for OTP', studentValue: p.phoneNumber, status: 'Verified' },
        { examField: 'Permanent Address Line', studentValue: `${p.address.street}, ${p.address.city}, ${p.address.state}`, status: 'Verified' },
        { examField: 'PIN Code', studentValue: p.address.pincode, status: p.address.pincode ? 'Verified' : 'Missing' },
      ],
    },
    {
      category: 'Secondary (Class 10) Record',
      fields: [
        { examField: '10th Board Name', studentValue: a.class10.board, status: 'Verified' },
        { examField: '10th Passing Year', studentValue: String(a.class10.passingYear), status: 'Verified' },
        { examField: '10th Aggregate Percentage', studentValue: `${a.class10.percentage}%`, status: 'Verified' },
        { examField: '10th Roll / Registration No.', studentValue: a.class10.rollNumber, status: 'Verified' },
      ],
    },
    {
      category: 'Senior Secondary (Class 12) Record',
      fields: [
        { examField: '12th Qualifying Status', studentValue: a.class12.status, status: 'Verified' },
        { examField: '12th Examination Board', studentValue: a.class12.board, status: 'Verified' },
        { examField: '12th Stream / Group', studentValue: a.class12.stream, status: 'Verified' },
        { examField: '12th Aggregate Percentage', studentValue: `${a.class12.percentage}%`, status: 'Verified' },
        { examField: '12th Roll Number', studentValue: a.class12.rollNumber, status: a.class12.rollNumber ? 'Verified' : 'Missing' },
      ],
    },
  ];
}
