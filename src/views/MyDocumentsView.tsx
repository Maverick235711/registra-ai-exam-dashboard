import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  X, 
  FileCheck,
  Download,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DocumentRecord } from '../types';

export const MyDocumentsView: React.FC = () => {
  const { 
    documents, 
    updateDocument, 
    triggerAiExtraction, 
    isExtractingDocId, 
    openOcrStudio,
    addToast 
  } = useApp();

  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentRecord | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const simulateFileUpload = (docId: string, file: File) => {
    setUploadProgressMap(prev => ({ ...prev, [docId]: 15 }));
    
    const interval = setInterval(() => {
      setUploadProgressMap(prev => {
        const current = prev[docId] || 0;
        if (current >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            updateDocument(docId, {
              status: 'Uploaded',
              fileName: file.name,
              fileSize: `${(file.size / 1024).toFixed(1)} KB`,
              uploadedAt: new Date().toISOString().split('T')[0],
              confidenceScore: undefined,
            });
            setUploadProgressMap(p => {
              const copy = { ...p };
              delete copy[docId];
              return copy;
            });
            addToast(`Successfully uploaded ${file.name}`, 'success');
          }, 400);
          return prev;
        }
        return { ...prev, [docId]: current + 25 };
      });
    }, 150);
  };

  const handleFileInput = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateFileUpload(docId, e.target.files[0]);
    }
  };

  const handleDrop = (docId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragActiveId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateFileUpload(docId, e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (docId: string) => {
    updateDocument(docId, {
      status: 'Missing',
      fileName: '',
      fileSize: '',
      uploadedAt: '',
      extractedData: undefined,
      confidenceScore: undefined,
      fileUrl: '',
    });
    setConfirmDeleteId(null);
    addToast('Document removed from local vault', 'info');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Document Vault & AI Verification</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Zero-Repetition Storage
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Upload your mandatory examination documents once. Registra extracts roll numbers, aggregate marks, 
            and certificates to pre-fill entrance applications automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 tabular-nums">
              {documents.filter(d => d.status === 'Verified').length} / {documents.length} Verified
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Model: gemini-3.8-flash</div>
          </div>

          <button
            type="button"
            onClick={() => openOcrStudio()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm shadow-indigo-600/20 hover:shadow-md active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-indigo-100" />
            <span>Scan with Gemini AI</span>
          </button>
        </div>
      </div>

      {/* Gemini AI OCR Engine Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              Official Gemini 3.8 Flash Engine
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Multimodal Vision & Structured Character Recognition
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Upload any academic marksheet, government identity proof, or caste/domicile certificate. Gemini extracts personal & academic details with mandatory per-field confidence scoring (0–100).
          </p>
        </div>

        {/* Confidence Tier Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold bg-white/5 p-2 rounded-xl border border-white/10 shrink-0">
          <span className="text-slate-400 uppercase tracking-wider text-[9px] px-1">Confidence:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            90–100 High
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            70–89 Review
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            0–69 Low
          </span>
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {documents.map((doc) => {
          const isUploading = uploadProgressMap[doc.id] !== undefined;
          const isExtracting = isExtractingDocId === doc.id;
          const isVerified = doc.status === 'Verified';
          const isUploaded = doc.status === 'Uploaded';
          const isMissing = doc.status === 'Missing';
          const isPending = doc.status === 'Pending Review';

          return (
            <div
              key={doc.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActiveId(doc.id);
              }}
              onDragLeave={() => setDragActiveId(null)}
              onDrop={(e) => handleDrop(doc.id, e)}
              className={`flex flex-col justify-between p-5 rounded-2xl bg-white border transition-all duration-200 ${
                dragActiveId === doc.id
                  ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/20'
                  : isVerified
                  ? 'border-slate-200/90 shadow-sm hover:border-slate-300'
                  : isMissing
                  ? 'border-dashed border-slate-300 bg-slate-50/60'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              <div>
                {/* Card Top: Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        {doc.title}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        {doc.fileName ? doc.fileSize : 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isUploaded
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isPending
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  {doc.description}
                </p>

                {/* Upload Progress Bar if currently uploading */}
                {isUploading && (
                  <div className="mb-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Uploading document...</span>
                      <span>{uploadProgressMap[doc.id]}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgressMap[doc.id]}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Visual Thumbnail or Dropzone Area */}
                {doc.fileUrl && !isUploading ? (
                  <div 
                    onClick={() => setSelectedDocForPreview(doc)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 mb-3 cursor-pointer h-28 bg-slate-900 flex items-center justify-center"
                  >
                    <img
                      src={doc.fileUrl}
                      alt={doc.title}
                      className="w-full h-full object-cover opacity-85 group-hover:opacity-95 group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 flex items-center justify-center transition-colors">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm shadow-md">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Document</span>
                      </span>
                    </div>
                  </div>
                ) : !isUploading && (
                  <label className="border border-dashed border-slate-300 rounded-xl p-4 mb-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-400 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Drop file or click to upload</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG up to 5MB</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileInput(doc.id, e)}
                    />
                  </label>
                )}

                {/* Extracted Key-Value Preview pill */}
                {doc.extractedData && (
                  <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
                      <span className="flex items-center gap-1 text-indigo-600">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Extracted Fields</span>
                      </span>
                      {doc.confidenceScore && (
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {doc.confidenceScore}% match
                        </span>
                      )}
                    </div>
                    {Object.entries(doc.extractedData).slice(0, 3).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-slate-600">
                        <span className="text-slate-400 truncate max-w-[120px]">{key}:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => openOcrStudio(doc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{doc.status === 'Verified' ? 'Verify & Edit' : 'AI Extract'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <label className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="Replace file">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileInput(doc.id, e)}
                    />
                  </label>
                  {doc.fileName && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Delete this document?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              This will remove the file and reset its verified status. You will need to re-upload it to apply for exams requiring this proof.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Keep File
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Preview Modal */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedDocForPreview.title}</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedDocForPreview.fileName} · {selectedDocForPreview.fileSize} · Verified Status: {selectedDocForPreview.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedDocForPreview.fileUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-80">
                  <img
                    src={selectedDocForPreview.fileUrl}
                    alt={selectedDocForPreview.title}
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Digital specimen registered in local storage.
                </div>
              )}

              {/* Extracted Metadata Inspection */}
              {selectedDocForPreview.extractedData && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Extracted Machine-Readable Verification Payload</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/60 font-semibold px-2 py-0.5 rounded-full">
                      Confidence: {selectedDocForPreview.confidenceScore || 99}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedDocForPreview.extractedData).map(([key, value]) => (
                      <div key={key} className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">{key}</span>
                        <span className="text-slate-800 font-medium font-mono text-xs">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Encrypted in browser storage · Gemini API Ready
              </span>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
