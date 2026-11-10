import React from 'react';
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
import { getDaysRemaining } from '../utils/eligibilityEngine';

export const DeadlineCalendarView: React.FC = () => {
  const { openWorkflow, addToast, exams } = useApp();

  // Flatten events
  interface TimelineEvent {
    id: string;
    examName: string;
    authority: string;
    eventType: 'Registration Opens' | 'Registration Close' | 'Admit Card' | 'Exam Date';
    date: string;
    daysRemaining: number;
    urgency: 'high' | 'medium' | 'normal';
    examId: string;
  }

  const events: TimelineEvent[] = [];

  const addEvent = (exam: typeof exams[number], eventType: TimelineEvent['eventType'], date: string) => {
    const daysRemaining = getDaysRemaining(date);
    if (daysRemaining === null || daysRemaining < 0) return;
    events.push({
      id: `${exam.id}_${eventType.replace(/\s+/g, '_')}`,
      examName: exam.name,
      authority: exam.authority,
      eventType,
      date,
      daysRemaining,
      urgency: eventType === 'Registration Close' && daysRemaining <= 20
        ? 'high'
        : eventType === 'Registration Close' && daysRemaining <= 45
          ? 'medium'
          : 'normal',
      examId: exam.id,
    });
  };

  exams.forEach((exam) => {
    if (exam.status === 'Upcoming') addEvent(exam, 'Registration Opens', exam.applicationOpenDate);
    if (exam.status === 'Registration Open') addEvent(exam, 'Registration Close', exam.applicationDeadline);
    addEvent(exam, 'Admit Card', exam.admitCardDate);
    addEvent(exam, 'Exam Date', exam.examDate);
  });

  // Sort events chronologically
  const sortedEvents = events.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const downloadCalendar = (items: TimelineEvent[]) => {
    const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    const calendarEvents = items.map((event) => {
      const start = event.date.replaceAll('-', '');
      const nextDay = new Date(`${event.date}T00:00:00.000Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const end = nextDay.toISOString().slice(0, 10).replaceAll('-', '');
      return [
        'BEGIN:VEVENT',
        `UID:${event.id}@registra`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeText(`${event.examName} - ${event.eventType}`)}`,
        `DESCRIPTION:${escapeText(event.authority)}`,
        'END:VEVENT',
      ].join('\r\n');
    });
    const file = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//REGISTRA//Exam Dates//EN\r\n${calendarEvents.join('\r\n')}\r\nEND:VCALENDAR\r\n`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'registra-exam-dates.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">National Examination Timelines & Milestones</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Verified Exam Dates
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Upcoming dates are calculated from verified examination records. Only published future registration, admit-card, and examination dates are shown.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!sortedEvents.length) return;
            downloadCalendar(sortedEvents);
            addToast(`Downloaded ${sortedEvents.length} exam dates. Import the file into your calendar.`, 'success');
          }}
          disabled={!sortedEvents.length}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Download Calendar (.ics)</span>
        </button>
      </div>

      {/* Timeline Events List */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Chronological Exam Milestones</h3>
          <span className="text-xs text-slate-400 tabular-nums">{sortedEvents.length} Events</span>
        </div>

        <div className="space-y-3">
          {sortedEvents.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
              No upcoming dates are available from verified exam records.
            </p>
          )}
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
                      onClick={() => downloadCalendar([evt])}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                      title="Add to Google Calendar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {isReg && evt.daysRemaining >= 0 && (
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
