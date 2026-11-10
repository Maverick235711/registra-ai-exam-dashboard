import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  Search,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import type { ExamDirectoryEntry, ExamDirectoryStatus } from '../types';
import { getDaysRemaining } from '../utils/eligibilityEngine';

const categories = [
  'UPSC',
  'SSC',
  'Railways',
  'Banking & Insurance',
  'Engineering',
  'Medical',
  'Management',
  'Undergraduate',
  'Teaching & Eligibility',
];

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const statusLabels: Record<ExamDirectoryStatus, string> = {
  upcoming: 'Upcoming',
  open: 'Registration open',
  closed: 'Closed',
  tbd: 'To be announced',
};

const formatDate = (date: string | null): string =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) : 'Not announced';

const VerifiedNote: React.FC<{ date: string | null }> = ({ date }) => (
  <p className="text-[11px] text-slate-400">
    {date ? `Last verified on ${formatDate(date)}` : 'Verification date unavailable'}
  </p>
);

const Disclaimer: React.FC = () => (
  <p className="text-[11px] text-slate-500">
    Always confirm dates and fees on the official website.
  </p>
);

const ExamDetailPage: React.FC<{ slug: string; onBack: () => void }> = ({ slug, onBack }) => {
  const [exam, setExam] = useState<ExamDirectoryEntry | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void apiService.getExamBySlug(slug).then((result) => {
      if (active) setExam(result);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load exam details.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading exam details…</div>;
  if (error || !exam) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-indigo-600"><ArrowLeft size={16} /> Back to exams</button>
        <p role="alert" className="text-sm text-rose-700">{error || 'Exam not found.'}</p>
      </div>
    );
  }

  const timeline = [
    ['Registration opens', exam.registrationStartDate],
    ['Registration closes', exam.registrationEndDate],
    ['Admit card', exam.admitCardDate],
    ['Exam date', exam.examDate],
    ['Result', exam.resultDate],
  ] as const;
  const feeSummary = exam.applicationFee
    ? [
        exam.applicationFee.general === null ? null : `General: ₹${exam.applicationFee.general}`,
        exam.applicationFee.reserved === null ? null : `Reserved: ₹${exam.applicationFee.reserved}`,
      ].filter(Boolean).join(' · ') || 'Not announced'
    : 'Not announced';

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        <ArrowLeft size={16} /> Back to exams
      </button>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{exam.category}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{exam.level === 'national' ? 'National' : exam.state}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{statusLabels[exam.status]}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{exam.name}</h1>
            {exam.shortName && <p className="mt-1 text-sm text-slate-500">{exam.shortName}</p>}
            <p className="mt-3 text-sm font-medium text-slate-700">{exam.conductingBody}</p>
          </div>
          {exam.registrationUrl ? (
            <a href={exam.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              Apply on official site <ExternalLink size={15} />
            </a>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-center text-xs text-slate-500">Registration link not announced</span>
          )}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailFact label="Eligibility" value={exam.eligibility} />
          <DetailFact label="Age limit" value={exam.ageLimit} />
          <DetailFact label="Application fee" value={feeSummary} />
          <DetailFact label="Mode" value={exam.mode} />
          <DetailFact label="Frequency" value={exam.frequency} />
          <DetailFact label="Registration window" value={`${formatDate(exam.registrationStartDate)} – ${formatDate(exam.registrationEndDate)}`} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays size={16} className="text-indigo-600" /> Important dates</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {timeline.map(([label, date]) => (
            <li key={label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
              <Clock3 size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div><p className="text-xs font-medium text-slate-600">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(date)}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-wrap gap-4">
          <OfficialLink label="Official website" url={exam.officialWebsite} />
          <OfficialLink label="Notification" url={exam.notificationUrl} />
          <OfficialLink label="Syllabus" url={exam.syllabusUrl} />
          <OfficialLink label="Source" url={exam.sourceUrl} />
        </div>
        <div className="space-y-1"><VerifiedNote date={exam.lastVerifiedAt} /><Disclaimer /></div>
      </section>
    </div>
  );
};

const DetailFact: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-slate-800">{value || 'Not announced'}</p>
  </div>
);

const OfficialLink: React.FC<{ label: string; url: string | null }> = ({ label, url }) => url ? (
  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
    {label} <ExternalLink size={13} />
  </a>
) : null;

export const FindExamsView: React.FC = () => {
  const { searchQuery, setSearchQuery, setActiveTab, setSelectedExamForEligibility, openWorkflow } = useApp();
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof apiService.getExamDirectory>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      void apiService.getExamDirectory({
        ...(category ? { category } : {}),
        ...(level ? { level: level as 'national' | 'state' } : {}),
        ...(state ? { state } : {}),
        ...(status ? { status: status as ExamDirectoryStatus } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        page,
        limit: 12,
        sortOrder,
      }).then((result) => {
        if (active) setData(result);
      }).catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load exams.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, level, state, status, searchQuery, page, sortOrder]);

  useEffect(() => { setPage(1); }, [category, level, state, status, searchQuery, sortOrder]);

  if (selectedSlug) return <ExamDetailPage slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;

  const clearFilters = () => {
    setCategory('');
    setLevel('');
    setState('');
    setStatus('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Indian Competitive Exams</h1>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Official sources</span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500">Explore verified national exam information, registration links, and official notices.</p>
        </div>
        <p className="shrink-0 text-xs text-slate-500"><strong className="text-slate-900">{data?.pagination.total ?? 0}</strong> exams</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search exams" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-500" />
        </label>
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Level" value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <option value="">National and state</option><option value="national">National</option><option value="state">State</option>
        </select>
        <select aria-label="State" value={state} onChange={(event) => setState(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <option value="">All states</option>{states.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Registration status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <option value="">All statuses</option>
          {(['open', 'upcoming', 'closed', 'tbd'] as const).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <select aria-label="Registration end date order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <option value="asc">End date: earliest first</option><option value="desc">End date: latest first</option>
        </select>
        <button type="button" onClick={clearFilters} className="text-left text-xs font-medium text-indigo-600 hover:text-indigo-800">Clear filters</button>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading exam directory…</div>}
      {!loading && !error && data?.exams.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Compass className="mx-auto mb-2 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-700">No exams match these filters</h2>
          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-medium text-indigo-600">Reset filters</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loading && data?.exams.map((exam) => <ExamCard key={exam.slug} exam={exam} onDetails={() => setSelectedSlug(exam.slug)} onEligibility={() => {
          setSelectedExamForEligibility(exam.id);
          setActiveTab('eligibility');
        }} onWorkflow={() => openWorkflow(exam.id)} />)}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-40">Previous</button>
          <span className="text-xs text-slate-500">Page {page} of {data.pagination.totalPages}</span>
          <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

const ExamCard: React.FC<{
  exam: ExamDirectoryEntry;
  onDetails: () => void;
  onEligibility: () => void;
  onWorkflow: () => void;
}> = ({ exam, onDetails, onEligibility, onWorkflow }) => {
  const daysUntilClose = exam.registrationEndDate ? getDaysRemaining(exam.registrationEndDate) : null;
  const closingSoon = exam.status === 'open' && daysUntilClose !== null && daysUntilClose >= 0 && daysUntilClose <= 7;

  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{exam.category}{exam.state ? ` · ${exam.state}` : ''}</p>
            <h2 className="mt-1 text-base font-bold leading-snug text-slate-900">{exam.name}</h2>
            {exam.shortName && <p className="text-[11px] text-slate-500">{exam.shortName}</p>}
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${exam.status === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
            {statusLabels[exam.status]}
          </span>
        </div>
        <p className="text-xs font-medium text-slate-600">{exam.conductingBody}</p>
        {closingSoon && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
            <Clock3 size={13} /> Closing soon{daysUntilClose === 0 ? ' · today' : ` · ${daysUntilClose} days`}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Fact label="Registration opens" value={formatDate(exam.registrationStartDate)} />
          <Fact label="Registration closes" value={formatDate(exam.registrationEndDate)} />
        </div>
        <div className="mt-3 space-y-1"><VerifiedNote date={exam.lastVerifiedAt} /><Disclaimer /></div>
      </div>
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onDetails} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View exam details <span aria-hidden="true">→</span></button>
          {exam.registrationUrl ? (
            <a href={exam.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700">
              Apply on official site <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">Registration link not announced</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onEligibility} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-indigo-700"><Sparkles size={13} /> Check eligibility</button>
          <button type="button" onClick={onWorkflow} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-indigo-700"><CheckCircle2 size={13} /> Prepare application</button>
        </div>
      </div>
    </article>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-2.5">
    <p className="text-[10px] text-slate-400">{label}</p>
    <p className="mt-1 font-medium text-slate-800">{value}</p>
  </div>
);
