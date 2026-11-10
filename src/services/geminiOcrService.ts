import { GeminiOcrResponse, ExtractedFieldData, StudentProfile } from '../types';

export interface FieldMappingConfig {
  key: string;
  label: string;
  group: 'Personal Details' | 'Academic Details' | 'Document & Authority Details';
  type: 'text' | 'date' | 'number';
  placeholder: string;
}

export const validateOcrFieldValue = (key: string, value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (['date_of_birth', 'issue_date', 'expiry_date'].includes(key)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) return false;
    if (key === 'date_of_birth' && parsed.getTime() > Date.now()) return false;
  }
  if (['percentage', 'marks_obtained', 'maximum_marks', 'cgpa'].includes(key)) {
    const number = Number(trimmed.replace('%', ''));
    const maximum = key === 'percentage' ? 100 : key === 'cgpa' ? 10 : 100_000;
    if (!Number.isFinite(number) || number < 0 || number > maximum) return false;
  }
  if (key === 'passing_year') {
    const year = Number(trimmed);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear() + 5) return false;
  }
  return true;
};

export const FIELD_DEFINITIONS: Record<string, FieldMappingConfig> = {
  // Personal Details
  student_name: {
    key: 'student_name',
    label: "Candidate / Student Name",
    group: 'Personal Details',
    type: 'text',
    placeholder: 'Candidate name',
  },
  date_of_birth: {
    key: 'date_of_birth',
    label: 'Date of Birth',
    group: 'Personal Details',
    type: 'date',
    placeholder: 'YYYY-MM-DD',
  },
  gender: {
    key: 'gender',
    label: 'Gender',
    group: 'Personal Details',
    type: 'text',
    placeholder: 'Male / Female / Other',
  },
  fathers_name: {
    key: 'fathers_name',
    label: "Father's Name",
    group: 'Personal Details',
    type: 'text',
    placeholder: "Father's name",
  },
  mothers_name: {
    key: 'mothers_name',
    label: "Mother's Name",
    group: 'Personal Details',
    type: 'text',
    placeholder: "Mother's name",
  },

  // Academic Details
  board_or_university: {
    key: 'board_or_university',
    label: 'Board / University',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. CBSE / State Board / University',
  },
  school_or_college: {
    key: 'school_or_college',
    label: 'School / Institution / College',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. Delhi Public School',
  },
  roll_number: {
    key: 'roll_number',
    label: 'Roll Number / Seat No.',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. CBSE-12-782910',
  },
  registration_number: {
    key: 'registration_number',
    label: 'Registration / Enrolment No.',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. REG-982103',
  },
  passing_year: {
    key: 'passing_year',
    label: 'Passing / Completion Year',
    group: 'Academic Details',
    type: 'number',
    placeholder: 'e.g. 2024',
  },
  subjects: {
    key: 'subjects',
    label: 'Subjects / Stream',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. Physics, Chemistry, Mathematics',
  },
  marks_obtained: {
    key: 'marks_obtained',
    label: 'Marks Obtained',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. 472',
  },
  maximum_marks: {
    key: 'maximum_marks',
    label: 'Maximum Marks',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. 500',
  },
  percentage: {
    key: 'percentage',
    label: 'Aggregate Percentage (%)',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. 89.2%',
  },
  cgpa: {
    key: 'cgpa',
    label: 'CGPA / Grade',
    group: 'Academic Details',
    type: 'text',
    placeholder: 'e.g. 9.4 / 10',
  },

  // Document Details
  document_type: {
    key: 'document_type',
    label: 'Classified Document Type',
    group: 'Document & Authority Details',
    type: 'text',
    placeholder: 'e.g. Class 12 Senior Marksheet',
  },
  issuing_authority: {
    key: 'issuing_authority',
    label: 'Issuing Authority / Board',
    group: 'Document & Authority Details',
    type: 'text',
    placeholder: 'e.g. Central Board of Secondary Education',
  },
  issue_date: {
    key: 'issue_date',
    label: 'Date of Issuance',
    group: 'Document & Authority Details',
    type: 'text',
    placeholder: 'e.g. 2024-05-18',
  },
  expiry_date: {
    key: 'expiry_date',
    label: 'Expiry Date (If applicable)',
    group: 'Document & Authority Details',
    type: 'text',
    placeholder: 'e.g. Permanent / 2030-12-31',
  },
};

/**
 * Convert browser File object to Base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch local image path and convert to Base64
 */
export async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ base64: reader.result as string, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Check backend Gemini OCR connectivity and API key state
 */
export async function checkBackendOcrHealth(): Promise<{
  ok: boolean;
  geminiConfigured: boolean;
  message: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return {
        ok: false,
        geminiConfigured: false,
        message: `Backend returned HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    return {
      ok: true,
      geminiConfigured: Boolean(data.geminiConfigured),
      message: data.geminiConfigured
        ? 'Document scanning is ready.'
        : 'Document scanning is not configured. Contact support.',
    };
  } catch (err: any) {
    return {
      ok: false,
      geminiConfigured: false,
      message: `Failed to reach backend server: ${err.message}`,
    };
  }
}

/**
 * Call the backend Gemini 3.8 Flash Multimodal OCR Endpoint
 */
export async function extractDocumentWithGemini(params: {
  documentType: string;
  fileName: string;
  fileMimeType: string;
  fileBase64: string;
  consentGiven: boolean;
}): Promise<GeminiOcrResponse> {
  const response = await fetch('/api/ocr/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data: GeminiOcrResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `OCR extraction failed with HTTP ${response.status}`);
  }

  return data;
}

/**
 * Helper to map confirmed OCR fields into the student's profile structure
 */
export function mapOcrDataToProfile(
  extractedData: Record<string, ExtractedFieldData>,
  documentType: string,
  currentProfile: StudentProfile
): Partial<StudentProfile> {
  const updates: Partial<StudentProfile> = {
    personalInfo: { ...currentProfile.personalInfo },
    academicInfo: {
      ...currentProfile.academicInfo,
      class10: { ...currentProfile.academicInfo.class10 },
      class12: { ...currentProfile.academicInfo.class12 },
    },
  };

  const getVal = (key: string): string | null => {
    const value = extractedData[key]?.value?.trim() || null;
    return value && validateOcrFieldValue(key, value) ? value : null;
  };

  // 1. Personal Details
  if (getVal('student_name')) {
    updates.personalInfo!.fullName = getVal('student_name')!;
  }
  if (getVal('date_of_birth')) {
    // Basic date sanitation (YYYY-MM-DD)
    const rawDob = getVal('date_of_birth')!;
    updates.personalInfo!.dob = rawDob;
  }
  if (getVal('gender')) {
    const rawG = getVal('gender')!.toLowerCase();
    if (rawG.includes('fem') || rawG === 'f') updates.personalInfo!.gender = 'Female';
    else if (rawG.includes('mal') || rawG === 'm') updates.personalInfo!.gender = 'Male';
  }
  if (getVal('fathers_name')) {
    updates.personalInfo!.fathersName = getVal('fathers_name')!;
  }
  if (getVal('mothers_name')) {
    updates.personalInfo!.mothersName = getVal('mothers_name')!;
  }

  // 2. Academic Details based on document classification
  const docLower = (documentType || '').toLowerCase();
  const isClass10 = docLower.includes('10') || docLower.includes('secondary') || docLower.includes('matric');
  const isClass12 = docLower.includes('12') || docLower.includes('senior') || docLower.includes('intermediate') || docLower.includes('pcm');

  if (isClass10) {
    if (getVal('board_or_university')) updates.academicInfo!.class10.board = getVal('board_or_university')!;
    if (getVal('school_or_college')) updates.academicInfo!.class10.schoolName = getVal('school_or_college')!;
    if (getVal('roll_number')) updates.academicInfo!.class10.rollNumber = getVal('roll_number')!;
    if (getVal('passing_year')) {
      const year = parseInt(getVal('passing_year')!, 10);
      if (!isNaN(year)) updates.academicInfo!.class10.passingYear = year;
    }
    if (getVal('percentage')) {
      const pct = parseFloat(getVal('percentage')!.replace(/%/g, ''));
      if (!isNaN(pct)) updates.academicInfo!.class10.percentage = pct;
    }
    if (getVal('marks_obtained')) {
      const marks = parseFloat(getVal('marks_obtained')!);
      if (!isNaN(marks)) updates.academicInfo!.class10.obtainedMarks = marks;
    }
    if (getVal('maximum_marks')) {
      const max = parseFloat(getVal('maximum_marks')!);
      if (!isNaN(max)) updates.academicInfo!.class10.maxMarks = max;
    }
  } else if (isClass12) {
    if (getVal('board_or_university')) updates.academicInfo!.class12.board = getVal('board_or_university')!;
    if (getVal('school_or_college')) updates.academicInfo!.class12.schoolName = getVal('school_or_college')!;
    if (getVal('roll_number')) updates.academicInfo!.class12.rollNumber = getVal('roll_number')!;
    if (getVal('passing_year')) {
      const year = parseInt(getVal('passing_year')!, 10);
      if (!isNaN(year)) updates.academicInfo!.class12.passingYear = year;
    }
    if (getVal('percentage')) {
      const pct = parseFloat(getVal('percentage')!.replace(/%/g, ''));
      if (!isNaN(pct)) updates.academicInfo!.class12.percentage = pct;
    }
    if (getVal('subjects')) {
      const subs = getVal('subjects')!.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
      if (subs.length > 0) updates.academicInfo!.class12.subjects = subs;
    }
  }

  return updates;
}
