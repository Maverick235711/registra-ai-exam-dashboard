import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  ChevronRight,
  Filter,
  Bell
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { examDatabase } from '../data/mockData';
import { getDaysRemaining } from '../utils/eligibilityEngine';

export const DeadlineCalendarView: React.FC = () => {
  const { openWorkflow, addToast, exams } = useApp();
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const months = ['All', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'May 2027'];

  const activeExams = exams && exams.length > 0 ? exams : examDatabase;

  // Flatten events
  interface TimelineEvent {
    id: string;
    examName: string;
    authority: string;
    eventType: 'Registration Close' | 'Admit Card' | 'Exam Date';
    date: string;
    daysRemaining: number;
    urgency: 'high' | 'medium' | 'normal';
    examId: string;
  }

  const events: TimelineEvent[] = [];

  activeExams.forEach((exam) => {
    // 1. Registration Close
    const regDays = getDaysRemaining(exam.applicationDeadline);
    events.push({
      id: `${exam.id}_reg`,
      examName: exam.name,
      authority: exam.authority,
      eventType: 'Registration Close',
      date: exam.applicationDeadline,
      daysRemaining: regDays,
      urgency: regDays <= 20 ? 'high' : regDays <= 45 ? 'medium' : 'normal',
      examId: exam.id,
    });

    // 2. Exam Date
    const examDays = getDaysRemaining(exam.examDate);
    events.push({
      id: `${exam.id}_exam`,
      examName: exam.name,
      authority: exam.authority,
      eventType: 'Exam Date',
      date: exam.examDate,
      daysRemaining: examDays,
      urgency: 'normal',
      examId: exam.id,
    });
  });

  // Sort events chronologically
  const sortedEvents = events.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleSyncCalendar = (event: TimelineEvent) => {
    addToast(`Exported reminder for ${event.examName} (${event.eventType})`, 'success');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">National Examination Timelines & Milestones</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Auto-Synced
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Real-time monitoring of application windows, fee payment cutoff times, and admit card releases. Never miss a critical deadline again.
          </p>
        </div>

        <button
          type="button"
          onClick={() => addToast('Synced 8 upcoming deadlines to Google Calendar', 'success')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Sync to My Calendar</span>
        </button>
      </div>

      {/* Timeline Events List */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Chronological Milestones (2026 - 2027)</h3>
          <span className="text-xs text-slate-400 tabular-nums">{sortedEvents.length} Events</span>
        </div>

        <div className="space-y-3">
          {sortedEvents.map((evt) => {
            const isUrgent = evt.urgency === 'high';
            const isReg = evt.eventType === 'Registration Close';

            return (
              <div
                key={evt.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isUrgent
                    ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/70'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{evt.examName}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                        isReg ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {evt.eventType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{evt.authority}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-slate-800 tabular-nums">{evt.date}</div>
                    <div className={`text-[11px] font-semibold ${isUrgent ? 'text-rose-600' : 'text-slate-500'}`}>
                      {evt.daysRemaining > 0 ? `${evt.daysRemaining} days remaining` : 'Date elapsed'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSyncCalendar(evt)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                      title="Add to Google Calendar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {isReg && evt.daysRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => openWorkflow(evt.examId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
