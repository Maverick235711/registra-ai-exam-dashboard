import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Download, 
  Filter, 
  Eye, 
  Zap, 
  Check,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApplicationRecord } from '../types';

export const MyApplicationsView: React.FC = () => {
  const { applications, openWorkflow, addToast } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeAppModal, setActiveAppModal] = useState<ApplicationRecord | null>(null);

  const statuses = ['All', 'In Progress', 'Completed', 'Pending', 'Needs Review'];

  const filteredApps = applications.filter(app => 
    selectedStatus === 'All' || app.status === selectedStatus
  );

  const handleDownloadSlip = (app: ApplicationRecord) => {
    addToast(`Generated verification slip for ${app.examName}`, 'success');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Application Pipeline</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Zero Form Repetition
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Every field you fill once is automatically synchronized across all entrance exam registrations. 
            Review drafts and manage official portal submission tokens.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openWorkflow('exam_jee_main')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Start New Application</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
              selectedStatus === status
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Applications Table Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="overflow-x-auto">
          {filteredApps.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No applications found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {selectedStatus === 'All' 
                  ? 'You have not created any examination applications yet. Select an exam from Find Exams to start an auto-mapped application.' 
                  : `No applications currently have status "${selectedStatus}".`}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 pl-1">Examination</th>
                <th className="pb-3">Authority</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Field Mapping</th>
                <th className="pb-3">Last Updated</th>
                <th className="pb-3">Deadline</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredApps.map((app) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (app.status === 'Completed') badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                if (app.status === 'In Progress') badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                if (app.status === 'Pending') badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                if (app.status === 'Needs Review') badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';

                return (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pl-1">
                      <div className="font-bold text-slate-900">{app.examName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{app.applicationNumber || 'Draft Mode'}</div>
                    </td>
                    <td className="py-4 text-slate-600">{app.authority}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${(app.mappedFieldsCount / app.totalFieldsCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {app.mappedFieldsCount}/{app.totalFieldsCount}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-500 tabular-nums">{app.lastUpdated}</td>
                    <td className="py-4 text-slate-800 font-semibold tabular-nums">{app.deadline}</td>
                    <td className="py-4 text-right pr-1">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveAppModal(app)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Inspect application package"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {app.status === 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadSlip(app)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                          >
                            Slip
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {activeAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Application Package</span>
                <h3 className="text-base font-bold text-slate-900">{activeAppModal.examName}</h3>
                <p className="text-xs text-slate-500">Authority: {activeAppModal.authority}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Application ID</span>
                  <span className="font-mono font-medium text-slate-800">{activeAppModal.applicationNumber || 'Draft Pending'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Registration Deadline</span>
                  <span className="font-semibold text-rose-600">{activeAppModal.deadline}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Status</span>
                  <span className="font-semibold text-indigo-600">{activeAppModal.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Auto-Mapped Fields</span>
                  <span className="font-mono font-semibold text-emerald-600">{activeAppModal.mappedFieldsCount} / {activeAppModal.totalFieldsCount}</span>
                </div>
              </div>

              {activeAppModal.missingFields.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Missing Fields Required for Portal Submission</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                    {activeAppModal.missingFields.map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[11px] leading-relaxed">
                <strong>Zero Repetition Guarantee:</strong> Once verified, your candidate name, date of birth, category, 10th and 12th marks, photo, and signature remain sealed in your REGISTRA profile.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={activeAppModal.officialPortalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <span>Visit Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAppModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const examId = activeAppModal.examId;
                    setActiveAppModal(null);
                    openWorkflow(examId);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Resume in AI Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
