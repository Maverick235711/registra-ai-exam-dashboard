import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  StudentProfile, 
  DocumentRecord, 
  DocumentType,
  ExtractedFieldData,
  ApplicationRecord, 
  ExamItem, 
  UserAccount, 
  DashboardStats,
} from '../types';
import { calculateProfileCompletion, createEmptyProfile } from '../utils/eligibilityEngine';
import { apiService } from '../services/apiService';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

interface AppContextType {
  // Authentication & Users
  currentUser: UserAccount | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  dashboardError: string;
  refreshUserData: () => Promise<void>;
  authNotice: string;
  clearAuthNotice: () => void;

  // Student Profile
  profile: StudentProfile;
  updateProfile: (updates: Partial<StudentProfile>) => Promise<void>;

  // Documents
  documents: DocumentRecord[];
  updateDocument: (id: string, updates: Partial<DocumentRecord>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  uploadDocument: (
    file: File,
    type: DocumentType,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) => Promise<DocumentRecord>;
  confirmDocumentExtraction: (documentId: string, extractedData: Record<string, ExtractedFieldData>) => Promise<void>;
  triggerAiExtraction: (id: string) => Promise<void>;
  isExtractingDocId: string | null;

  // Applications
  applications: ApplicationRecord[];
  updateApplication: (id: string, updates: Partial<ApplicationRecord>) => Promise<void>;
  saveApplication: (application: Partial<ApplicationRecord> & { examId: string }) => Promise<ApplicationRecord>;

  // Exams
  exams: ExamItem[];

  // Dynamic Dashboard Stats
  dashboardStats: DashboardStats | null;
  refreshDashboardStats: () => Promise<void>;

  // Navigation & Workflow
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workflowExamId: string | null;
  openWorkflow: (examId?: string) => void;
  closeWorkflow: () => void;
  selectedExamForEligibility: string | null;
  setSelectedExamForEligibility: (examId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Notifications & Modals
  notifications: NotificationItem[];
  markNotificationsRead: () => void;
  ocrModalOpen: boolean;
  setOcrModalOpen: (open: boolean) => void;
  ocrTargetDocId: string | null;
  setOcrTargetDocId: (id: string | null) => void;
  openOcrStudio: (docId?: string) => void;

  // User switcher modal
  userModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Purely dynamic calculated profile completion breakdown
  profileCompletion: {
    overall: number;
    sections: {
      personal: { completed: boolean; score: number; filledCount: number; totalCount: number };
      academic: { completed: boolean; score: number; filledCount: number; totalCount: number };
      documents: { completed: boolean; score: number; uploadedCount: number; pendingReviewCount: number; requiredCount: number };
      contact: { completed: boolean; score: number; filledCount: number; totalCount: number };
    };
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(createEmptyProfile());
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [workflowExamId, setWorkflowExamId] = useState<string | null>(null);
  const [selectedExamForEligibility, setSelectedExamForEligibility] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExtractingDocId, setIsExtractingDocId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState<boolean>(false);
  const [ocrTargetDocId, setOcrTargetDocId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch full data for currently authenticated user from backend
  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    let authRes;
    try {
      authRes = await apiService.getCurrentUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore your session.';
      setCurrentUser(null);
      setAuthNotice(message);
      console.error('[AppContext] Could not restore the authenticated session:', err);
      setIsLoading(false);
      return;
    }

    if (!authRes.user || !authRes.profile) {
      setCurrentUser(null);
      setAuthNotice('');
      setProfile(createEmptyProfile());
      setDocuments([]);
      setApplications([]);
      setExams([]);
      setDashboardStats(null);
      setDashboardError('');
      setIsLoading(false);
      return;
    }
    setCurrentUser(authRes.user);
    setAuthNotice('');
    setProfile(authRes.profile);

    try {
      const [docs, apps, examList, stats] = await Promise.all([
        apiService.getDocuments(),
        apiService.getApplications(),
        apiService.getExams(),
        apiService.getDashboardStats(),
      ]);
      setDocuments(docs);
      setApplications(apps);
      setExams(examList);
      setDashboardStats(stats);
      setDashboardError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load your account data.';
      setDashboardError(message);
      console.error('[AppContext] Could not load account data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadUserData().catch(() => undefined);
  }, [loadUserData]);

  // Refresh dynamic stats
  const refreshDashboardStats = async () => {
    try {
      const stats = await apiService.getDashboardStats();
      setDashboardStats(stats);
      setDashboardError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dashboard statistics are unavailable.';
      setDashboardError(message);
      console.error('Failed to refresh stats:', err);
    }
  };

  // Profile update
  const updateProfile = async (updates: Partial<StudentProfile>) => {
    const previousProfile = profile;
    setProfile(prev => {
      const next: StudentProfile = {
        ...prev,
        ...updates,
        personalInfo: { ...prev.personalInfo, ...(updates.personalInfo || {}) },
        academicInfo: {
          ...prev.academicInfo,
          ...(updates.academicInfo || {}),
          class10: { ...prev.academicInfo.class10, ...(updates.academicInfo?.class10 || {}) },
          class12: { ...prev.academicInfo.class12, ...(updates.academicInfo?.class12 || {}) },
        },
      };
      return next;
    });

    try {
      const res = await apiService.updateProfile(updates);
      setProfile(res.profile);
      if (res.user) {
        setCurrentUser(res.user);
      }
      addToast('Profile saved and synced to database', 'success');
      await refreshDashboardStats();
    } catch (err) {
      setProfile(previousProfile);
      console.error('Failed to sync profile to backend:', err);
      addToast(err instanceof Error ? err.message : 'Profile update failed. Please try again.', 'warning');
    }
  };

  // Document update
  const updateDocument = async (id: string, updates: Partial<DocumentRecord>) => {
    const previousDocuments = documents;
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
    try {
      const docs = await apiService.saveDocument(id, updates);
      setDocuments(docs);
      addToast('Document record updated in vault', 'success');
      await refreshDashboardStats();
    } catch (err) {
      setDocuments(previousDocuments);
      console.error('Failed to save document:', err);
      addToast(err instanceof Error ? err.message : 'Document update failed.', 'warning');
    }
  };

  // Delete Document
  const deleteDocument = async (id: string) => {
    const previousDocuments = documents;
    setDocuments(prev => prev.filter(d => d.id !== id));
    try {
      const docs = await apiService.deleteDocument(id);
      setDocuments(docs);
      addToast('Document removed from vault', 'info');
      await refreshDashboardStats();
    } catch (err) {
      setDocuments(previousDocuments);
      console.error('Failed to delete document:', err);
      addToast(err instanceof Error ? err.message : 'Document deletion failed.', 'warning');
    }
  };

  const uploadDocument = async (
    file: File,
    type: DocumentType,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<DocumentRecord> => {
    try {
      const savedDocuments = await apiService.uploadDocument(file, type, onProgress, signal);
      setDocuments(savedDocuments);
      addToast(`Uploaded ${file.name}`, 'success');
      await refreshDashboardStats();
      const saved = savedDocuments.find((document) => document.type === type);
      if (!saved) throw new Error('Upload completed but its document record could not be loaded.');
      return saved;
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Document upload failed.', 'warning');
      throw err;
    }
  };

  const confirmDocumentExtraction = async (
    documentId: string,
    extractedData: Record<string, ExtractedFieldData>,
  ) => {
    const saved = await apiService.confirmDocumentExtraction(documentId, extractedData);
    setProfile(saved.profile);
    setDocuments(saved.documents);
    await refreshDashboardStats();
  };

  // Application update
  const updateApplication = async (id: string, updates: Partial<ApplicationRecord>) => {
    const previousApplications = applications;
    setApplications(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
    try {
      const target = applications.find(a => a.id === id);
      if (!target) throw new Error('Application not found. Refresh your applications and try again.');
      await apiService.saveApplication({ ...target, ...updates, examId: target.examId });
      setApplications(await apiService.getApplications());
      addToast('Application progress saved', 'success');
      await refreshDashboardStats();
    } catch (err) {
      setApplications(previousApplications);
      console.error('Failed to save application:', err);
      addToast(err instanceof Error ? err.message : 'Application update failed.', 'warning');
    }
  };

  const saveApplication = async (application: Partial<ApplicationRecord> & { examId: string }) => {
    const saved = await apiService.saveApplication(application);
    setApplications(await apiService.getApplications());
    await refreshDashboardStats();
    return saved;
  };

  const login = async (email: string, password: string) => {
    setAuthNotice('');
    const res = await apiService.login(email, password);
    setCurrentUser(res.user);
    setProfile(res.profile);
    await loadUserData();
    addToast(`Logged in as ${res.user.email}`, 'success');
  };

  // Logout
  const logout = async () => {
    try {
      await apiService.logout();
      setCurrentUser(null);
      setAuthNotice('');
      setProfile(createEmptyProfile());
      setDocuments([]);
      setApplications([]);
      setExams([]);
      setDashboardStats(null);
      setDashboardError('');
      addToast('Logged out securely', 'success');
    } catch (err) {
      console.error('Logout failed:', err);
      addToast('Logout request failed', 'warning');
    }
  };

  const openOcrStudio = (docId?: string) => {
    setOcrTargetDocId(docId || null);
    setOcrModalOpen(true);
  };

  const triggerAiExtraction = async (id: string) => {
    setOcrTargetDocId(id);
    setOcrModalOpen(true);
  };

  const openWorkflow = (examId?: string) => {
    setWorkflowExamId(examId || null);
  };

  const closeWorkflow = () => {
    setWorkflowExamId(null);
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Calculate purely dynamic profile completion based on real user state
  const profileCompletion = calculateProfileCompletion(profile, documents);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isLoading,
        dashboardError,
        refreshUserData: loadUserData,
        authNotice,
        clearAuthNotice: () => setAuthNotice(''),
        profile,
        updateProfile,
        documents,
        updateDocument,
        deleteDocument,
        uploadDocument,
        confirmDocumentExtraction,
        triggerAiExtraction,
        isExtractingDocId,
        applications,
        updateApplication,
        saveApplication,
        exams,
        dashboardStats,
        refreshDashboardStats,
        activeTab,
        setActiveTab,
        workflowExamId,
        openWorkflow,
        closeWorkflow,
        selectedExamForEligibility,
        setSelectedExamForEligibility,
        searchQuery,
        setSearchQuery,
        notifications,
        markNotificationsRead,
        ocrModalOpen,
        setOcrModalOpen,
        ocrTargetDocId,
        setOcrTargetDocId,
        openOcrStudio,
        userModalOpen,
        setUserModalOpen,
        toasts,
        addToast,
        removeToast,
        profileCompletion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
