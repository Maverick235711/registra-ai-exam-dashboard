import React, { useState } from 'react';
import { X, Download, Copy, Check, ExternalLink, Sparkles, Code2, Eye } from 'lucide-react';
import { RegistraLogo, RegistraIcon } from './RegistraLogo';
import { useApp } from '../context/AppContext';

interface LogoShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoShowcaseModal: React.FC<LogoShowcaseModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'vector' | 'specs' | 'render'>('vector');

  if (!isOpen) return null;

  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60" fill="none">
  <!-- Solid Pure White Background -->
  <rect width="240" height="60" fill="#FFFFFF"/>
  <!-- Electric-Blue Document and Checkmark Icon (#4563F5) -->
  <g transform="translate(14, 11)">
    <rect x="3" y="3" width="21" height="30" rx="3" stroke="#4563F5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 19L16 25L30 9" stroke="#4563F5" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <!-- Dark Navy Typography (#172554) -->
  <text x="64" y="38" fill="#172554" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">REGISTRA</text>
</svg>`;

  const handleCopySvg = () => {
    navigator.clipboard.writeText(rawSvg);
    setCopied(true);
    addToast('SVG vector code copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([rawSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'registra-logo.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Downloaded registra-logo.svg', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Official Brand Identity
              </span>
              <h3 className="text-base font-bold text-slate-900">REGISTRA Minimal Logo</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Flat vector geometric icon with dark navy typography on pure white background.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            aria-label="Close brand modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('vector')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'vector'
                ? 'border-[#4563F5] text-[#4563F5]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Vector Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'specs'
                ? 'border-[#4563F5] text-[#4563F5]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Color & Geometric Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('render')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'render'
                ? 'border-[#4563F5] text-[#4563F5]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Raster High-Res Asset
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'vector' && (
            <div className="space-y-6">
              {/* Primary White Canvas Lockup */}
              <div className="p-8 sm:p-12 rounded-2xl bg-white border-2 border-slate-200/80 flex flex-col items-center justify-center text-center shadow-inner">
                <RegistraLogo variant="horizontal" theme="light" size="xl" />
                <span className="text-[11px] text-slate-400 font-mono mt-4">
                  Flat Vector Lockup · Pure White Background
                </span>
              </div>

              {/* Scalability Matrix: At small, medium, and icon sizes */}
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-3">
                  Scalability & Visual Legibility Test:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Small (16-24px icon) */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">Small (18px)</span>
                    <RegistraLogo variant="horizontal" theme="light" size="sm" />
                  </div>

                  {/* Medium (28px icon) */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">Standard (28px)</span>
                    <RegistraLogo variant="horizontal" theme="light" size="md" />
                  </div>

                  {/* Icon Only Favicon */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">Icon Only Favicon</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      <RegistraIcon size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Electric Blue Spec */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="w-full h-16 rounded-xl bg-[#4563F5] flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm">
                    #4563F5
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Primary Electric Blue</span>
                    <span className="text-slate-500 text-[11px]">
                      Applied to document silhouette and completed checkmark. Represents technology, momentum, and trust.
                    </span>
                  </div>
                </div>

                {/* Dark Navy Spec */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="w-full h-16 rounded-xl bg-[#172554] flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm">
                    #172554
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Dark Navy Typography</span>
                    <span className="text-slate-500 text-[11px]">
                      Applied to uppercase REGISTRA sans-serif wordmark. Delivers high contrast, timeless readability, and authority.
                    </span>
                  </div>
                </div>
              </div>

              {/* Geometry Guidelines */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-700">
                <span className="font-bold text-slate-900 block text-xs">Geometric Construction</span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li><strong>Document Ratio</strong>: 1:1.33 proportions with 2.5px radius corners.</li>
                  <li><strong>Checkmark Angle</strong>: 45° descending lead stroke and 45° ascending follow-through.</li>
                  <li><strong>Stroke Uniformity</strong>: Constant stroke weight for optical symmetry at micro sizes.</li>
                  <li><strong>Zero Clutter</strong>: No gradients, no dropshadows, no bevels, no tagline clutter.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'render' && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <img
                  src="/src/assets/images/registra_minimal_logo_1794131621363.jpg"
                  alt="REGISTRA Minimal Flat Vector Logo on White"
                  className="w-full h-auto object-contain max-h-80"
                />
              </div>
              <p className="text-xs text-slate-500">
                Official 16:9 flat vector render on solid white background.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied SVG' : 'Copy SVG Code'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#4563F5] hover:bg-blue-600 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Vector SVG</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
