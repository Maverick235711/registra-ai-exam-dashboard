import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Calendar, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpDown,
  Compass,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { examDatabase } from '../data/mockData';
import { ExamCategory } from '../types';
import { getDaysRemaining } from '../utils/eligibilityEngine';

export const FindExamsView: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    setActiveTab, 
    setSelectedExamForEligibility, 
    openWorkflow,
    exams
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'deadline' | 'name' | 'fee'>('deadline');

  const categories: (ExamCategory | 'All')[] = [
    'All',
    'Engineering',
    'Medical',
    'Undergraduate',
    'Management',
    'Civil Services',
    'Government & Banking',
  ];

  const activeExams = exams && exams.length > 0 ? exams : examDatabase;

  // Filtering
  const filteredExams = activeExams.filter((exam) => {
    // Search query
    const matchesSearch =
      !searchQuery ||
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Category
    const matchesCat = selectedCategory === 'All' || exam.category === selectedCategory;

    // Status
    const matchesStatus = selectedStatus === 'All' || exam.status === selectedStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Sorting
  const sortedExams = [...filteredExams].sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'fee') {
      return a.feeINR.general - b.feeINR.general;
    }
    return 0;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">National Competitive Examinations</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Verified Portals
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Search across Central & State Entrance tests. Instant one-click eligibility check and 
            auto-prefilled applications using your REGISTRA profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Showing:</span>
          <span className="text-xs font-bold text-slate-900 tabular-nums">
            {sortedExams.length} Examinations
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="space-y-3">
        {/* Category Pills (functional filter buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Sorts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by exam name, syllabus keywords, or conducting agency..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Registration Open">Registration Open</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
            >
              <option value="deadline">Sort by Deadline</option>
              <option value="name">Sort by Name</option>
              <option value="fee">Sort by Application Fee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedExams.map((exam) => {
          const daysLeft = getDaysRemaining(exam.applicationDeadline);
          const isOpen = exam.status === 'Registration Open';

          return (
            <div
              key={exam.id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all space-y-4"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
                      {exam.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {exam.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {exam.authority}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isOpen
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {exam.status}
                  </span>
                </div>

                {/* Eligibility summary */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-3 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                    Eligibility Criteria:
                  </span>
                  {exam.eligibilitySummary}
                </div>

                {/* Dates & Fees */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-3">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Opens</span>
                    <span className="font-medium tabular-nums text-slate-800">{exam.applicationOpenDate}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Deadline</span>
                    <span className={`font-semibold tabular-nums ${daysLeft <= 25 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {exam.applicationDeadline} {daysLeft > 0 ? `(${daysLeft}d)` : ''}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Exam Date</span>
                    <span className="font-medium tabular-nums text-slate-800">{exam.examDate}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Fee (General)</span>
                    <span className="font-medium tabular-nums text-slate-800">₹{exam.feeINR.general}</span>
                  </div>
                </div>

                {/* Official Link */}
                <a
                  href={exam.officialWebsite}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <span>Official Website ({exam.authority.split(' ')[0]})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExamForEligibility(exam.id);
                    setActiveTab('eligibility');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Check Eligibility</span>
                </button>

                <button
                  type="button"
                  onClick={() => openWorkflow(exam.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Apply with AI</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sortedExams.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No examinations matched your filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the search terms or category selection.</p>
        </div>
      )}
    </div>
  );
};
