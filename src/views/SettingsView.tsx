import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Bell, 
  Key, 
  Download, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Lock,
  Database,
  Palette,
  Eye,
  Code2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RegistraLogo, RegistraIcon } from '../components/RegistraLogo';

export const SettingsView: React.FC = () => {
  const { profile, addToast, setLogoModalOpen } = useApp();

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
                Receive urgent SMS warnings at {profile.personalInfo.phoneNumber} 48 hours prior to portal closure.
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
                Keep candidate roll numbers and certificates verified against Central Examination databases.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Sync
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Final Submission Human-in-the-Loop Barrier</div>
              <p className="text-slate-500 text-[11px]">
                Guarantees that official payment and final submission are never made without explicit student signature.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Enforced Always
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

      {/* Brand Identity & Logo System */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Official Brand Identity & Logo Assets</h3>
          </div>
          <button
            type="button"
            onClick={() => setLogoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Brand Specs</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Ultra-minimal, modern flat vector logo combining a geometric document outline and an effortless checkmark in electric blue (<code className="text-[#4563F5] font-mono font-semibold">#4563F5</code>) and dark navy (<code className="text-[#172554] font-mono font-semibold">#172554</code>) on pure white.
        </p>

        {/* Pure White Background Logo Canvas */}
        <div className="p-6 sm:p-8 rounded-xl bg-white border-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <RegistraLogo variant="horizontal" theme="light" size="lg" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              #4563F5 Icon
            </span>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-[#172554] border border-slate-200 font-semibold">
              #172554 Typography
            </span>
          </div>
        </div>
      </div>

      {/* Cloud & Local Storage Stats */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Storage Architecture</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your credentials and documents are stored in local encrypted cache, ready for connection to Firebase Firestore & Google Cloud Run.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Vault Capacity</span>
            <span className="font-bold text-slate-800">4.3 MB / 50 MB</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Backend Ready</span>
            <span className="font-bold text-emerald-600">Firebase Firestore</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">AI Model SDK</span>
            <span className="font-bold text-indigo-600">@google/genai (v2.4)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
