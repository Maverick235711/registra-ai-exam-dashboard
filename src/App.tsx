import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { SmartWorkflowModal } from './components/SmartWorkflowModal';
import { OcrVerificationModal } from './components/OcrVerificationModal';
import { UserAccountModal } from './components/UserAccountModal';
import { DashboardOverview } from './views/DashboardOverview';
import { MyProfileView } from './views/MyProfileView';
import { MyDocumentsView } from './views/MyDocumentsView';
import { FindExamsView } from './views/FindExamsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { EligibilityCheckerView } from './views/EligibilityCheckerView';
import { DeadlineCalendarView } from './views/DeadlineCalendarView';
import { AiAssistantView } from './views/AiAssistantView';
import { SettingsView } from './views/SettingsView';

const LoadingShell: React.FC = () => (
  <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" role="status" aria-label="Loading REGISTRA">
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="w-full max-w-xl space-y-3">
          <div className="skeleton h-4 w-36 rounded-full" />
          <div className="skeleton h-11 w-3/4 rounded-2xl" />
          <div className="skeleton h-4 w-64 max-w-full rounded-full" />
        </div>
        <div className="skeleton hidden h-10 w-72 rounded-full md:block" />
      </div>
      <div className="nav-scrollbar-hidden mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton h-9 w-24 shrink-0 rounded-full" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`skeleton min-h-44 rounded-[28px] ${index === 0 ? 'lg:col-span-1 lg:row-span-2 lg:min-h-[420px]' : ''}`} />
        ))}
      </div>
    </div>
    <span className="sr-only">Restoring your secure session…</span>
  </div>
);

const DashboardContent: React.FC = () => {
  const {
    currentUser,
    isLoading,
    dashboardError,
    refreshUserData,
    activeTab,
    workflowExamId,
    closeWorkflow,
    ocrModalOpen,
    setOcrModalOpen,
    ocrTargetDocId,
    documents,
  } = useApp();

  if (isLoading) return <LoadingShell />;
  if (!currentUser) return <UserAccountModal />;

  const targetDoc = ocrTargetDocId ? documents.find((document) => document.id === ocrTargetDocId) : null;

  return (
    <div className="flex min-h-screen flex-col text-ink">
      <Header />
      <Sidebar />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        {dashboardError ? (
          <div role="alert" className="surface-card rounded-3xl p-8 text-center">
            <h2 className="font-display text-lg font-bold text-ink">Account data unavailable</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{dashboardError}</p>
            <button
              type="button"
              onClick={() => void refreshUserData()}
              className="mt-5 rounded-full bg-registra px-5 py-2.5 text-xs font-bold text-white transition hover:bg-registra-dark focus-visible:ring-2 focus-visible:ring-registra focus-visible:ring-offset-2"
            >
              Retry loading account data
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <DashboardOverview />}
            {activeTab === 'profile' && <MyProfileView />}
            {activeTab === 'documents' && <MyDocumentsView />}
            {activeTab === 'exams' && <FindExamsView />}
            {activeTab === 'applications' && <MyApplicationsView />}
            {activeTab === 'eligibility' && <EligibilityCheckerView />}
            {activeTab === 'deadlines' && <DeadlineCalendarView />}
            {activeTab === 'assistant' && <AiAssistantView />}
            {activeTab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      <footer className="mx-auto w-full max-w-[1280px] border-t border-registra/10 px-4 py-4 text-center text-xs text-muted sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <span className="font-semibold text-ink">REGISTRA · One Profile. Every Exam. Zero Repetition.</span>
          <span>National Examination Application Assistant</span>
        </div>
      </footer>

      {workflowExamId && <SmartWorkflowModal examId={workflowExamId} onClose={closeWorkflow} />}
      <OcrVerificationModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        initialDocId={ocrTargetDocId}
        initialFileUrl={targetDoc?.fileUrl}
        initialDocTitle={targetDoc?.title}
      />
      <UserAccountModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
