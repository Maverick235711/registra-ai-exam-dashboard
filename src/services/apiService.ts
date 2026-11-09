import { StudentProfile, DocumentRecord, ApplicationRecord, ExamItem, UserAccount, DashboardStats } from '../types';

const STORAGE_KEY_USER_ID = 'registra_active_user_id';

export function getActiveUserId(): string {
  return localStorage.getItem(STORAGE_KEY_USER_ID) || 'usr_26ucc005';
}

export function setActiveUserId(userId: string): void {
  localStorage.setItem(STORAGE_KEY_USER_ID, userId);
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': getActiveUserId(),
  };
}

export const apiService = {
  // --- Auth ---
  async getCurrentUser(): Promise<{ user: UserAccount; profile: StudentProfile }> {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch current user (HTTP ${res.status})`);
    return res.json();
  },

  async getAllUsers(): Promise<UserAccount[]> {
    const res = await fetch('/api/auth/users', { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch users list (HTTP ${res.status})`);
    const data = await res.json();
    return data.users;
  },

  async login(email: string): Promise<{ user: UserAccount; profile: StudentProfile }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Failed to login');
    const data = await res.json();
    if (data.user?.id) {
      setActiveUserId(data.user.id);
    }
    return data;
  },

  async switchUser(userId: string): Promise<{ user: UserAccount; profile: StudentProfile }> {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to switch user');
    const data = await res.json();
    setActiveUserId(userId);
    return data;
  },

  // --- Profile ---
  async getProfile(): Promise<{ profile: StudentProfile; user: UserAccount }> {
    const res = await fetch('/api/user/profile', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(updates: Partial<StudentProfile>): Promise<{ profile: StudentProfile; user: UserAccount }> {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ profile: updates }),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // --- Documents ---
  async getDocuments(): Promise<DocumentRecord[]> {
    const res = await fetch('/api/user/documents', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents;
  },

  async saveDocument(docId: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord[]> {
    const res = await fetch('/api/user/documents', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ docId, updates }),
    });
    if (!res.ok) throw new Error('Failed to save document');
    const data = await res.json();
    return data.documents;
  },

  async deleteDocument(docId: string): Promise<DocumentRecord[]> {
    const res = await fetch(`/api/user/documents/${docId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    const data = await res.json();
    return data.documents;
  },

  // --- Applications ---
  async getApplications(): Promise<ApplicationRecord[]> {
    const res = await fetch('/api/user/applications', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch applications');
    const data = await res.json();
    return data.applications;
  },

  async saveApplication(appData: Partial<ApplicationRecord> & { examId: string }): Promise<ApplicationRecord> {
    const res = await fetch('/api/user/applications', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ application: appData }),
    });
    if (!res.ok) throw new Error('Failed to save application');
    const data = await res.json();
    return data.application;
  },

  // --- Exams ---
  async getExams(): Promise<ExamItem[]> {
    const res = await fetch('/api/exams', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch exams');
    const data = await res.json();
    return data.exams;
  },

  // --- Dynamic Dashboard Stats ---
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },
};
