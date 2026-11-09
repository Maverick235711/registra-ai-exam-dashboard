import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  StudentProfile, 
  DocumentRecord, 
  ApplicationRecord, 
  ExamItem, 
  UserAccount, 
  DashboardStats 
} from '../types';
import { calculateProfileCompletion } from '../utils/eligibilityEngine';
import { apiService, getActiveUserId, setActiveUserId } from '../services/apiService';
import { initialProfile, initialDocuments, initialApplications, examDatabase } from '../data/mockData';

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
  availableUsers: UserAccount[];
  switchUser: (userId: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;

  // Student Profile
  profile: StudentProfile;
  updateProfile: (updates: Partial<StudentProfile>) => Promise<void>;

  // Documents
  documents: DocumentRecord[];
  updateDocument: (id: string, updates: Partial<DocumentRecord>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  triggerAiExtraction: (id: string) => Promise<void>;
  isExtractingDocId: string | null;

  // Applications
  applications: ApplicationRecord[];
  updateApplication: (id: string, updates: Partial<ApplicationRecord>) => Promise<void>;

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
  logoModalOpen: boolean;
  setLogoModalOpen: (open: boolean) => void;
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
      documents: { completed: boolean; score: number; uploadedCount: number; requiredCount: number };
      contact: { completed: boolean; score: number; filledCount: number; totalCount: number };
    };
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserAccount[]>([]);
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [applications, setApplications] = useState<ApplicationRecord[]>(initialApplications);
  const [exams, setExams] = useState<ExamItem[]>(examDatabase);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [workflowExamId, setWorkflowExamId] = useState<string | null>(null);
  const [selectedExamForEligibility, setSelectedExamForEligibility] = useState<string | null>('exam_jee_main');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExtractingDocId, setIsExtractingDocId] = useState<string | null>(null);
  const [logoModalOpen, setLogoModalOpen] = useState<boolean>(false);
  const [ocrModalOpen, setOcrModalOpen] = useState<boolean>(false);
  const [ocrTargetDocId, setOcrTargetDocId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'JEE Main 2027 Registration Active',
      desc: 'National Testing Agency opened online forms. Deadline: Dec 5.',
      time: '20 min ago',
      read: false,
      type: 'info',
    },
    {
      id: 'notif_2',
      title: 'Class 12 Marksheet AI Verified',
      desc: 'High confidence match (98.8%) verified against CBSE 2024 records.',
      time: '2 hours ago',
      read: false,
      type: 'success',
    },
    {
      id: 'notif_3',
      title: 'BITSAT Session 1 Closes Soon',
      desc: 'Only 39 days left for BITS Pilani admissions window.',
      time: 'Yesterday',
      read: true,
      type: 'warning',
    },
  ]);

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
  const loadUserData = useCallback(async (targetUserId?: string) => {
    setIsLoading(true);
    try {
      if (targetUserId) {
        setActiveUserId(targetUserId);
      }

      // 1. Fetch current user & profile
      const authRes = await apiService.getCurrentUser();
      setCurrentUser(authRes.user);
      if (authRes.profile) {
        setProfile(authRes.profile);
      }

      // 2. Fetch user's documents
      const docs = await apiService.getDocuments();
      setDocuments(docs);

      // 3. Fetch user's applications
      const apps = await apiService.getApplications();
      setApplications(apps);

      // 4. Fetch competitive exams list
      const examList = await apiService.getExams();
      setExams(examList);

      // 5. Fetch available accounts for switcher
      const allUsers = await apiService.getAllUsers();
      setAvailableUsers(allUsers);

      // 6. Fetch dynamic dashboard statistics
      const stats = await apiService.getDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      console.warn('[AppContext] Falling back to local data during initial backend connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Refresh dynamic stats
  const refreshDashboardStats = async () => {
    try {
      const stats = await apiService.getDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  // Profile update
  const updateProfile = async (updates: Partial<StudentProfile>) => {
    // Optimistic UI update
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
    } catch (err: any) {
      console.error('Failed to sync profile to backend:', err);
      addToast('Saved locally; backend sync failed', 'warning');
    }
  };

  // Document update
  const updateDocument = async (id: string, updates: Partial<DocumentRecord>) => {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
    try {
      const docs = await apiService.saveDocument(id, updates);
      setDocuments(docs);
      addToast('Document record updated in vault', 'success');
      await refreshDashboardStats();
    } catch (err) {
      console.error('Failed to save document:', err);
    }
  };

  // Delete Document
  const deleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    try {
      const docs = await apiService.deleteDocument(id);
      setDocuments(docs);
      addToast('Document removed from vault', 'info');
      await refreshDashboardStats();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Application update
  const updateApplication = async (id: string, updates: Partial<ApplicationRecord>) => {
    setApplications(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
    try {
      const target = applications.find(a => a.id === id);
      if (target) {
        await apiService.saveApplication({ ...target, ...updates, examId: target.examId });
        const updatedApps = await apiService.getApplications();
        setApplications(updatedApps);
      }
      addToast('Application progress saved', 'success');
      await refreshDashboardStats();
    } catch (err) {
      console.error('Failed to save application:', err);
    }
  };

  // Switch User Account
  const switchUser = async (userId: string) => {
    try {
      const res = await apiService.switchUser(userId);
      setCurrentUser(res.user);
      if (res.profile) setProfile(res.profile);
      addToast(`Switched account to ${res.user.fullName}`, 'success');
      await loadUserData(userId);
    } catch (err) {
      console.error('Failed to switch user:', err);
      addToast('Could not switch account', 'warning');
    }
  };

  // Login / Register with Email
  const login = async (email: string) => {
    try {
      const res = await apiService.login(email);
      setCurrentUser(res.user);
      if (res.profile) setProfile(res.profile);
      addToast(`Logged in as ${res.user.email}`, 'success');
      await loadUserData(res.user.id);
    } catch (err) {
      console.error('Login failed:', err);
      addToast('Login failed', 'warning');
    }
  };

  // Logout
  const logout = () => {
    // Switch to fresh applicant
    switchUser('usr_fresh_applicant');
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
    setWorkflowExamId(examId || 'exam_jee_main');
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
        availableUsers,
        switchUser,
        login,
        logout,
        isLoading,
        profile,
        updateProfile,
        documents,
        updateDocument,
        deleteDocument,
        triggerAiExtraction,
        isExtractingDocId,
        applications,
        updateApplication,
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
        logoModalOpen,
        setLogoModalOpen,
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
