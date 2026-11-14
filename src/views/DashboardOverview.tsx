import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Clock3, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TARTEEB_EXTENSION_URL } from '../config';

const MINUTES_SAVED_PER_AUTO_MAPPED_FIELD_ESTIMATE = 2;

const dateOnly = (value: string | null | undefined) => value?.slice(0, 10) || 'Date unavailable';

export const DashboardOverview: React.FC = () => {
  const {
    profileCompletion,
    applications,
    dashboardStats,
    setActiveTab,
    openWorkflow,
  } = useApp();
  const [selectedExamId, setSelectedExamId] = useState('all');

  const applicationExams = useMemo(() => {
    const seen = new Set<string>();
    return applications.filter((application) => {
      if (seen.has(application.examId)) return false;
      seen.add(application.examId);
      return true;
    });
  }, [applications]);

  const profileSections = [
    {
      id: 'personal',
      label: 'Personal info',
      completed: profileCompletion.sections.personal.completed,
      filled: profileCompletion.sections.personal.filledCount,
      total: profileCompletion.sections.personal.totalCount,
    },
    {
      id: 'academic',
      label: 'Academic info',
      completed: profileCompletion.sections.academic.completed,
      filled: profileCompletion.sections.academic.filledCount,
      total: profileCompletion.sections.academic.totalCount,
    },
    {
      id: 'contact',
      label: 'Contact info',
      completed: profileCompletion.sections.contact.completed,
      filled: profileCompletion.sections.contact.filledCount,
      total: profileCompletion.sections.contact.totalCount,
    },
    {
      id: 'documents',
      label: 'Documents',
      completed: profileCompletion.sections.documents.completed,
      filled: profileCompletion.sections.documents.uploadedCount,
      total: profileCompletion.sections.documents.requiredCount,
    },
  ];
  const currentSectionId = profileSections.find((section) => !section.completed)?.id;
  const requiredDocuments = profileCompletion.sections.documents.requiredCount;
  const uploadedDocuments = profileCompletion.sections.documents.uploadedCount;
  const documentsRemaining = Math.max(requiredDocuments - uploadedDocuments, 0);
  const documentProgress = requiredDocuments > 0
    ? Math.min((uploadedDocuments / requiredDocuments) * 100, 100)
    : 100;

  const stats = dashboardStats;
  const upcoming = stats?.upcomingDeadlines.items ?? [];
  const nearest = upcoming[0];
  const moreUpcoming = upcoming.slice(1, 3);
  const activeApplications = applications.filter((application) => application.status === 'In Progress');
  const fieldAnalytics = stats?.fieldReuseAnalytics ?? [];
  const autoMappedCount = fieldAnalytics.reduce((total, item) => total + item.autoMapped, 0);
  const manualCount = fieldAnalytics.reduce((total, item) => total + item.manualReview, 0);
  const mappedTotal = autoMappedCount + manualCount;
  const mappedPercent = mappedTotal > 0 ? (autoMappedCount / mappedTotal) * 100 : 0;
  const hoursSaved = autoMappedCount * MINUTES_SAVED_PER_AUTO_MAPPED_FIELD_ESTIMATE / 60;
  const hasFieldAnalytics = fieldAnalytics.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 md:grid-cols-12">
        <section className="hero-marble relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7 md:col-span-8" aria-labelledby="profile-progress-title">
          <div aria-hidden="true" className="hero-paper-texture" />
             <div className="relative z-10 flex h-full flex-col">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide text-white/90 sm:text-[11px]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Unified National Exam Command Center · One profile, every exam, zero repetition
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-2">
              <h2 id="profile-progress-title" className="font-display text-6xl font-extrabold leading-none tracking-[-0.075em] tabular-nums sm:text-7xl">
                {profileCompletion.overall}%
              </h2>
              <span className="mb-1 rounded-full border border-white/35 bg-white/90 px-3 py-1 text-[10px] font-bold text-registra-dark shadow-sm">
                {profileCompletion.overall >= 90 ? 'Profile near complete' : 'Profile in progress'}
              </span>
            </div>

            <div className="mt-4 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/30 bg-white/20 p-1 text-[10px] font-semibold text-white nav-scrollbar-hidden" aria-label="Filter profile progress by exam">
              <button
                type="button"
                onClick={() => setSelectedExamId('all')}
                aria-pressed={selectedExamId === 'all'}
                className={`shrink-0 rounded-full px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-registra-dark ${
                  selectedExamId === 'all' ? 'bg-white text-registra-dark' : 'text-white hover:bg-white/15'
                }`}
              >
                All exams
              </button>
              {applicationExams.map((application) => (
                <button
                  type="button"
                  key={application.examId}
                  onClick={() => setSelectedExamId(application.examId)}
                  aria-pressed={selectedExamId === application.examId}
                  className={`max-w-32 shrink-0 truncate rounded-full px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-registra-dark ${
                    selectedExamId === application.examId ? 'bg-white text-registra-dark' : 'text-white hover:bg-white/15'
                  }`}
                >
                  {application.examName}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
              {profileSections.map((section) => {
                const isCurrent = currentSectionId === section.id;
                return (
                  <div key={section.id} className="min-w-0">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/35">
                      <div
                        className="h-full rounded-full bg-white transition-[width]"
                        style={{ width: `${section.total > 0 ? Math.min((section.filled / section.total) * 100, 100) : 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 truncate text-[10px] font-semibold text-white">{section.label}</div>
                    <div className="text-[9px] text-white/90">
                      {section.completed
                        ? 'Done'
                        : isCurrent
                          ? `Now · ${section.filled} / ${section.total}`
                          : `${section.filled} / ${section.total}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hero-glass mt-4 rounded-2xl p-3 sm:px-4 sm:py-3">
              {documentsRemaining > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold">
                      {documentsRemaining} document{documentsRemaining === 1 ? '' : 's'} left in your vault
                    </span>
                    <span className="text-[10px] font-semibold text-white/90">
                      {uploadedDocuments} / {requiredDocuments}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-white/80">
                    Complete the required uploads to finish your document profile.
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/35">
                    <div className="h-full rounded-full bg-white" style={{ width: `${documentProgress}%` }} />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  All required documents are in your vault · {uploadedDocuments} / {requiredDocuments}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openWorkflow()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-bold text-registra-dark shadow-sm transition hover:bg-registra-light focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-registra-dark sm:text-[11px]"
              >
                Launch Smart Application Flow
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('eligibility')}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/55 bg-white/10 px-4 py-2 text-[10px] font-bold text-white transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-registra-dark sm:text-[11px]"
              >
                Check Eligibility Matrix
              </button>
            </div>
          </div>
        </section>

        <section className="surface-card flex min-h-[300px] flex-col rounded-3xl p-5 sm:p-6 md:col-span-4" aria-labelledby="nearest-deadline-title">
          {stats ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p id="nearest-deadline-title" className="text-[10px] font-semibold text-muted sm:text-[11px]">
                  Nearest deadline · {stats.upcomingDeadlines.count} upcoming
                </p>
                {nearest?.isUrgent && (
                  <span className="shrink-0 rounded-full bg-registra px-2.5 py-1 text-[9px] font-bold text-white">High urgency</span>
                )}
              </div>
              {nearest ? (
                <>
                  <div className="font-display mt-3 text-5xl font-extrabold leading-none tracking-[-0.07em] text-ink sm:text-[3.5rem]">
                    {stats.upcomingDeadlines.nearestDaysRemaining ?? nearest.daysRemaining} days
                  </div>
                  <div className="mt-2">
                    <h2 className="text-xs font-bold text-ink">{stats.upcomingDeadlines.nearestExamName || nearest.name}</h2>
                    <p className="mt-0.5 text-[10px] text-muted">Deadline: {dateOnly(stats.upcomingDeadlines.nearestDeadline || nearest.deadline)}</p>
                  </div>
                  <div className="my-4 h-px bg-registra/10" />
                  <div className="space-y-3">
                    {moreUpcoming.map((item) => (
                      <div key={item.examId} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold text-ink">{item.name}</p>
                          <p className="text-[9px] text-muted">Deadline: {dateOnly(item.deadline)}</p>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold text-registra-dark">{item.daysRemaining} days left</span>
                      </div>
                    ))}
                    {moreUpcoming.length === 0 && (
                      <p className="text-[10px] text-muted">No other upcoming deadlines.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deadlines')}
                    className="mt-auto self-start pt-4 text-[10px] font-bold text-registra-dark underline decoration-registra/40 underline-offset-2 hover:text-registra focus-visible:rounded-sm"
                  >
                    Open deadline calendar
                  </button>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <Clock3 aria-hidden="true" className="mb-3 h-8 w-8 text-registra/50" />
                  <p className="text-sm font-bold text-ink">No upcoming deadlines</p>
                  <p className="mt-1 max-w-56 text-[10px] leading-relaxed text-muted">Verified registration dates will appear here when available.</p>
                  <button type="button" onClick={() => setActiveTab('deadlines')} className="mt-4 text-[10px] font-bold text-registra-dark underline underline-offset-2">
                    Open deadline calendar
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4" aria-label="Loading deadline data">
              <div className="skeleton h-4 w-40 rounded-full" />
              <div className="skeleton h-14 w-52 rounded-2xl" />
              <div className="skeleton h-4 w-36 rounded-full" />
              <div className="skeleton mt-8 h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-3/4 rounded-full" />
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="surface-card flex min-w-0 flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="applications-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="applications-title" className="font-display text-lg font-bold text-ink">Applications</h2>
              {stats ? (
                <p className="mt-0.5 text-[10px] text-muted">
                  {stats.applicationsInProgress.inProgress} in progress · {stats.applicationsInProgress.completed} completed
                </p>
              ) : (
                <div className="skeleton mt-2 h-3 w-36 rounded-full" />
              )}
            </div>
            <FileText aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-registra" />
          </div>

          {stats ? (
            activeApplications.length > 0 ? (
              <div className="mt-4 space-y-2">
                {activeApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between gap-2 rounded-2xl bg-registra-light/65 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-ink">{application.examName}</p>
                      <p className="mt-0.5 text-[9px] text-muted">Deadline: {dateOnly(application.deadline)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openWorkflow(application.examId)}
                      className="shrink-0 rounded-full bg-registra px-3.5 py-1.5 text-[9px] font-bold text-white transition hover:bg-registra-dark focus-visible:ring-2 focus-visible:ring-registra focus-visible:ring-offset-2"
                    >
                      Resume
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-registra/20 bg-white/45 px-3 py-5 text-center">
                <p className="text-[11px] font-semibold text-ink">No applications in progress</p>
                <p className="mt-1 text-[10px] text-muted">Start an application when you are ready.</p>
                <button type="button" onClick={() => openWorkflow()} className="mt-3 rounded-full bg-registra px-3.5 py-1.5 text-[9px] font-bold text-white hover:bg-registra-dark">
                  Start an application
                </button>
              </div>
            )
          ) : (
            <div className="mt-4 space-y-2" aria-label="Loading applications">
              <div className="skeleton h-12 rounded-2xl" />
              <div className="skeleton h-12 rounded-2xl" />
            </div>
          )}
          <div className="mt-auto pt-4 text-[9px] leading-relaxed text-muted">
            {stats ? (
              <>
                {stats.examsAvailable.total} exams available · {stats.examsAvailable.activeRegistration} active registrations · {stats.examsAvailable.eligibleCount} match your profile
              </>
            ) : (
              <div className="skeleton h-3 w-full rounded-full" />
            )}
          </div>
        </section>

        <section className="surface-card flex min-w-0 flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="tarteeb-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="tarteeb-title" className="font-display text-lg font-bold text-ink">Tarteeb</h2>
            <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-registra" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Our Chrome extension opens the official exam form and fills it from your verified profile. It stops before the final step, so you review every field and submit yourself.
          </p>
          {TARTEEB_EXTENSION_URL ? (
            <a
              href={TARTEEB_EXTENSION_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full bg-registra px-4 py-2 text-[10px] font-bold text-white transition hover:bg-registra-dark focus-visible:ring-2 focus-visible:ring-registra focus-visible:ring-offset-2"
            >
              Open Tarteeb <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button type="button" disabled className="mt-4 inline-flex min-h-9 w-fit items-center rounded-full bg-registra-dark px-4 py-2 text-[10px] font-bold text-white">
              Coming soon
            </button>
          )}
        </section>

        <section className="surface-card flex min-w-0 flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="time-saved-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="time-saved-title" className="font-display text-lg font-bold text-ink">Time saved</h2>
            <span
              title={`Estimate assumes ${MINUTES_SAVED_PER_AUTO_MAPPED_FIELD_ESTIMATE} minutes saved per auto-mapped field.`}
              aria-label={`Estimated using ${MINUTES_SAVED_PER_AUTO_MAPPED_FIELD_ESTIMATE} minutes per auto-mapped field`}
              className="cursor-help rounded-full bg-registra-light px-2.5 py-1 text-[9px] font-semibold text-registra-dark"
            >
              Estimate ⓘ
            </span>
          </div>
          {stats ? (
            hasFieldAnalytics && mappedTotal > 0 ? (
              <>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-display text-4xl font-extrabold leading-none tracking-[-0.06em] text-ink tabular-nums sm:text-[2.6rem]">
                    {hoursSaved.toFixed(1)} hours
                  </span>
                  <span className="text-[9px] text-muted">on form filling</span>
                </div>
                <div
                  className="mt-4 flex h-2 overflow-hidden rounded-full bg-registra-light"
                  role="img"
                  aria-label={`${autoMappedCount} auto-mapped fields and ${manualCount} fields requiring manual review`}
                >
                  <div className="h-full rounded-full bg-registra transition-[width]" style={{ width: `${mappedPercent}%` }} />
                  <div className="h-full flex-1 bg-manual-track" />
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-muted">Auto-mapped fields vs fields filled manually.</p>
              </>
            ) : (
              <div className="mt-4 flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-registra/20 bg-white/45 p-4">
                <p className="text-[11px] font-semibold text-ink">No field mapping data yet</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">Time estimates will appear when exam fields are mapped from your profile.</p>
              </div>
            )
          ) : (
            <div className="mt-4 space-y-3" aria-label="Loading field reuse data">
              <div className="skeleton h-10 w-40 rounded-2xl" />
              <div className="skeleton h-2 w-full rounded-full" />
              <div className="skeleton h-3 w-3/4 rounded-full" />
            </div>
          )}
        </section>
      </div>

      <section className="surface-card flex flex-col gap-3 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" aria-label="Zero Repetition Shield">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-registra-light text-registra">
            <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-ink">Zero Repetition Shield</h2>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              Your credentials are auto-mapped and never auto-submitted without your final verification step.
            </p>
          </div>
        </div>
        <span className="ml-12 w-fit shrink-0 rounded-full bg-registra px-3 py-1 text-[9px] font-bold text-white sm:ml-0">Active</span>
      </section>
    </div>
  );
};
