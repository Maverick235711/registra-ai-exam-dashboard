export type ExamCategory = 'Engineering' | 'Medical' | 'Management' | 'Civil Services' | 'Undergraduate' | 'Government & Banking';

export type ApplicationStatus = 'Completed' | 'In Progress' | 'Pending' | 'Needs Review';

export type DocumentType = 
  | 'class10_marksheet'
  | 'class12_marksheet'
  | 'aadhaar_card'
  | 'passport'
  | 'category_certificate'
  | 'domicile_certificate'
  | 'income_certificate'
  | 'transfer_certificate'
  | 'educational_certificate'
  | 'photograph'
  | 'signature'
  | 'identity_proof';

export type FieldConfidenceStatus = 'high' | 'review' | 'low' | 'missing';

export interface ExtractedFieldData {
  value: string | null;
  confidence: number;
  status: FieldConfidenceStatus;
}

export interface GeminiOcrResponse {
  document_type: string;
  extraction_status: 'success' | 'warning' | 'error';
  extracted_data: Record<string, ExtractedFieldData>;
  warnings: string[];
  requires_manual_review: boolean;
  error?: string;
  metadata?: {
    model: string;
    processingTimeMs: number;
    fileSizeKB: number;
    fileName: string;
  };
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  title: string;
  description: string;
  requiredFor: string[];
  status: 'Verified' | 'Pending Review' | 'Uploaded' | 'Missing';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  extractedData?: Record<string, string | number>;
  detailedExtraction?: Record<string, ExtractedFieldData>;
  confidenceScore?: number;
}

export interface StudentProfile {
  id: string;
  personalInfo: {
    fullName: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    nationality: string;
    category: 'General' | 'OBC-NCL' | 'SC' | 'ST' | 'EWS';
    email: string;
    phoneNumber: string;
    altPhoneNumber?: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
    fathersName?: string;
    mothersName?: string;
  };
  academicInfo: {
    class10: {
      board: string;
      schoolName: string;
      passingYear: number;
      percentage: number;
      rollNumber: string;
      maxMarks?: number;
      obtainedMarks?: number;
    };
    class12: {
      status: 'Passed' | 'Appearing';
      board: string;
      schoolName: string;
      passingYear: number;
      percentage: number;
      rollNumber: string;
      stream: 'PCM' | 'PCB' | 'PCMB' | 'Commerce' | 'Arts' | 'Other';
      subjects: string[];
    };
    currentQualification: string;
    institution: string;
    cgpaOrPercentage?: number;
    yearOfGraduation?: number;
  };
}

export interface ExamCriteria {
  minAgeYears?: number;
  maxAgeYears?: number;
  requiredStream?: string[];
  requiredSubjects?: string[];
  minClass12Percentage?: number;
  minClass10Percentage?: number;
  allowedCategories?: string[];
  allowedQualifications?: string[];
}

export interface ExamItem {
  id: string;
  name: string;
  fullName: string;
  authority: string;
  category: ExamCategory;
  description: string;
  eligibilitySummary: string;
  criteria: ExamCriteria;
  applicationOpenDate: string;
  applicationDeadline: string;
  admitCardDate: string;
  examDate: string;
  feeINR: {
    general: number;
    reserved: number;
    female?: number;
  };
  officialWebsite: string;
  popularCourses: string[];
  documentsRequired: DocumentType[];
  status: 'Registration Open' | 'Upcoming' | 'Closed';
}

export interface ApplicationRecord {
  id: string;
  examId: string;
  examName: string;
  authority: string;
  status: ApplicationStatus;
  progressPercent: number;
  lastUpdated: string;
  deadline: string;
  applicationNumber?: string;
  missingFields: string[];
  mappedFieldsCount: number;
  totalFieldsCount: number;
  submittedAt?: string;
  officialPortalUrl: string;
}

export interface EligibilityResult {
  examId: string;
  examName: string;
  isEligible: boolean;
  scorePercentage: number;
  checks: {
    criteriaName: string;
    met: boolean;
    expected: string;
    actual: string;
    notes?: string;
  }[];
  missingInfo: string[];
  aiExplanation: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  actions?: {
    label: string;
    actionType: 'NAVIGATE' | 'CHECK_ELIGIBILITY' | 'START_WORKFLOW' | 'VIEW_DOCS';
    payload?: string;
  }[];
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isVerified: boolean;
  role?: string;
  institution?: string;
  createdAt: string;
}

export interface DashboardStats {
  profileCompletion: {
    overall: number;
    sections: {
      personal: { completed: boolean; score: number; filledCount: number; totalCount: number };
      academic: { completed: boolean; score: number; filledCount: number; totalCount: number };
      documents: { completed: boolean; score: number; uploadedCount: number; requiredCount: number };
      contact: { completed: boolean; score: number; filledCount: number; totalCount: number };
    };
  };
  examsAvailable: {
    total: number;
    activeRegistration: number;
    eligibleCount: number;
  };
  applicationsInProgress: {
    total: number;
    inProgress: number;
    completed: number;
    pending: number;
    needsReview: number;
  };
  upcomingDeadlines: {
    count: number;
    nearestDaysRemaining: number | null;
    nearestExamName: string | null;
    nearestDeadline: string | null;
    items: Array<{
      examId: string;
      name: string;
      authority: string;
      deadline: string;
      daysRemaining: number;
      isUrgent: boolean;
    }>;
  };
  fieldReuseAnalytics: Array<{
    examId: string;
    name: string;
    autoMapped: number;
    manualReview: number;
    savedMins: number;
    percentAuto: number;
  }>;
}

