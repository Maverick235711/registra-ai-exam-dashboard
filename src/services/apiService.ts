import { StudentProfile, DocumentRecord, DocumentType, ApplicationRecord, ExamDirectoryEntry, ExamItem, UserAccount, DashboardStats, ExtractedFieldData, GeminiOcrResponse } from '../types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new Error('Unable to reach REGISTRA. Check your network connection and try again.');
  }

  const parsedData: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const data = typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)
      ? parsedData as Record<string, unknown>
      : {};
    const message = typeof data.error === 'string'
      ? data.error
      : typeof data.message === 'string'
        ? data.message
        : response.status >= 500
          ? `The server could not complete your request (HTTP ${response.status}). Please try again.`
          : `Your request could not be completed (HTTP ${response.status}).`;
    throw new ApiError(message, response.status, typeof data.code === 'string' ? data.code : undefined);
  }
  return (parsedData === undefined ? {} : parsedData) as T;
}

export const apiService = {
  async getCurrentUser(): Promise<{ user: UserAccount | null; profile: StudentProfile | null }> {
    return request('/api/auth/me');
  },

  async register(payload: { fullName: string; email: string; password: string; confirmPassword: string }): Promise<{ user: UserAccount; message: string; requiresVerification: boolean }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyEmail(email: string, otp: string): Promise<{ user: UserAccount; message: string }> {
    return request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  async resendOtp(email: string): Promise<{ message: string }> {
    return request('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async login(email: string, password: string): Promise<{ user: UserAccount; profile: StudentProfile }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },

  async getProfile(): Promise<{ profile: StudentProfile; user: UserAccount }> {
    return request('/api/user/profile');
  },

  async updateProfile(updates: Partial<StudentProfile>): Promise<{ profile: StudentProfile; user: UserAccount }> {
    return request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: updates }),
    });
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    const data = await request<{ documents: DocumentRecord[] }>('/api/user/documents');
    return data.documents;
  },

  async saveDocument(docId: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord[]> {
    const data = await request<{ documents: DocumentRecord[] }>('/api/user/documents', {
      method: 'POST',
      body: JSON.stringify({ docId, updates }),
    });
    return data.documents;
  },

  async uploadDocument(
    file: File,
    type: DocumentType,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<DocumentRecord[]> {
    const body = new FormData();
    body.append('type', type);
    body.append('documents', file);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/user/documents/upload');
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        let data: { documents?: DocumentRecord[]; error?: string };
        try {
          data = JSON.parse(xhr.responseText || '{}') as { documents?: DocumentRecord[]; error?: string };
        } catch {
          reject(new Error('The server returned an unreadable upload response. Please refresh your vault.'));
          return;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new ApiError(data.error || `Upload failed with HTTP ${xhr.status}`, xhr.status));
          return;
        }
        if (!Array.isArray(data.documents)) {
          reject(new Error('The server did not confirm the document upload.'));
          return;
        }
        resolve(data.documents ?? []);
      };
      xhr.onerror = () => reject(new Error('Unable to upload the document. Check your network connection and try again.'));
      xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      if (signal?.aborted) {
        xhr.abort();
        return;
      }
      xhr.send(body);
    });
  },

  async extractDocument(
    documentId: string,
    onStage: (stage: string) => void,
    signal: AbortSignal,
  ): Promise<GeminiOcrResponse> {
    const response = await fetch(`/api/user/documents/${encodeURIComponent(documentId)}/extract`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || `Scanning failed with HTTP ${response.status}`, response.status);
    }
    if (!response.body) throw new Error('The scanning response could not be read. Please retry.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: GeminiOcrResponse | null = null;
    let scanError: string | null = null;
    const processFrame = (frame: string) => {
      const event = frame.match(/^event:\s*(\w+)/m)?.[1];
      const data = frame.match(/^data:\s*(.+)$/m)?.[1];
      if (!event || !data) return;
      const payload = JSON.parse(data) as { stage?: string; error?: string } & Record<string, unknown>;
      if (event === 'stage' && payload.stage) onStage(payload.stage);
      if (event === 'result') result = payload as unknown as GeminiOcrResponse;
      if (event === 'error') scanError = payload.error || 'Document extraction failed.';
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      frames.forEach(processFrame);
      if (done) break;
    }
    if (scanError) throw new Error(scanError);
    if (!result) throw new Error('The scan ended without a result. Please retry.');
    return result;
  },

  async confirmDocumentExtraction(
    documentId: string,
    extractedData: Record<string, ExtractedFieldData>,
  ): Promise<{ profile: StudentProfile; documents: DocumentRecord[] }> {
    return request(`/api/user/documents/${encodeURIComponent(documentId)}/confirm-extraction`, {
      method: 'POST',
      body: JSON.stringify({ extractedData }),
    });
  },

  async deleteDocument(docId: string): Promise<DocumentRecord[]> {
    const data = await request<{ documents: DocumentRecord[] }>(`/api/user/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    return data.documents;
  },

  async getApplications(): Promise<ApplicationRecord[]> {
    const data = await request<{ applications: ApplicationRecord[] }>('/api/user/applications');
    return data.applications;
  },

  async saveApplication(appData: Partial<ApplicationRecord> & { examId: string }): Promise<ApplicationRecord> {
    const data = await request<{ application: ApplicationRecord }>('/api/user/applications', {
      method: 'POST',
      body: JSON.stringify({ application: appData }),
    });
    return data.application;
  },

  async getExamDirectory(filters: {
    category?: string;
    level?: 'national' | 'state';
    state?: string;
    status?: 'upcoming' | 'open' | 'closed' | 'tbd';
    search?: string;
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    exams: ExamDirectoryEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    return request(`/api/exams${query.size ? `?${query.toString()}` : ''}`);
  },

  async getExamBySlug(slug: string): Promise<ExamDirectoryEntry> {
    const data = await request<{ exam: ExamDirectoryEntry }>(`/api/exams/${encodeURIComponent(slug)}`);
    return data.exam;
  },

  async getExams(): Promise<ExamItem[]> {
    const data = await this.getExamDirectory({ page: 1, limit: 100 });
    return data.exams.map((exam) => ({
      id: exam.id,
      slug: exam.slug,
      name: exam.name,
      fullName: exam.name,
      authority: exam.conductingBody,
      category: (['Engineering', 'Medical', 'Management', 'Civil Services', 'Undergraduate', 'Government & Banking', 'UPSC', 'SSC', 'Railways', 'Banking & Insurance', 'Teaching & Eligibility'].includes(exam.category)
        ? exam.category
        : 'Government & Banking') as ExamItem['category'],
      description: exam.eligibility ?? '',
      eligibilitySummary: exam.eligibility ?? '',
      criteria: {},
      applicationOpenDate: exam.registrationStartDate ?? '',
      applicationDeadline: exam.registrationEndDate ?? '',
      admitCardDate: exam.admitCardDate ?? '',
      examDate: exam.examDate ?? '',
      feeINR: {
        general: exam.applicationFee?.general ?? 0,
        reserved: exam.applicationFee?.reserved ?? 0,
      },
      officialWebsite: exam.officialWebsite ?? '',
      popularCourses: [],
      documentsRequired: [],
      status: exam.status === 'open'
        ? 'Registration Open'
        : exam.status === 'closed'
          ? 'Closed'
          : exam.status === 'upcoming'
            ? 'Upcoming'
            : 'Unknown',
      ...(exam.sourceUrl ? { sourceUrl: exam.sourceUrl } : {}),
      ...(exam.lastVerifiedAt ? { verifiedAt: exam.lastVerifiedAt } : {}),
    }));
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return request('/api/dashboard/stats');
  },
};
