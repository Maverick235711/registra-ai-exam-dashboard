import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let style = 'bg-slate-900 text-white border-slate-800';
        let iconStyle = 'text-emerald-400';

        if (toast.type === 'warning') {
          Icon = AlertTriangle;
          style = 'bg-amber-950 text-amber-100 border-amber-800';
          iconStyle = 'text-amber-400';
        } else if (toast.type === 'info') {
          Icon = Info;
          style = 'bg-indigo-950 text-indigo-100 border-indigo-800';
          iconStyle = 'text-indigo-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border ${style} animate-in slide-in-from-bottom-2 fade-in duration-200`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconStyle}`} />
            <p className="text-xs font-medium leading-relaxed flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
