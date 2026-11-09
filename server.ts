import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/server/db.ts';
import { calculateProfileCompletion, getDaysRemaining, evaluateEligibility, mapProfileToExamFields } from './src/utils/eligibilityEngine.ts';
import { StudentProfile, DocumentRecord, ApplicationRecord, UserAccount } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();

// Enable generous JSON body limit for document images & PDFs (up to 30MB)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to resolve authenticated user from headers, cookies, or queries
function getUserId(req: Request): string {
  const headerId = req.headers['x-user-id'];
  if (typeof headerId === 'string' && headerId.trim()) return headerId.trim();
  const queryId = req.query.userId;
  if (typeof queryId === 'string' && queryId.trim()) return queryId.trim();
  return 'usr_26ucc005';
}

// Health and Status Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    service: 'REGISTRA OCR & Examination Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: hasKey,
    model: 'gemini-3.8-flash',
  });
});

// 1. Auth & Session endpoints
app.get('/api/auth/me', (req: Request, res: Response) => {
  const userId = getUserId(req);
  let user = db.getUserById(userId);
  if (!user) {
    user = db.getUserById('usr_26ucc005') || db.getUsers()[0];
  }
  const profile = user ? db.getProfile(user.id) : null;
  res.json({ user, profile });
});

app.get('/api/auth/users', (req: Request, res: Response) => {
  res.json({ users: db.getUsers() });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }
  let user = db.getUserByEmail(email.trim());
  if (!user) {
    // Auto-create new user account
    const id = `usr_${Date.now()}`;
    const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    user = db.createUser({
      id,
      email: email.trim(),
      fullName,
      avatarUrl: '',
      isVerified: false,
      role: 'Prospective Applicant',
      createdAt: new Date().toISOString(),
    });
  }
  const profile = db.getProfile(user.id);
  res.json({ user, profile });
});

app.post('/api/auth/switch', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const profile = db.getProfile(user.id);
  res.json({ user, profile });
});

// 2. User Profile endpoints
app.get('/api/user/profile', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const profile = db.getProfile(userId);
  const user = db.getUserById(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ profile, user });
});

app.put('/api/user/profile', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const updates = req.body.profile || req.body;
  try {
    const updated = db.updateProfile(userId, updates);
    const user = db.getUserById(userId);
    res.json({ profile: updated, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. User Documents endpoints
app.get('/api/user/documents', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const documents = db.getDocuments(userId);
  res.json({ documents });
});

app.post('/api/user/documents', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { docId, updates } = req.body;
  if (!docId) {
    res.status(400).json({ error: 'docId is required' });
    return;
  }
  const documents = db.updateDocument(userId, docId, updates || {});
  res.json({ documents });
});

app.delete('/api/user/documents/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const docId = req.params.id;
  const documents = db.deleteDocument(userId, docId);
  res.json({ documents });
});

// 4. User Applications endpoints
app.get('/api/user/applications', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const applications = db.getApplications(userId);
  res.json({ applications });
});

app.post('/api/user/applications', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appData = req.body.application || req.body;
  if (!appData?.examId) {
    res.status(400).json({ error: 'examId is required' });
    return;
  }
  const saved = db.saveApplication(userId, appData);
  const applications = db.getApplications(userId);
  res.json({ application: saved, applications });
});

// 5. Competitive Exams database
app.get('/api/exams', (req: Request, res: Response) => {
  const exams = db.getExams();
  res.json({ exams });
});

// 6. Dynamic Dashboard Stats (ALL COMPUTED REAL-TIME FOR THE AUTHENTICATED USER)
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const user = db.getUserById(userId);
  const profile = db.getProfile(userId);
  const documents = db.getDocuments(userId);
  const applications = db.getApplications(userId);
  const exams = db.getExams();

  if (!user || !profile) {
    res.status(404).json({ error: 'User or profile not found' });
    return;
  }

  // Calculate dynamic profile completion strictly from user's actual profile
  const profileCompletion = calculateProfileCompletion(profile, documents);

  // Calculate dynamic exams availability & eligibility
  const nowStr = new Date().toISOString().split('T')[0];
  const activeExams = exams.filter(e => e.status === 'Registration Open');
  const eligibleExams = exams.filter(e => evaluateEligibility(profile, e, nowStr).isEligible);

  // Calculate dynamic applications progress
  const inProgressApps = applications.filter(a => a.status === 'In Progress');
  const completedApps = applications.filter(a => a.status === 'Completed');
  const pendingApps = applications.filter(a => a.status === 'Pending');
  const needsReviewApps = applications.filter(a => a.status === 'Needs Review');

  // Calculate dynamic upcoming deadlines
  const upcomingExams = exams
    .map(e => {
      const days = getDaysRemaining(e.applicationDeadline, nowStr);
      return {
        examId: e.id,
        name: e.name,
        authority: e.authority,
        deadline: e.applicationDeadline,
        daysRemaining: days,
        isUrgent: days >= 0 && days <= 20,
      };
    })
    .filter(e => e.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const nearest = upcomingExams[0] || null;

  // Calculate dynamic field reuse analytics comparing actual user data against exam requirements
  const fieldReuseAnalytics = exams.slice(0, 4).map(exam => {
    const categories = mapProfileToExamFields(profile, exam.name);
    const allFields = categories.flatMap(c => c.fields);
    const autoMapped = allFields.filter(f => f.status === 'Auto-Mapped' || f.status === 'Verified').length;
    const manualReview = allFields.filter(f => f.status === 'Missing').length;
    const total = allFields.length;
    const percentAuto = total > 0 ? Math.round((autoMapped / total) * 100) : 0;
    const savedMins = Math.round(autoMapped * 2);
    return {
      examId: exam.id,
      name: exam.name,
      autoMapped,
      manualReview,
      savedMins,
      percentAuto,
    };
  });

  res.json({
    userId,
    user,
    profileCompletion,
    examsAvailable: {
      total: exams.length,
      activeRegistration: activeExams.length,
      eligibleCount: eligibleExams.length,
    },
    applicationsInProgress: {
      total: applications.length,
      inProgress: inProgressApps.length,
      completed: completedApps.length,
      pending: pendingApps.length,
      needsReview: needsReviewApps.length,
    },
    upcomingDeadlines: {
      count: upcomingExams.length,
      nearestDaysRemaining: nearest ? nearest.daysRemaining : null,
      nearestExamName: nearest ? nearest.name : null,
      nearestDeadline: nearest ? nearest.deadline : null,
      items: upcomingExams,
    },
    fieldReuseAnalytics,
  });
});

interface ExtractedField {
  value: string | null;
  confidence: number;
  status: 'high' | 'review' | 'low' | 'missing';
}

interface OcrResponsePayload {
  document_type: string;
  extraction_status: 'success' | 'warning' | 'error';
  extracted_data: Record<string, ExtractedField>;
  warnings: string[];
  requires_manual_review: boolean;
  metadata?: {
    model: string;
    processingTimeMs: number;
    fileSizeKB: number;
    fileName: string;
  };
}

// POST /api/ocr/extract: Real Gemini 3.8 Flash Multimodal OCR Endpoint
app.post('/api/ocr/extract', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const { 
      documentType, 
      fileName, 
      fileMimeType, 
      fileBase64, 
      consentGiven 
    } = req.body;

    // Security check 1: Mandatory user consent for privacy & compliance
    if (!consentGiven) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['User consent was not provided for document processing.'],
        requires_manual_review: true,
        error: 'Consent required: You must agree to document processing before submitting to the OCR engine.',
      });
      return;
    }

    // Security check 2: Validate payload contents
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['No file data received.'],
        requires_manual_review: true,
        error: 'Invalid request: fileBase64 data is missing or malformed.',
      });
      return;
    }

    // Security check 3: Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ];
    const mimeType = (fileMimeType || 'image/jpeg').toLowerCase();
    if (!allowedMimeTypes.includes(mimeType)) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: [`Unsupported MIME type: ${mimeType}`],
        requires_manual_review: true,
        error: `Unsupported format. Supported document formats are: JPG, PNG, WEBP, and PDF.`,
      });
      return;
    }

    // Clean base64 data (strip data URL prefix if present)
    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');

    // Approximate size check (base64 string length * 0.75)
    const approxSizeKB = Math.round((base64Data.length * 0.75) / 1024);
    if (approxSizeKB > 15 * 1024) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['File exceeds maximum allowable size (15MB).'],
        requires_manual_review: true,
        error: 'File size too large. Maximum supported size is 15MB.',
      });
      return;
    }

    // Verify Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        document_type: documentType || 'Educational Document',
        extraction_status: 'error',
        extracted_data: {},
        warnings: [
          'GEMINI_API_KEY is not configured in this environment. Please configure your key in the AI Studio Settings > Secrets panel.',
        ],
        requires_manual_review: true,
        error: 'Gemini API Key is not set on the server. Please attach your GEMINI_API_KEY in the Secrets panel to activate real AI extraction.',
      });
      return;
    }

    // Initialize official @google/genai SDK with telemetry user-agent
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are the REGISTRA National Examination Forensics & OCR Extraction Engine.
Your job is to read candidate academic documents (Class 10 Marksheet, Class 12 Marksheet, Aadhaar Card, Passport, Category Certificate, Domicile Certificate, Income Certificate, etc.) and extract structured fields with realistic confidence scoring.

CRITICAL RULES:
1. For EVERY field in the schema, provide:
   - "value": The extracted string text, or null if completely missing or unreadable.
   - "confidence": An integer between 0 and 100 reflecting visual clarity, sharpness, and legibility.
     * High confidence (90-100): Clear, pristine, typed, unambiguous text.
     * Medium confidence (70-89): Partially blurred, faint stamps, complex cursive, or minor glare.
     * Low confidence (1-69): Heavily occluded, degraded, dubious, or speculative text.
     * Missing (0): Field is absent or completely unreadable.
   - "status": EXACTLY one of: "high" (90-100), "review" (70-89), "low" (0-69), "missing" (0/null).
   DO NOT give 100 to every field! Differentiate genuine confidence realistically based on document quality.
2. DO NOT extract or invent full sensitive national ID numbers. If an Aadhaar is submitted, mask all but the last 4 digits (e.g. "XXXX-XXXX-1234").
3. Determine "document_type" from the document header/watermark/issuer.
4. Set "requires_manual_review" to true if ANY field has status "review" or "low", or if any critical field is missing.
5. In "warnings", list specific observations (e.g. "Board passing certificate stamp is faint", "Candidate photo has slight glare", etc.).
6. Output purely valid JSON matching the requested structure.`;

    const promptText = `Analyze this uploaded document (${documentType || 'Official Exam Record'} - ${fileName || 'document'}) and extract all candidate, academic, and issuing details according to the required schema. Ensure every field has value, confidence (0-100), and status.`;

    const inlinePart = {
      inlineData: {
        mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
        data: base64Data,
      },
    };

    // Use gemini-3.8-flash for multimodal OCR with JSON response
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          inlinePart,
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = geminiResponse.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback clean extraction if wrapped in markdown codeblock
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Normalize and sanitize extracted data format
    const extractedData: Record<string, ExtractedField> = {};
    const rawData = parsed.extracted_data || parsed;

    // Standard field list to ensure consistent coverage
    const standardKeys = [
      'student_name',
      'date_of_birth',
      'gender',
      'fathers_name',
      'mothers_name',
      'board_or_university',
      'school_or_college',
      'roll_number',
      'registration_number',
      'passing_year',
      'subjects',
      'marks_obtained',
      'maximum_marks',
      'percentage',
      'cgpa',
      'document_type',
      'issuing_authority',
      'issue_date',
      'expiry_date',
    ];

    // Recursive flattener for nested model outputs (e.g. candidate_details, academic_details)
    function flattenFields(obj: any): Record<string, any> {
      const flat: Record<string, any> = {};
      if (!obj || typeof obj !== 'object') return flat;

      for (const [k, v] of Object.entries(obj)) {
        if (k === 'warnings' || k === 'requires_manual_review' || k === 'extraction_status') continue;

        // If v is an extracted field object { value, confidence, ... }
        if (v && typeof v === 'object' && ('value' in v || 'confidence' in v)) {
          flat[k] = v;
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          // Nested group object, recursively unpack
          const sub = flattenFields(v);
          for (const [subK, subV] of Object.entries(sub)) {
            flat[subK] = subV;
          }
        } else if (Array.isArray(v)) {
          flat[k] = v.map(item => (typeof item === 'object' && item?.value ? item.value : String(item))).join(', ');
        } else if (v !== undefined && v !== null) {
          flat[k] = String(v);
        }
      }
      return flat;
    }

    const flatRawData = flattenFields(rawData);

    // Combine standard keys and whatever the model returned
    const allKeys = new Set([...standardKeys, ...Object.keys(flatRawData)]);

    let hasReview = false;
    for (const key of allKeys) {
      if (key === 'warnings' || key === 'requires_manual_review' || key === 'document_type' || key === 'extraction_status') {
        continue;
      }

      const item = flatRawData[key];
      if (item && typeof item === 'object' && ('value' in item || 'confidence' in item)) {
        const val = item.value !== undefined ? (item.value === null ? null : String(item.value)) : null;
        let conf = typeof item.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(item.confidence))) : (val ? 85 : 0);
        let status: 'high' | 'review' | 'low' | 'missing' = 'missing';

        if (!val || val.trim() === '' || val.toLowerCase() === 'null' || val.toLowerCase() === 'n/a') {
          conf = 0;
          status = 'missing';
        } else if (conf >= 90) {
          status = 'high';
        } else if (conf >= 70) {
          status = 'review';
          hasReview = true;
        } else {
          status = 'low';
          hasReview = true;
        }

        extractedData[key] = {
          value: val,
          confidence: conf,
          status,
        };
      } else if (item !== undefined && item !== null) {
        // Plain string/number returned
        const strVal = String(item).trim();
        const conf = strVal ? 88 : 0;
        const status = conf >= 90 ? 'high' : conf >= 70 ? 'review' : 'low';
        if (status !== 'high') hasReview = true;
        extractedData[key] = {
          value: strVal || null,
          confidence: conf,
          status: strVal ? status : 'missing',
        };
      }
    }

    // Normalize common synonym keys
    if (extractedData['candidate_name'] && !extractedData['student_name']) {
      extractedData['student_name'] = extractedData['candidate_name'];
    }
    if (extractedData['full_name'] && !extractedData['student_name']) {
      extractedData['student_name'] = extractedData['full_name'];
    }
    if (extractedData['roll_or_student_id'] && !extractedData['roll_number']) {
      extractedData['roll_number'] = extractedData['roll_or_student_id'];
    }
    if (extractedData['roll_number_or_registration_id'] && !extractedData['roll_number']) {
      extractedData['roll_number'] = extractedData['roll_number_or_registration_id'];
    }
    if (extractedData['major_or_stream'] && !extractedData['subjects']) {
      extractedData['subjects'] = extractedData['major_or_stream'];
    }
    if (extractedData['date_of_issue'] && !extractedData['issue_date']) {
      extractedData['issue_date'] = extractedData['date_of_issue'];
    }

    const docTypeStr = typeof parsed.document_type === 'object' && parsed.document_type !== null
      ? String(parsed.document_type.value || documentType || 'Academic Document')
      : String(parsed.document_type || documentType || 'Academic Document');

    const payload: OcrResponsePayload = {
      document_type: docTypeStr,
      extraction_status: 'success',
      extracted_data: extractedData,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      requires_manual_review: parsed.requires_manual_review ?? hasReview,
      metadata: {
        model: 'gemini-3.8-flash',
        processingTimeMs: Date.now() - startTime,
        fileSizeKB: approxSizeKB,
        fileName: fileName || 'uploaded_document',
      },
    };

    res.json(payload);
  } catch (err: any) {
    console.error('Gemini OCR Error:', err);
    res.status(500).json({
      document_type: req.body?.documentType || 'Unknown Document',
      extraction_status: 'error',
      extracted_data: {},
      warnings: [err.message || 'An unexpected error occurred during Gemini OCR extraction.'],
      requires_manual_review: true,
      error: err.message || 'Internal server error while processing document with Gemini API.',
    });
  }
});

// Setup Vite in development or static serving in production
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[REGISTRA] Server running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[REGISTRA] Failed to start server:', err);
  process.exit(1);
});
