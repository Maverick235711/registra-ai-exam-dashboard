import React, { useMemo, useState } from 'react';
import { Download, Eye, FileText, RefreshCw, ScanSearch, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DocumentRecord, DocumentType } from '../types';
import { REQUIRED_PROFILE_DOCUMENTS } from '../utils/eligibilityEngine';

const requiredDocumentDetails: Record<DocumentType, string> = {
  class10_marksheet: 'Class 10 Marksheet',
  class12_marksheet: 'Class 12 Marksheet',
  photograph: 'Photograph',
  signature: 'Signature',
  identity_proof: 'Identity Proof',
  aadhaar_card: 'Aadhaar Card',
  passport: 'Passport',
  category_certificate: 'Category Certificate',
  domicile_certificate: 'Domicile Certificate',
  income_certificate: 'Income Certificate',
  transfer_certificate: 'Transfer Certificate',
  educational_certificate: 'Educational Certificate',
};

const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ocrSupportedTypes = new Set<DocumentType>([
  'class10_marksheet', 'class12_marksheet', 'aadhaar_card', 'passport', 'identity_proof',
  'category_certificate', 'domicile_certificate', 'income_certificate', 'transfer_certificate',
  'educational_certificate',
]);
const uploadAccept = '.pdf,.jpg,.jpeg,.png,.webp';

const formatUploadDate = (date: string | undefined) => {
  if (!date) return 'Upload date unavailable';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Upload date unavailable' : `Uploaded ${parsed.toLocaleDateString()}`;
};

export const MyDocumentsView: React.FC = () => {
  const { documents, uploadDocument, deleteDocument, openOcrStudio, addToast } = useApp();
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploadingDocIds, setUploadingDocIds] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const displayDocuments = useMemo<DocumentRecord[]>(() => {
    const uploaded = documents.filter((document) => Boolean(document.fileUrl));
    const uploadedTypes = new Set(uploaded.map((document) => document.type));
    const missingRequired = REQUIRED_PROFILE_DOCUMENTS
      .filter((type) => !uploadedTypes.has(type))
      .map((type) => ({
        id: `missing_${type}`,
        type,
        title: requiredDocumentDetails[type],
        description: '',
        requiredFor: [],
        status: 'Missing' as const,
      }));
    return [...uploaded, ...missingRequired];
  }, [documents]);

  const uploadedCount = documents.filter((document) => Boolean(document.fileUrl)).length;
  const missingRequiredCount = REQUIRED_PROFILE_DOCUMENTS.filter(
    (type) => !documents.some((document) => document.type === type && Boolean(document.fileUrl)),
  ).length;

  const uploadFile = async (doc: DocumentRecord, file: File) => {
    if (uploadingDocIds.has(doc.id)) return;
    if (!supportedTypes.includes(file.type)) {
      addToast('Unsupported file. Choose a PDF, JPG, PNG, or WEBP document.', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('Files must be 10 MB or smaller.', 'warning');
      return;
    }
    setUploadingDocIds((previous) => new Set(previous).add(doc.id));
    setUploadProgress((previous) => ({ ...previous, [doc.id]: 0 }));
    try {
      await uploadDocument(file, doc.type, (percent) => {
        setUploadProgress((previous) => ({ ...previous, [doc.id]: percent }));
      });
    } catch {
      // The upload action reports failures through the shared toast notifications.
    } finally {
      setUploadingDocIds((previous) => {
        const next = new Set(previous);
        next.delete(doc.id);
        return next;
      });
      setUploadProgress((previous) => {
        const next = { ...previous };
        delete next[doc.id];
        return next;
      });
    }
  };

  const handleFileInput = (doc: DocumentRecord, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(doc, file);
    event.target.value = '';
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId);
      setSelectedDocForPreview(null);
    } catch {
      // The delete action reports failures through the shared toast notifications.
    }
    setConfirmDeleteId(null);
  };

  const downloadUrl = (document: DocumentRecord) => document.fileUrl
    ? `${document.fileUrl}${document.fileUrl.includes('?') ? '&' : '?'}download=1`
    : undefined;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#172554]">Document Vault</h2>
          <p className="mt-1 text-sm text-slate-600">View and manage the documents saved to your account.</p>
        </div>
        <div className="flex gap-5 text-sm">
          <div>
            <span className="block font-semibold tabular-nums text-slate-900">{uploadedCount}</span>
            <span className="text-xs text-slate-500">Uploaded</span>
          </div>
          <div>
            <span className="block font-semibold tabular-nums text-slate-900">{missingRequiredCount}</span>
            <span className="text-xs text-slate-500">Required missing</span>
          </div>
        </div>
      </section>

      {displayDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-800">No documents in your vault</p>
          <p className="mt-1 text-xs text-slate-500">Upload a document when an application requires it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayDocuments.map((doc) => {
            const isUploading = uploadingDocIds.has(doc.id);
            const hasFile = Boolean(doc.fileUrl);
            const canScan = ocrSupportedTypes.has(doc.type);
            const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf');
            const inputId = `document-upload-${doc.id}`;
            return (
              <article key={doc.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#4563F5]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{doc.title || requiredDocumentDetails[doc.type]}</h3>
                      <p className="truncate text-xs text-slate-500">{doc.fileName || requiredDocumentDetails[doc.type]}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                    doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-700' :
                    doc.status === 'Pending Review' ? 'bg-amber-50 text-amber-700' :
                    hasFile ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {hasFile ? doc.status : 'Missing'}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-500">{formatUploadDate(doc.uploadedAt)}</p>
                {doc.fileSize && <p className="mt-1 text-xs text-slate-500">{doc.fileSize}</p>}

                {isUploading ? (
                  <div className="mt-4" aria-live="polite">
                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                      <span>Uploading</span><span>{uploadProgress[doc.id] ?? 0}%</span>
                    </div>
                    <progress value={uploadProgress[doc.id] ?? 0} max="100" className="h-1.5 w-full accent-[#4563F5]" aria-label="Upload progress" />
                  </div>
                ) : hasFile ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDocForPreview(doc)}
                    className="mt-4 flex h-28 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-[#4563F5] hover:bg-blue-50"
                  >
                    {isPdf ? <FileText className="mr-2 h-5 w-5" /> : <Eye className="mr-2 h-4 w-4" />}
                    Preview document
                  </button>
                ) : (
                  <label htmlFor={inputId} className="mt-4 flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center hover:border-[#4563F5]">
                    <Upload className="mb-2 h-5 w-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">Upload document</span>
                    <span className="mt-1 text-[11px] text-slate-500">PDF, JPG, PNG, WEBP · 10 MB max</span>
                  </label>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept={uploadAccept}
                  className="sr-only"
                  disabled={isUploading}
                  onChange={(event) => handleFileInput(doc, event)}
                />

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  {canScan && (
                    <button
                      type="button"
                      disabled={!hasFile || isUploading}
                      onClick={() => openOcrStudio(doc.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#4563F5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <ScanSearch className="h-4 w-4" /> Scan with AI
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    {hasFile && (
                      <>
                        <a
                          href={downloadUrl(doc)}
                          download={doc.fileName}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Download document"
                          aria-label={`Download ${doc.title}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <label htmlFor={inputId} className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Replace document" aria-label={`Replace ${doc.title}`}>
                          <RefreshCw className="h-4 w-4" />
                        </label>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(doc.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete document"
                          aria-label={`Delete ${doc.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-document-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 id="delete-document-title" className="text-sm font-semibold text-slate-900">Delete this document?</h3>
            <p className="mt-2 text-xs text-slate-600">This removes the uploaded file and its saved extraction from your vault.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={() => void handleDelete(confirmDeleteId)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
          <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="min-w-0">
                <h3 id="document-preview-title" className="truncate text-sm font-semibold text-slate-900">{selectedDocForPreview.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{selectedDocForPreview.fileName} · {selectedDocForPreview.status} · {formatUploadDate(selectedDocForPreview.uploadedAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedDocForPreview(null)} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-64 flex-1 overflow-auto bg-slate-50 p-3 sm:p-5">
              {selectedDocForPreview.mimeType === 'application/pdf' || selectedDocForPreview.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe title={`${selectedDocForPreview.title} preview`} src={selectedDocForPreview.fileUrl} className="h-[65vh] w-full rounded-lg border border-slate-200 bg-white" />
              ) : (
                <img src={selectedDocForPreview.fileUrl} alt={selectedDocForPreview.title} className="mx-auto max-h-[65vh] max-w-full object-contain" />
              )}
            </div>
            <footer className="flex justify-end border-t border-slate-200 p-3">
              <a href={downloadUrl(selectedDocForPreview)} download={selectedDocForPreview.fileName} className="inline-flex items-center gap-2 rounded-lg bg-[#4563F5] px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
                <Download className="h-4 w-4" /> Download
              </a>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
