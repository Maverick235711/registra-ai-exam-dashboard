import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Compass, 
  Calendar, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Zap,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { evaluateEligibility } from '../utils/eligibilityEngine';

export const DashboardOverview: React.FC = () => {
  const { 
    currentUser,
    profile, 
    profileCompletion, 
    documents,
    applications, 
    exams,
    dashboardStats,
    setActiveTab, 
    openWorkflow, 
    setSelectedExamForEligibility,
    searchQuery
  } = useApp();

  const firstName = profile.personalInfo.fullName ? profile.personalInfo.fullName.split(' ')[0] : (currentUser?.fullName?.split(' ')[0] || 'Candidate');
  const storageUsageLabel = dashboardStats
    ? dashboardStats.documents.storageBytes < 1024 * 1024
      ? `${(dashboardStats.documents.storageBytes / 1024).toFixed(1)} KB`
      : `${(dashboardStats.documents.storageBytes / (1024 * 1024)).toFixed(2)} MB`
    : 'Unavailable';

  // Dynamic Metrics
  const applicationStats = dashboardStats?.applicationsInProgress;
  const inProgressCount = applicationStats?.inProgress ?? null;
  const examsTotal = dashboardStats?.examsAvailable.total ?? null;
  const activeRegistrationsCount = dashboardStats?.examsAvailable.activeRegistration ?? null;
  const eligibleExamsCount = dashboardStats?.examsAvailable.eligibleCount ?? null;
  const upcomingDeadlinesList = dashboardStats?.upcomingDeadlines.items ?? [];

  const upcomingDeadlinesCount = upcomingDeadlinesList.length;
  const nearestDeadline = upcomingDeadlinesList[0] || null;

  const analyticsData = dashboardStats?.fieldReuseAnalytics ?? [];

  // Filtered applications based on header search if active
  const displayedApps = applications.filter(app => 
    !searchQuery || 
    app.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.authority.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoriesWithHistory = new Set(
    applications
      .map((application) => exams.find((exam) => exam.id === application.examId)?.category)
      .filter((category): category is NonNullable<typeof category> => Boolean(category)),
  );
  const preferredCategories = new Set(profile.preferredExamCategories ?? []);
  const recommendedExams = exams
    .filter((exam) =>
      !applications.some((application) => application.examId === exam.id) &&
      evaluateEligibility(profile, exam).sufficientInformation &&
      evaluateEligibility(profile, exam).isEligible,
    )
    .sort((a, b) =>
      Number(preferredCategories.has(b.category)) - Number(preferredCategories.has(a.category)) ||
      Number(categoriesWithHistory.has(b.category)) - Number(categoriesWithHistory.has(a.category)),
    )
    .slice(0, 3);
  const firstExamId = exams[0]?.id;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner / Tagline Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950/60 p-6 sm:p-7 text-white shadow-xl shadow-slate-950/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One Profile · Every Exam · Zero Repetition</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2 text-white">
            Unified National Exam Command Center
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Saved profile information and uploaded documents are available for reuse when an examination's verified field requirements are configured. Review details before any official submission.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => firstExamId && openWorkflow(firstExamId)}
              disabled={!firstExamId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/30 hover:shadow-lg transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Smart Application Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('eligibility')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all"
            >
              <span>Check Eligibility Matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* 4 Primary Statistics Cards - 100% Dynamic & Data-Driven */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dynamic Profile Completion */}
        <div 
          onClick={() => setActiveTab('profile')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Profile Completion</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {profileCompletion.overall}%
            </span>
            <span className={`text-xs font-semibold ${
              profileCompletion.overall === 100 
                ? 'text-emerald-600' 
                : profileCompletion.overall >= 80 
                  ? 'text-indigo-600' 
                  : 'text-amber-600'
            }`}>
              {profileCompletion.overall === 100 ? 'Fully Completed' : profileCompletion.overall >= 80 ? 'Near Complete' : 'In Progress'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                profileCompletion.overall === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
              }`} 
              style={{ width: `${profileCompletion.overall}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {profileCompletion.sections.documents.requiredCount - profileCompletion.sections.documents.uploadedCount} missing upload(s)
            {' · '}{profileCompletion.sections.documents.pendingReviewCount} pending review
          </p>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {dashboardStats
              ? `${dashboardStats.documents.uploadedCount} uploaded · ${storageUsageLabel} stored`
              : 'Document storage unavailable'}
          </p>
        </div>

        {/* Card 2: Dynamic Exams Available */}
        <div 
          onClick={() => setActiveTab('exams')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Exams Available</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {examsTotal === null ? '—' : examsTotal}
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {activeRegistrationsCount === null ? 'Registration status unavailable' : `${activeRegistrationsCount} Open Registrations`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {eligibleExamsCount === null ? 'Eligibility matching unavailable' : `${eligibleExamsCount} examinations meet configured criteria`}
          </p>
        </div>

        {/* Card 3: Dynamic Applications In Progress */}
        <div 
          onClick={() => setActiveTab('applications')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Applications In Progress</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {inProgressCount === null ? '—' : inProgressCount}
            </span>
            <span className="text-xs font-semibold text-amber-600">
              {applicationStats ? `${applicationStats.submitted} submitted · ${applicationStats.completed} completed` : 'Application statuses unavailable'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {applicationStats
              ? `${applicationStats.total} total · ${applicationStats.pending} pending · ${applicationStats.needsReview} review · ${applicationStats.rejected} rejected`
              : 'Application status data unavailable'}
          </p>
        </div>

        {/* Card 4: Dynamic Upcoming Deadlines */}
        <div 
          onClick={() => setActiveTab('deadlines')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Upcoming Deadlines</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {dashboardStats ? upcomingDeadlinesCount : '—'}
            </span>
            <span className={`text-xs font-semibold ${nearestDeadline && nearestDeadline.daysRemaining <= 15 ? 'text-rose-600' : 'text-slate-600'}`}>
              {nearestDeadline ? `Nearest: ${nearestDeadline.daysRemaining} Days` : 'No Deadlines'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {nearestDeadline ? `${nearestDeadline.name} (${nearestDeadline.deadline})` : dashboardStats ? 'No upcoming registration deadlines' : 'Deadline data unavailable'}
          </p>
        </div>
      </div>

      {/* Main Grid: Left 2 Columns (Profile progress & Applications) + Right Column (Deadlines & Recommended) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Profile Readiness Index - 100% Calculated from user's actual profile */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Profile Readiness Index</h3>
                <p className="text-xs text-slate-500">
                  Calculated from your genuine profile fields and uploaded documents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
              >
                {profileCompletion.overall === 100 ? 'View Profile' : 'Complete Profile'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {/* Personal Info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${
                  profileCompletion.sections.personal.completed ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {profileCompletion.sections.personal.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>Personal Info</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {profileCompletion.sections.personal.completed ? 'Completed' : 'Pending'} ({profileCompletion.sections.personal.score}%)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {profileCompletion.sections.personal.filledCount} / {profileCompletion.sections.personal.totalCount} Core Fields
                </div>
              </div>

              {/* Academic Info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${
                  profileCompletion.sections.academic.completed ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {profileCompletion.sections.academic.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>Academic Info</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {profileCompletion.sections.academic.completed ? 'Completed' : 'Pending'} ({profileCompletion.sections.academic.score}%)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {profileCompletion.sections.academic.filledCount} / {profileCompletion.sections.academic.totalCount} Academic Details
                </div>
              </div>

              {/* Documents */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${
                  profileCompletion.sections.documents.completed ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {profileCompletion.sections.documents.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>Documents</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {profileCompletion.sections.documents.uploadedCount} / {profileCompletion.sections.documents.requiredCount} Uploaded
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {profileCompletion.sections.documents.requiredCount - profileCompletion.sections.documents.uploadedCount} missing upload(s)
                  {' · '}{profileCompletion.sections.documents.pendingReviewCount} pending review
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${
                  profileCompletion.sections.contact.completed ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {profileCompletion.sections.contact.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>Contact Info</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {profileCompletion.sections.contact.completed ? 'Completed' : 'Pending'} ({profileCompletion.sections.contact.score}%)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {profileCompletion.sections.contact.filledCount} / {profileCompletion.sections.contact.totalCount} Address Details
                </div>
              </div>
            </div>

            {/* Field Reuse Analytics Custom Visualization - Reacts dynamically to user's real filled profile */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">Fields Auto-Mapped vs Manual Check</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <span className="text-slate-600 font-medium">Mapped from saved profile</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    <span className="text-slate-600 font-medium">Manual Check</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {analyticsData.length === 0 && (
                  <p className="sm:col-span-2 lg:col-span-4 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
                    Field mapping is unavailable because verified exam records do not yet include application-field requirements.
                  </p>
                )}
                {analyticsData.map((item) => {
                  const total = item.total;
                  const autoWidth = total > 0 ? (item.autoMapped / total) * 100 : 0;
                  const manualWidth = 100 - autoWidth;

                  return (
                    <div key={item.examId} className="p-3 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="text-[11px] font-semibold text-amber-700">{item.manualReview} for review</span>
                      </div>
                      
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-lg font-extrabold text-slate-900 tabular-nums">{item.autoMapped}</span>
                        <span className="text-[11px] text-slate-400">/ {total} fields</span>
                        <span className="ml-auto text-[11px] font-bold text-indigo-600">{item.percentAuto}% mapped</span>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500" 
                          style={{ width: `${autoWidth}%` }}
                          title={`Mapped from profile or verified documents: ${item.autoMapped} fields`}
                        />
                        <div 
                          className="bg-amber-400 h-full transition-all duration-500" 
                          style={{ width: `${manualWidth}%` }}
                          title={`Manual Review: ${item.manualReview} fields`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* My Applications Section - Connected to Real User Applications */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Applications</h3>
                <p className="text-xs text-slate-500">
                  Track your personal multi-exam submissions and auto-filled draft statuses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('applications')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                View all ({applications.length})
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No applications created yet</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Browse the competitive examination catalog and launch an auto-filled application without re-typing.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  <span>Explore Available Exams</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-1">Examination</th>
                      <th className="pb-3">Application Status</th>
                      <th className="pb-3">Last Updated</th>
                      <th className="pb-3">Deadline</th>
                      <th className="pb-3 text-right pr-1">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedApps.map((app) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'Completed':
                            return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                          case 'In Progress':
                            return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
                          case 'Pending':
                            return 'bg-amber-50 text-amber-700 border-amber-200/60';
                          case 'Needs Review':
                            return 'bg-rose-50 text-rose-700 border-rose-200/60';
                          default:
                            return 'bg-slate-50 text-slate-700 border-slate-200';
                        }
                      };

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 pl-1">
                            <div className="font-semibold text-slate-900">{app.examName}</div>
                            <div className="text-[11px] text-slate-400">{app.authority}</div>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(app.status)}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-500 font-medium text-[11px]">
                            {app.lastUpdated}
                          </td>
                          <td className="py-3.5 text-slate-600 font-mono text-[11px]">
                            {app.deadline}
                          </td>
                          <td className="py-3.5 text-right pr-1">
                            {app.status === 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => setActiveTab('applications')}
                                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                              >
                                View Submission
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openWorkflow(app.examId)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] shadow-sm transition-colors"
                              >
                                Continue
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Deadlines & Recommended Exams */}
        <div className="space-y-6 sm:space-y-8">
          {/* Upcoming Deadlines Widget - Filtered strictly for actual upcoming exams */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Deadlines</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('deadlines')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Calendar
              </button>
            </div>

            <div className="space-y-3">
              {upcomingDeadlinesList.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  {dashboardStats
                    ? 'No verified upcoming registration deadlines are available.'
                    : 'Upcoming deadline data is unavailable.'}
                </p>
              )}
              {upcomingDeadlinesList.slice(0, 4).map((exam) => {
                const daysLeft = exam.daysRemaining;
                const isUrgent = exam.isUrgent;

                return (
                  <div 
                    key={exam.examId}
                    onClick={() => openWorkflow(exam.examId)}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-slate-100/70 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {exam.name}
                      </div>
                      <div className="text-[11px] text-slate-400">Deadline: {exam.deadline}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-bold tabular-nums ${isUrgent ? 'text-rose-600' : 'text-slate-700'}`}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Due Today'}
                      </div>
                      <span className={`text-[10px] font-semibold ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isUrgent ? 'High Urgency' : 'Registration Open'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Exams for Current User */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recommended for {firstName}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Live Matching
              </span>
            </div>

            <div className="space-y-3">
              {recommendedExams.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  No recommendations can be made from the available verified exam criteria and saved eligibility information.
                </p>
              )}
              {recommendedExams.map((exam) => (
                <div 
                  key={exam.id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm bg-white transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{exam.name}</h4>
                      <p className="text-[11px] text-slate-500">{exam.authority}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                      {exam.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {exam.eligibilitySummary}
                  </p>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExamForEligibility(exam.id);
                        setActiveTab('eligibility');
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>Check Eligibility</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openWorkflow(exam.id)}
                      className="text-[11px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
                    >
                      Pre-fill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
