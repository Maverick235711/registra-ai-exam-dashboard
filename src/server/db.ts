import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StudentProfile, DocumentRecord, ApplicationRecord, ExamItem, UserAccount } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../../data/registra_db.json');

export interface DatabaseSchema {
  users: UserAccount[];
  profiles: Record<string, StudentProfile>;
  documents: Record<string, DocumentRecord[]>;
  applications: Record<string, ApplicationRecord[]>;
  exams: ExamItem[];
}

const defaultExams: ExamItem[] = [
  {
    id: 'exam_jee_main',
    name: 'JEE Main 2027',
    fullName: 'Joint Entrance Examination (Main) Session 1',
    authority: 'National Testing Agency (NTA)',
    category: 'Engineering',
    description: 'National level entrance examination for admission into undergraduate engineering programs (B.Tech/B.Arch) at NITs, IIITs, and participating institutions, and screening for JEE Advanced.',
    eligibilitySummary: '10+2 passed with Physics & Mathematics as compulsory subjects along with Chemistry or CS. Minimum 75% marks in Class 12 for NIT/IIIT/CFTI admission (65% for SC/ST).',
    criteria: {
      minAgeYears: 16,
      maxAgeYears: 25,
      requiredStream: ['PCM', 'PCMB'],
      requiredSubjects: ['Physics', 'Mathematics'],
      minClass12Percentage: 75,
    },
    applicationOpenDate: '2026-11-01',
    applicationDeadline: '2026-12-05',
    admitCardDate: '2027-01-14',
    examDate: '2027-01-24',
    feeINR: {
      general: 1000,
      reserved: 500,
      female: 800,
    },
    officialWebsite: 'https://jeemain.nta.nic.in',
    popularCourses: ['Computer Science & Engineering', 'Electronics & Comm.', 'Electrical Engineering', 'Mechanical'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet', 'identity_proof'],
    status: 'Registration Open',
  },
  {
    id: 'exam_cuet_ug',
    name: 'CUET UG 2027',
    fullName: 'Common University Entrance Test (Undergraduate)',
    authority: 'National Testing Agency (NTA)',
    category: 'Undergraduate',
    description: 'Single window opportunity for seeking admission into all Central Universities, State Universities, and participating private institutions across India.',
    eligibilitySummary: 'Passed Class 12 or equivalent. No upper age bar. Candidates must choose domain subjects matching their desired university course requirements.',
    criteria: {
      minAgeYears: 16,
      minClass12Percentage: 50,
      allowedQualifications: ['Senior Secondary', '10+2', 'Diploma'],
    },
    applicationOpenDate: '2026-10-15',
    applicationDeadline: '2026-11-30',
    admitCardDate: '2027-04-20',
    examDate: '2027-05-15',
    feeINR: {
      general: 750,
      reserved: 400,
      female: 700,
    },
    officialWebsite: 'https://cuetug.nta.nic.in',
    popularCourses: ['B.Sc (Hons) Computer Science', 'B.A (Hons) Economics', 'B.Com (Hons)', 'Integrated B.Tech'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet', 'identity_proof'],
    status: 'Registration Open',
  },
  {
    id: 'exam_bitsat',
    name: 'BITSAT 2027',
    fullName: 'Birla Institute of Technology and Science Admission Test',
    authority: 'BITS Pilani',
    category: 'Engineering',
    description: 'Computer-based entrance test for integrated degree programs at BITS Pilani, Goa, and Hyderabad campuses.',
    eligibilitySummary: '10+2 passed with Physics, Chemistry, and Mathematics with minimum aggregate 75% marks in PCM and at least 60% in each subject.',
    criteria: {
      minAgeYears: 16,
      requiredStream: ['PCM', 'PCMB'],
      requiredSubjects: ['Physics', 'Chemistry', 'Mathematics'],
      minClass12Percentage: 75,
    },
    applicationOpenDate: '2026-11-05',
    applicationDeadline: '2026-12-18',
    admitCardDate: '2027-05-02',
    examDate: '2027-05-20',
    feeINR: {
      general: 3400,
      reserved: 3400,
      female: 2900,
    },
    officialWebsite: 'https://www.bitsadmission.com',
    popularCourses: ['B.E. Computer Science', 'B.E. Electrical & Electronics', 'M.Sc. Economics'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet'],
    status: 'Registration Open',
  },
  {
    id: 'exam_gate',
    name: 'GATE 2027',
    fullName: 'Graduate Aptitude Test in Engineering',
    authority: 'Indian Institute of Technology (IIT Roorkee)',
    category: 'Engineering',
    description: 'National examination testing comprehensive understanding of undergraduate subjects in engineering and technology for M.Tech admissions and PSU recruitments.',
    eligibilitySummary: 'Candidates who have completed any undergraduate degree program in Engineering / Technology / Science or in 3rd or higher year of undergraduate program.',
    criteria: {
      minAgeYears: 20,
      allowedQualifications: ['B.Tech', 'B.E.', 'MCA', 'M.Sc.', 'B.Sc. (Final Year)'],
    },
    applicationOpenDate: '2026-08-25',
    applicationDeadline: '2026-11-22',
    admitCardDate: '2027-01-08',
    examDate: '2027-02-06',
    feeINR: {
      general: 1800,
      reserved: 900,
      female: 900,
    },
    officialWebsite: 'https://gate2027.iitr.ac.in',
    popularCourses: ['Computer Science & IT (CS)', 'Data Science & AI (DA)', 'Electrical Engineering (EE)'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'identity_proof', 'educational_certificate'],
    status: 'Registration Open',
  },
  {
    id: 'exam_neet_ug',
    name: 'NEET UG 2027',
    fullName: 'National Eligibility cum Entrance Test (UG)',
    authority: 'National Testing Agency (NTA)',
    category: 'Medical',
    description: 'Single national entrance test for admission into undergraduate medical courses (MBBS/BDS/BAMS/BSMS/BUMS/BHMS) across all medical institutions in India.',
    eligibilitySummary: 'Candidates must have passed 10+2 with Physics, Chemistry, Biology/Biotechnology and English as core subjects. Minimum 50% marks in PCB aggregate (40% for SC/ST/OBC).',
    criteria: {
      minAgeYears: 17,
      requiredStream: ['PCB', 'PCMB'],
      requiredSubjects: ['Physics', 'Chemistry', 'Biology'],
      minClass12Percentage: 50,
    },
    applicationOpenDate: '2027-01-10',
    applicationDeadline: '2027-03-10',
    admitCardDate: '2027-04-28',
    examDate: '2027-05-04',
    feeINR: {
      general: 1700,
      reserved: 1000,
      female: 1700,
    },
    officialWebsite: 'https://neet.nta.nic.in',
    popularCourses: ['MBBS', 'BDS', 'BAMS', 'B.V.Sc & AH'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet', 'identity_proof', 'domicile_certificate'],
    status: 'Upcoming',
  },
  {
    id: 'exam_cat',
    name: 'CAT 2026',
    fullName: 'Common Admission Test',
    authority: 'Indian Institute of Management (IIM Kozhikode)',
    category: 'Management',
    description: 'National computer-based test conducted for admission into postgraduate business administration programs at 21 IIMs and over 1,200 non-IIM B-schools.',
    eligibilitySummary: 'Bachelor Degree with at least 50% marks or equivalent CGPA (45% for SC/ST/PwD). Candidates appearing for the final year of bachelor degree are also eligible.',
    criteria: {
      minAgeYears: 20,
      allowedQualifications: ['Bachelor Degree', 'Final Year Undergraduate'],
    },
    applicationOpenDate: '2026-08-01',
    applicationDeadline: '2026-09-20',
    admitCardDate: '2026-11-05',
    examDate: '2026-11-29',
    feeINR: {
      general: 2400,
      reserved: 1200,
    },
    officialWebsite: 'https://iimcat.ac.in',
    popularCourses: ['MBA (General)', 'Executive MBA', 'PGDM in Business Analytics'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'class12_marksheet', 'educational_certificate', 'identity_proof'],
    status: 'Closed',
  },
  {
    id: 'exam_upsc_cse',
    name: 'UPSC CSE 2027',
    fullName: 'Civil Services Examination (Preliminary)',
    authority: 'Union Public Service Commission (UPSC)',
    category: 'Civil Services',
    description: 'Premier national examination conducted by UPSC for recruitment to higher civil services of the Government of India, including IAS, IPS, and IFS.',
    eligibilitySummary: 'Candidate must hold a Graduate degree of any recognized university. Age between 21 and 32 years on 1st August of exam year (relaxations for OBC/SC/ST).',
    criteria: {
      minAgeYears: 21,
      maxAgeYears: 32,
      allowedQualifications: ['Graduate Degree', 'Final Year Graduate'],
    },
    applicationOpenDate: '2027-01-20',
    applicationDeadline: '2027-02-18',
    admitCardDate: '2027-05-10',
    examDate: '2027-05-23',
    feeINR: {
      general: 100,
      reserved: 0,
      female: 0,
    },
    officialWebsite: 'https://upsc.gov.in',
    popularCourses: ['Indian Administrative Service (IAS)', 'Indian Police Service (IPS)', 'Indian Foreign Service (IFS)'],
    documentsRequired: ['photograph', 'signature', 'identity_proof', 'educational_certificate'],
    status: 'Upcoming',
  },
  {
    id: 'exam_ssc_cgl',
    name: 'SSC CGL 2026',
    fullName: 'Combined Graduate Level Examination',
    authority: 'Staff Selection Commission (SSC)',
    category: 'Government & Banking',
    description: 'National recruitment examination conducted to recruit staff to various Group B and Group C non-technical posts in top ministries and departments of the Government of India.',
    eligibilitySummary: 'Bachelor degree from a recognized University or Institute. Age between 18 and 30 years for most inspector/officer cadre posts.',
    criteria: {
      minAgeYears: 18,
      maxAgeYears: 30,
      allowedQualifications: ['Bachelor Degree', 'Graduation in any discipline'],
    },
    applicationOpenDate: '2026-10-20',
    applicationDeadline: '2026-11-28',
    admitCardDate: '2026-12-05',
    examDate: '2026-12-15',
    feeINR: {
      general: 100,
      reserved: 0,
      female: 0,
    },
    officialWebsite: 'https://ssc.gov.in',
    popularCourses: ['Assistant Section Officer', 'Income Tax Inspector', 'Central Excise Inspector', 'Auditor'],
    documentsRequired: ['photograph', 'signature', 'class10_marksheet', 'identity_proof', 'educational_certificate'],
    status: 'Registration Open',
  },
];

// Seed Data for initial users
const defaultUsers: UserAccount[] = [
  {
    id: 'usr_26ucc005',
    email: '26ucc005@cce.lnmiit.ac.in',
    fullName: 'Aditya K. Sharma',
    avatarUrl: '',
    isVerified: false,
    role: 'Undergraduate Candidate',
    institution: 'The LNM Institute of Information Technology (LNMIIT)',
    createdAt: '2026-10-12T08:30:00.000Z',
  },
  {
    id: 'usr_fresh_applicant',
    email: 'new.applicant@registra.edu',
    fullName: 'Priya Verma',
    avatarUrl: '',
    isVerified: false,
    role: 'Prospective Applicant',
    institution: 'National Model Senior Secondary School',
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'usr_verified_applicant',
    email: 'ananya.sen@iitd.ac.in',
    fullName: 'Ananya Sen',
    avatarUrl: '',
    isVerified: true,
    role: 'Verified Candidate (CBSE / NTA Cleared)',
    institution: 'Indian Institute of Technology Delhi',
    createdAt: '2026-09-15T14:20:00.000Z',
  },
];

const defaultProfiles: Record<string, StudentProfile> = {
  // User 1: 26ucc005@cce.lnmiit.ac.in - Realistic partially completed profile (not 100%!)
  usr_26ucc005: {
    id: 'usr_26ucc005',
    personalInfo: {
      fullName: 'Aditya K. Sharma',
      dob: '2006-08-14',
      gender: 'Male',
      nationality: 'Indian',
      category: 'General',
      email: '26ucc005@cce.lnmiit.ac.in',
      phoneNumber: '+91 98290 12345',
      altPhoneNumber: '+91 94140 54321',
      address: {
        street: 'Rupa ki Nangal, Post-Sumel, Via-Jamdoli',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302031',
        country: 'India',
      },
      fathersName: 'Dr. Rajesh Sharma',
      mothersName: '', // Missing field! Prevents fake 100%
    },
    academicInfo: {
      class10: {
        board: 'CBSE',
        schoolName: 'Jaipur Public School',
        passingYear: 2022,
        percentage: 91.2,
        rollNumber: 'CBSE-10-554219',
        maxMarks: 500,
        obtainedMarks: 456,
      },
      class12: {
        status: 'Passed',
        board: 'CBSE',
        schoolName: 'Jaipur Public School',
        passingYear: 2024,
        percentage: 86.4,
        rollNumber: 'CBSE-12-663812',
        stream: 'PCM',
        subjects: ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English'],
      },
      currentQualification: 'Senior Secondary (10+2 Passed)',
      institution: 'The LNM Institute of Information Technology (LNMIIT)',
      cgpaOrPercentage: 86.4,
      yearOfGraduation: 2024,
    },
  },

  // User 2: Fresh applicant with missing academic & document details
  usr_fresh_applicant: {
    id: 'usr_fresh_applicant',
    personalInfo: {
      fullName: 'Priya Verma',
      dob: '2007-02-19',
      gender: 'Female',
      nationality: 'Indian',
      category: 'General',
      email: 'new.applicant@registra.edu',
      phoneNumber: '+91 91234 56789',
      address: {
        street: '',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pincode: '',
        country: 'India',
      },
      fathersName: '',
      mothersName: '',
    },
    academicInfo: {
      class10: {
        board: '',
        schoolName: '',
        passingYear: 2023,
        percentage: 0,
        rollNumber: '',
      },
      class12: {
        status: 'Appearing',
        board: 'CBSE',
        schoolName: '',
        passingYear: 2025,
        percentage: 0,
        rollNumber: '',
        stream: 'PCM',
        subjects: [],
      },
      currentQualification: 'Senior Secondary (Class 12 Appearing)',
      institution: '',
    },
  },

  // User 3: Ananya Sen - 100% Fully completed & verified
  usr_verified_applicant: {
    id: 'usr_verified_applicant',
    personalInfo: {
      fullName: 'Ananya Sen',
      dob: '2005-11-20',
      gender: 'Female',
      nationality: 'Indian',
      category: 'General',
      email: 'ananya.sen@iitd.ac.in',
      phoneNumber: '+91 99887 76655',
      altPhoneNumber: '+91 98765 11223',
      address: {
        street: 'IIT Campus, Hauz Khas',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        country: 'India',
      },
      fathersName: 'Prof. Subhash Sen',
      mothersName: 'Dr. Meenakshi Sen',
    },
    academicInfo: {
      class10: {
        board: 'ICSE',
        schoolName: 'Loreto Convent',
        passingYear: 2021,
        percentage: 97.2,
        rollNumber: 'ICSE-2021-98124',
        maxMarks: 600,
        obtainedMarks: 583,
      },
      class12: {
        status: 'Passed',
        board: 'CBSE',
        schoolName: 'Delhi Public School, R.K. Puram',
        passingYear: 2023,
        percentage: 96.8,
        rollNumber: 'CBSE-12-887102',
        stream: 'PCM',
        subjects: ['Physics', 'Chemistry', 'Mathematics', 'Economics', 'English Core'],
      },
      currentQualification: 'Undergraduate B.Tech Computer Science (3rd Year)',
      institution: 'Indian Institute of Technology Delhi',
      cgpaOrPercentage: 9.42,
      yearOfGraduation: 2027,
    },
  },
};

const defaultDocuments: Record<string, DocumentRecord[]> = {
  // User 1 documents: 4 uploaded, 1 missing signature, 1 optional category
  usr_26ucc005: [
    {
      id: 'doc_c10_u1',
      type: 'class10_marksheet',
      title: 'Class 10 Marksheet & Passing Certificate',
      description: 'Central Board of Secondary Education (CBSE) 2022 Examination',
      requiredFor: ['JEE Main', 'NEET UG', 'CUET UG', 'BITSAT', 'UPSC', 'GATE'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_marksheet_1794130574483.jpg',
      fileName: 'CBSE_Class10_Marksheet_AdityaSharma.pdf',
      fileSize: '1.4 MB',
      uploadedAt: '2026-10-14',
      confidenceScore: 99.4,
      extractedData: {
        'Board Name': 'Central Board of Secondary Education',
        'Roll Number': 'CBSE-10-554219',
        'Candidate Name': 'Aditya K. Sharma',
        'Passing Year': '2022',
        'Total Marks': '456 / 500',
        'Aggregate Percentage': '91.2%',
      },
    },
    {
      id: 'doc_c12_u1',
      type: 'class12_marksheet',
      title: 'Class 12 Marksheet & Senior Certificate',
      description: 'Senior School Certificate Examination (Science Stream - PCM)',
      requiredFor: ['JEE Main', 'NEET UG', 'CUET UG', 'BITSAT'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_marksheet_1794130574483.jpg',
      fileName: 'CBSE_Class12_SeniorMarksheet_AdityaSharma.pdf',
      fileSize: '1.8 MB',
      uploadedAt: '2026-10-14',
      confidenceScore: 98.8,
      extractedData: {
        'Board Name': 'CBSE Delhi',
        'Roll Number': 'CBSE-12-663812',
        'Candidate Name': 'Aditya K. Sharma',
        'Stream': 'Science (Physics, Chemistry, Maths)',
        'Passing Year': '2024',
        'Aggregate Percentage': '86.4%',
      },
    },
    {
      id: 'doc_photo_u1',
      type: 'photograph',
      title: 'Passport Size Photograph (Recent)',
      description: 'White background, 80% face coverage, studio lit without goggles/cap',
      requiredFor: ['All Competitive Exams'],
      status: 'Uploaded',
      fileUrl: '',
      fileName: 'Aditya_Sharma_Photograph_Passport.jpg',
      fileSize: '210 KB',
      uploadedAt: '2026-10-18',
      confidenceScore: 95.0,
      extractedData: {
        'Dimensions': '3.5cm x 4.5cm',
        'Resolution': '300 DPI',
        'Background': 'Plain Neutral White',
      },
    },
    {
      id: 'doc_id_u1',
      type: 'identity_proof',
      title: 'Government Identity Proof (Aadhaar / Passport)',
      description: 'Unique Identification Authority of India (UIDAI) e-Aadhaar',
      requiredFor: ['All Government & Entrance Exams'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_id_1794130574538.jpg',
      fileName: 'UIDAI_eAadhaar_Aditya_Masked.pdf',
      fileSize: '820 KB',
      uploadedAt: '2026-10-20',
      confidenceScore: 99.2,
      extractedData: {
        'ID Type': 'Aadhaar Card (UIDAI)',
        'Masked ID Number': 'XXXX-XXXX-3419',
        'Name Match': '100% Match (Aditya K. Sharma)',
      },
    },
    {
      id: 'doc_sig_u1',
      type: 'signature',
      title: 'Specimen Signature (Black Ink on White Paper)',
      description: 'Uncropped digital specimen on plain unruled white background',
      requiredFor: ['All Competitive Exams'],
      status: 'Missing',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      uploadedAt: '',
    },
    {
      id: 'doc_cat_u1',
      type: 'category_certificate',
      title: 'Category Certificate (if applicable)',
      description: 'Competent Authority issued certificate for reservation benefit',
      requiredFor: ['OBC-NCL', 'SC', 'ST', 'EWS'],
      status: 'Pending Review',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      uploadedAt: '',
    },
  ],

  // User 2: Fresh applicant has 0 uploaded documents
  usr_fresh_applicant: [
    {
      id: 'doc_c10_u2',
      type: 'class10_marksheet',
      title: 'Class 10 Marksheet & Passing Certificate',
      description: 'Secondary School Marksheet',
      requiredFor: ['All Competitive Exams'],
      status: 'Missing',
    },
    {
      id: 'doc_c12_u2',
      type: 'class12_marksheet',
      title: 'Class 12 Marksheet & Senior Certificate',
      description: 'Senior School Examination Certificate',
      requiredFor: ['Engineering', 'Medical', 'Undergraduate'],
      status: 'Missing',
    },
    {
      id: 'doc_photo_u2',
      type: 'photograph',
      title: 'Passport Size Photograph (Recent)',
      description: 'White background, formal portrait',
      requiredFor: ['All Competitive Exams'],
      status: 'Missing',
    },
    {
      id: 'doc_sig_u2',
      type: 'signature',
      title: 'Specimen Signature',
      description: 'Signature in black or dark blue ink',
      requiredFor: ['All Competitive Exams'],
      status: 'Missing',
    },
    {
      id: 'doc_id_u2',
      type: 'identity_proof',
      title: 'Government Identity Proof',
      description: 'Aadhaar, Passport or Voter ID',
      requiredFor: ['All Competitive Exams'],
      status: 'Missing',
    },
  ],

  // User 3: Ananya Sen has all 5 mandatory docs verified
  usr_verified_applicant: [
    {
      id: 'doc_c10_u3',
      type: 'class10_marksheet',
      title: 'Class 10 Marksheet & Passing Certificate',
      description: 'ICSE Board 2021 Passing Certificate',
      requiredFor: ['All Competitive Exams'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_marksheet_1794130574483.jpg',
      fileName: 'ICSE_Class10_Marksheet_AnanyaSen.pdf',
      fileSize: '1.2 MB',
      uploadedAt: '2026-09-18',
      confidenceScore: 99.8,
    },
    {
      id: 'doc_c12_u3',
      type: 'class12_marksheet',
      title: 'Class 12 Marksheet & Senior Certificate',
      description: 'CBSE Senior Secondary Certificate',
      requiredFor: ['Engineering', 'Medical', 'Undergraduate'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_marksheet_1794130574483.jpg',
      fileName: 'CBSE_Class12_Marksheet_AnanyaSen.pdf',
      fileSize: '1.5 MB',
      uploadedAt: '2026-09-18',
      confidenceScore: 99.5,
    },
    {
      id: 'doc_photo_u3',
      type: 'photograph',
      title: 'Passport Size Photograph',
      description: 'Recent studio photograph',
      requiredFor: ['All Competitive Exams'],
      status: 'Verified',
      fileUrl: '/src/assets/images/avatar_student_aryan_1794130573701.jpg',
      fileName: 'AnanyaSen_Studio_Passport_Photo.jpg',
      fileSize: '180 KB',
      uploadedAt: '2026-09-20',
      confidenceScore: 99.9,
    },
    {
      id: 'doc_sig_u3',
      type: 'signature',
      title: 'Specimen Signature',
      description: 'Digital specimen signature',
      requiredFor: ['All Competitive Exams'],
      status: 'Verified',
      fileUrl: '',
      fileName: 'AnanyaSen_Signature.png',
      fileSize: '85 KB',
      uploadedAt: '2026-09-20',
      confidenceScore: 98.4,
    },
    {
      id: 'doc_id_u3',
      type: 'identity_proof',
      title: 'Government Identity Proof (Aadhaar)',
      description: 'UIDAI Verified Digital ID',
      requiredFor: ['All Competitive Exams'],
      status: 'Verified',
      fileUrl: '/src/assets/images/document_sample_id_1794130574538.jpg',
      fileName: 'UIDAI_Aadhaar_AnanyaSen.pdf',
      fileSize: '790 KB',
      uploadedAt: '2026-09-22',
      confidenceScore: 99.9,
    },
  ],
};

const defaultApplications: Record<string, ApplicationRecord[]> = {
  // User 1 has 2 applications (1 In Progress, 1 Pending)
  usr_26ucc005: [
    {
      id: 'app_jee_u1',
      examId: 'exam_jee_main',
      examName: 'JEE Main 2027 (Session 1)',
      authority: 'National Testing Agency',
      status: 'In Progress',
      progressPercent: 78,
      lastUpdated: 'Today at 09:40 AM',
      deadline: '2026-12-05',
      missingFields: ["Mother's Full Name", 'Specimen Signature'],
      mappedFieldsCount: 22,
      totalFieldsCount: 25,
      officialPortalUrl: 'https://jeemain.nta.nic.in',
    },
    {
      id: 'app_bitsat_u1',
      examId: 'exam_bitsat',
      examName: 'BITSAT 2027',
      authority: 'BITS Pilani',
      status: 'Pending',
      progressPercent: 65,
      lastUpdated: '3 days ago',
      deadline: '2026-12-18',
      missingFields: ['Specimen Signature Upload', 'Campus Choice 3'],
      mappedFieldsCount: 20,
      totalFieldsCount: 24,
      officialPortalUrl: 'https://www.bitsadmission.com',
    },
  ],

  // User 2: Fresh applicant has 0 applications
  usr_fresh_applicant: [],

  // User 3: Ananya Sen has 3 applications (1 Completed, 2 In Progress)
  usr_verified_applicant: [
    {
      id: 'app_gate_u3',
      examId: 'exam_gate',
      examName: 'GATE 2027 (Computer Science)',
      authority: 'IIT Roorkee',
      status: 'Completed',
      progressPercent: 100,
      lastUpdated: 'Yesterday at 04:15 PM',
      deadline: '2026-11-22',
      applicationNumber: 'GATE27-CS-892104',
      missingFields: [],
      mappedFieldsCount: 26,
      totalFieldsCount: 26,
      submittedAt: '2026-11-06T15:30:00Z',
      officialPortalUrl: 'https://gate2027.iitr.ac.in',
    },
    {
      id: 'app_cuet_u3',
      examId: 'exam_cuet_ug',
      examName: 'CUET UG 2027',
      authority: 'National Testing Agency',
      status: 'In Progress',
      progressPercent: 92,
      lastUpdated: '2 days ago',
      deadline: '2026-11-30',
      missingFields: ['Subject Choice 4'],
      mappedFieldsCount: 27,
      totalFieldsCount: 28,
      officialPortalUrl: 'https://cuetug.nta.nic.in',
    },
  ],
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[Database] Could not read existing database file, initializing defaults:', err);
    }

    const initialDb: DatabaseSchema = {
      users: defaultUsers,
      profiles: defaultProfiles,
      documents: defaultDocuments,
      applications: defaultApplications,
      exams: defaultExams,
    };
    this.saveDatabase(initialDb);
    return initialDb;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Error saving database file:', err);
    }
  }

  // --- Users ---
  getUsers(): UserAccount[] {
    return this.data.users;
  }

  getUserById(userId: string): UserAccount | undefined {
    return this.data.users.find(u => u.id === userId);
  }

  getUserByEmail(email: string): UserAccount | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(account: UserAccount, initialProfile?: StudentProfile): UserAccount {
    this.data.users.push(account);
    const blankProfile: StudentProfile = initialProfile || {
      id: account.id,
      personalInfo: {
        fullName: account.fullName,
        dob: '',
        gender: 'Prefer not to say',
        nationality: 'Indian',
        category: 'General',
        email: account.email,
        phoneNumber: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
      },
      academicInfo: {
        class10: { board: '', schoolName: '', passingYear: new Date().getFullYear() - 2, percentage: 0, rollNumber: '' },
        class12: { status: 'Passed', board: '', schoolName: '', passingYear: new Date().getFullYear(), percentage: 0, rollNumber: '', stream: 'PCM', subjects: [] },
        currentQualification: 'Secondary School',
        institution: '',
      },
    };
    this.data.profiles[account.id] = blankProfile;
    this.data.documents[account.id] = [];
    this.data.applications[account.id] = [];
    this.saveDatabase();
    return account;
  }

  // --- Profile ---
  getProfile(userId: string): StudentProfile | undefined {
    return this.data.profiles[userId];
  }

  updateProfile(userId: string, updates: Partial<StudentProfile>): StudentProfile {
    const existing = this.data.profiles[userId];
    if (!existing) {
      throw new Error(`Profile not found for user: ${userId}`);
    }

    const updated: StudentProfile = {
      ...existing,
      ...updates,
      personalInfo: {
        ...existing.personalInfo,
        ...(updates.personalInfo || {}),
        address: {
          ...existing.personalInfo.address,
          ...(updates.personalInfo?.address || {}),
        },
      },
      academicInfo: {
        ...existing.academicInfo,
        ...(updates.academicInfo || {}),
        class10: {
          ...existing.academicInfo.class10,
          ...(updates.academicInfo?.class10 || {}),
        },
        class12: {
          ...existing.academicInfo.class12,
          ...(updates.academicInfo?.class12 || {}),
        },
      },
    };

    this.data.profiles[userId] = updated;

    // Sync user's account name if updated
    const user = this.data.users.find(u => u.id === userId);
    if (user && updates.personalInfo?.fullName) {
      user.fullName = updates.personalInfo.fullName;
    }

    this.saveDatabase();
    return updated;
  }

  // --- Documents ---
  getDocuments(userId: string): DocumentRecord[] {
    return this.data.documents[userId] || [];
  }

  updateDocument(userId: string, docId: string, updates: Partial<DocumentRecord>): DocumentRecord[] {
    if (!this.data.documents[userId]) {
      this.data.documents[userId] = [];
    }
    const docs = this.data.documents[userId];
    const index = docs.findIndex(d => d.id === docId);
    if (index >= 0) {
      docs[index] = { ...docs[index], ...updates };
    } else {
      docs.push({
        id: docId,
        type: updates.type || 'class12_marksheet',
        title: updates.title || 'Uploaded Document',
        description: updates.description || 'Uploaded examination document',
        requiredFor: updates.requiredFor || ['All Competitive Exams'],
        status: updates.status || 'Uploaded',
        ...updates,
      });
    }
    this.saveDatabase();
    return docs;
  }

  deleteDocument(userId: string, docId: string): DocumentRecord[] {
    if (this.data.documents[userId]) {
      this.data.documents[userId] = this.data.documents[userId].filter(d => d.id !== docId);
      this.saveDatabase();
    }
    return this.data.documents[userId] || [];
  }

  // --- Applications ---
  getApplications(userId: string): ApplicationRecord[] {
    return this.data.applications[userId] || [];
  }

  saveApplication(userId: string, application: Partial<ApplicationRecord> & { examId: string }): ApplicationRecord {
    if (!this.data.applications[userId]) {
      this.data.applications[userId] = [];
    }
    const apps = this.data.applications[userId];
    const index = apps.findIndex(a => a.id === application.id || a.examId === application.examId);
    
    const exam = this.data.exams.find(e => e.id === application.examId);
    const examName = exam?.name || application.examName || 'Examination Application';
    const authority = exam?.authority || application.authority || 'Exam Conducting Authority';
    const deadline = exam?.applicationDeadline || application.deadline || '2026-12-31';

    let savedApp: ApplicationRecord;
    if (index >= 0) {
      savedApp = {
        ...apps[index],
        ...application,
        lastUpdated: 'Just now',
      };
      apps[index] = savedApp;
    } else {
      savedApp = {
        id: application.id || `app_${application.examId}_${Date.now()}`,
        examId: application.examId,
        examName,
        authority,
        status: application.status || 'In Progress',
        progressPercent: application.progressPercent ?? 50,
        lastUpdated: 'Just now',
        deadline,
        missingFields: application.missingFields || [],
        mappedFieldsCount: application.mappedFieldsCount ?? 15,
        totalFieldsCount: application.totalFieldsCount ?? 20,
        officialPortalUrl: exam?.officialWebsite || 'https://nta.nic.in',
      };
      apps.push(savedApp);
    }
    this.saveDatabase();
    return savedApp;
  }

  // --- Exams ---
  getExams(): ExamItem[] {
    return this.data.exams;
  }

  getExamById(examId: string): ExamItem | undefined {
    return this.data.exams.find(e => e.id === examId);
  }
}

export const db = new DatabaseManager();
