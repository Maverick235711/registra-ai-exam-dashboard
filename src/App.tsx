import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { SmartWorkflowModal } from './components/SmartWorkflowModal';
import { OcrVerificationModal } from './components/OcrVerificationModal';
import { UserAccountModal } from './components/UserAccountModal';

// Views
import { DashboardOverview } from './views/DashboardOverview';
import { MyProfileView } from './views/MyProfileView';
import { MyDocumentsView } from './views/MyDocumentsView';
import { FindExamsView } from './views/FindExamsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { EligibilityCheckerView } from './views/EligibilityCheckerView';
import { DeadlineCalendarView } from './views/DeadlineCalendarView';
import { AiAssistantView } from './views/AiAssistantView';
import { SettingsView } from './views/SettingsView';

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
    documents
  } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring your secure session…
      </div>
    );
  }

  if (!currentUser) {
    return <UserAccountModal />;
  }

  const targetDoc = ocrTargetDocId ? documents.find(d => d.id === ocrTargetDocId) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Fixed Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area (offset by 18rem on large screens) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {dashboardError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
              <h2 className="text-sm font-bold text-slate-900">Account data unavailable</h2>
              <p className="mx-auto mt-2 max-w-lg text-xs text-slate-600">{dashboardError}</p>
              <button
                type="button"
                onClick={() => void refreshUserData()}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
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

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span className="font-semibold text-slate-700">
              REGISTRA · One Profile. Every Exam. Zero Repetition.
            </span>
            <span className="text-slate-400">
              National Examination Application Assistant
            </span>
          </div>
        </footer>
      </div>

      {/* 7-Step Smart Application Workflow Modal */}
      {workflowExamId && (
        <SmartWorkflowModal
          examId={workflowExamId}
          onClose={closeWorkflow}
        />
      )}

      {/* Real Gemini AI OCR Verification Studio */}
      <OcrVerificationModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        initialDocId={ocrTargetDocId}
        initialFileUrl={targetDoc?.fileUrl}
        initialDocTitle={targetDoc?.title}
      />

      {/* User Account & Authentication Switcher Modal */}
      <UserAccountModal />

      {/* Interactive Toast Notifications */}
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
