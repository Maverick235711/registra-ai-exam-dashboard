import React, { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsView: React.FC = () => {
  const { profile, addToast } = useApp();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [autoMapEnabled, setAutoMapEnabled] = useState(true);

  const handleSaveSettings = () => {
    addToast('Preferences saved successfully', 'success');
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `registra_profile_${profile.personalInfo.fullName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Profile data exported as JSON package', 'success');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Security & Account Configuration</h2>
          <p className="text-xs text-slate-500">
            Control how your verified profile credentials and documents are protected.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportData}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Profile Package</span>
        </button>
      </div>

      {/* Zero Repetition Engine Settings */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Automation & Protection Rules</h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Auto-Map Profile Fields</div>
              <p className="text-slate-500 text-[11px]">
                Automatically fill secondary school marks and personal information into new exam forms.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoMapEnabled}
              onChange={(e) => setAutoMapEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Registration Deadline SMS Alerts</div>
              <p className="text-slate-500 text-[11px]">
                SMS delivery is not configured. Deadline dates are available in the dashboard and calendar; this preference does not send messages.
              </p>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={(e) => setSmsAlerts(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">DigiLocker & CBSE Academic Sync</div>
              <p className="text-slate-500 text-[11px]">
                No external DigiLocker or CBSE integration is configured; only information saved or uploaded to REGISTRA is available.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Not Connected
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Final Submission Human-in-the-Loop Barrier</div>
              <p className="text-slate-500 text-[11px]">
                REGISTRA prepares drafts only and does not submit applications or make payments on official portals.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Manual Submission
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
