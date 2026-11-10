import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, FileText, LoaderCircle, ScanSearch, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { DocumentType, ExtractedFieldData } from '../types';
import { FIELD_DEFINITIONS, validateOcrFieldValue } from '../services/geminiOcrService';

interface OcrVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocId?: string | null;
  initialFileUrl?: string | null;
  initialDocTitle?: string | null;
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'class10_marksheet', label: 'Class 10 Marksheet' },
  { value: 'class12_marksheet', label: 'Class 12 Marksheet' },
  { value: 'identity_proof', label: 'Identity Proof' },
  { value: 'aadhaar_card', label: 'Aadhaar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'category_certificate', label: 'Category Certificate' },
  { value: 'domicile_certificate', label: 'Domicile Certificate' },
  { value: 'income_certificate', label: 'Income Certificate' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'educational_certificate', label: 'Educational Certificate' },
];

export const OcrVerificationModal: React.FC<OcrVerificationModalProps> = ({
  isOpen,
  onClose,
  initialDocId,
  initialFileUrl,
  initialDocTitle,
}) => {
  const { documents, uploadDocument, confirmDocumentExtraction, addToast } = useApp();
  const [documentType, setDocumentType] = useState<DocumentType>('class12_marksheet');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialFileUrl ?? null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'extracting' | 'verification' | 'complete'>('idle');
  const [fields, setFields] = useState<Record<string, ExtractedFieldData>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === documentId) ?? null,
    [documents, documentId],
  );
  const activeFileName = file?.name ?? selectedDocument?.fileName ?? initialDocTitle ?? '';
  const hasSavedFile = Boolean(selectedDocument?.fileUrl);

  useEffect(() => {
    if (!isOpen) return;
    const existing = initialDocId ? documentsRef.current.find((document) => document.id === initialDocId) : null;
    const objectUrl = previewObjectUrl.current;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    previewObjectUrl.current = null;
    setDocumentId(existing?.id ?? null);
    setDocumentType(existing?.type ?? 'class12_marksheet');
    setFile(null);
    setFileUploaded(false);
    setPreviewUrl(existing?.fileUrl ?? initialFileUrl ?? null);
    setUploadProgress(0);
    setProcessingTimeMs(null);
    setStage('idle');
    setFields(existing?.detailedExtraction ?? {});
    setWarnings([]);
    setError('');
    setSaved(false);
    setSaving(false);
    setConsentGiven(false);
    inFlight.current = false;
  }, [isOpen, initialDocId, initialFileUrl]);

  useEffect(() => () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    abortController.current?.abort();
  }, []);

  if (!isOpen) return null;

  const chooseFile = (selected: File) => {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!supportedTypes.includes(selected.type)) {
      setError('Unsupported file. Choose a JPG, PNG, WEBP, or PDF document.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('File is larger than 10 MB. Compress or split the document, then try again.');
      return;
    }
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    const objectUrl = URL.createObjectURL(selected);
    previewObjectUrl.current = objectUrl;
    setFile(selected);
    setFileUploaded(false);
    setPreviewUrl(objectUrl);
    setDocumentId(null);
    setFields({});
    setWarnings([]);
    setError('');
    setSaved(false);
    setConsentGiven(false);
    setProcessingTimeMs(null);
    setStage('idle');
  };

  const startScan = async () => {
    if (inFlight.current) return;
    if (!consentGiven) {
      setError('Please confirm that you consent to processing this document for text extraction.');
      return;
    }
    if (!file && !hasSavedFile) {
      setError('Choose a document file before scanning.');
      return;
    }
    inFlight.current = true;
    setError('');
    setUploadProgress(0);
    setProcessingTimeMs(null);
    setFields({});
    setWarnings([]);
    setSaved(false);
    const controller = new AbortController();
    abortController.current = controller;

    try {
      let targetDocumentId = documentId;
      if (file && !fileUploaded) {
        setStage('uploading');
        const uploaded = await uploadDocument(file, documentType, setUploadProgress, controller.signal);
        targetDocumentId = uploaded.id;
        setDocumentId(uploaded.id);
        setPreviewUrl(uploaded.fileUrl ?? previewUrl);
        setFileUploaded(true);
      }
      if (!targetDocumentId) throw new Error('The uploaded document record could not be found. Try uploading again.');

      setStage('processing');
      const result = await apiService.extractDocument(targetDocumentId, (nextStage) => {
        if (nextStage === 'processing' || nextStage === 'extracting') setStage(nextStage);
      }, controller.signal);
      setStage('verification');
      setFields(result.extracted_data);
      setWarnings(result.warnings);
      setProcessingTimeMs(result.metadata?.processingTimeMs ?? null);
      setStage('verification');
      addToast('Extraction is ready for your review.', 'success');
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') {
        setError('Scan cancelled. You can retry when ready.');
      } else if (reason instanceof Error && reason.message === 'Scan cancelled.') {
        setError('Scan cancelled. You can retry when ready.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not scan this document. Please retry.');
      }
      setStage('idle');
    } finally {
      inFlight.current = false;
      abortController.current = null;
    }
  };

  const cancelScan = () => {
    abortController.current?.abort();
  };

  const updateField = (key: string, value: string) => {
    setFields((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        value: value || null,
        manuallyEdited: true,
        status: value.trim() ? 'review' : 'missing',
      },
    }));
  };

  const saveExtraction = async () => {
    if (!documentId || !Object.values(fields).some((field) => field.value?.trim())) {
      setError('Scan a document and review at least one extracted value before saving.');
      return;
    }
    const invalid = Object.entries(fields).filter(([key, field]) =>
      field.value && !validateOcrFieldValue(key, field.value),
    );
    if (invalid.length) {
      setError(`Review the format for: ${invalid.map(([key]) => FIELD_DEFINITIONS[key]?.label ?? key.replaceAll('_', ' ')).join(', ')}.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await confirmDocumentExtraction(documentId, fields);
      setSaved(true);
      setStage('complete');
      addToast('Reviewed extraction saved to your profile and vault.', 'success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the reviewed extraction.');
    } finally {
      setSaving(false);
    }
  };

  const busy = stage === 'uploading' || stage === 'processing' || stage === 'extracting';
  const fileIsPdf = file?.type === 'application/pdf' || selectedDocument?.mimeType === 'application/pdf' || activeFileName.toLowerCase().endsWith('.pdf');
  const stageLabel = (stage === 'verification' || stage === 'complete') && processingTimeMs !== null
    ? `${stage === 'complete' ? 'Saved' : 'Review extracted information'} · Scan took ${(processingTimeMs / 1000).toFixed(1)} seconds`
    : {
      idle: 'Ready to scan',
      uploading: `Uploading · ${uploadProgress}%`,
      processing: 'Preparing document',
      extracting: 'Extracting information',
      verification: 'Review extracted information',
      complete: 'Complete',
    }[stage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ocr-title">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="ocr-title" className="text-base font-semibold text-[#172554]">Scan a document</h2>
            <p className="mt-1 text-xs text-slate-500">Review extracted values before saving them.</p>
          </div>
          <button type="button" onClick={busy ? cancelScan : onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={busy ? 'Cancel scan' : 'Close'}>
            {busy ? <X className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">Document type</span>
              <select
                value={documentType}
                disabled={busy || Boolean(file)}
                onChange={(event) => {
                  const type = event.target.value as DocumentType;
                  setDocumentType(type);
                  const savedDocument = documents.find((document) => document.type === type && document.fileUrl);
                  setDocumentId(savedDocument?.id ?? null);
                  setPreviewUrl(savedDocument?.fileUrl ?? null);
                  setFields(savedDocument?.detailedExtraction ?? {});
                  setWarnings([]);
                  setError('');
                  setConsentGiven(false);
                  setProcessingTimeMs(null);
                  setSaved(false);
                  setStage('idle');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#4563F5] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-left hover:border-[#4563F5] hover:bg-blue-50/40 disabled:opacity-60"
            >
              <Upload className="h-5 w-5 shrink-0 text-[#4563F5]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{file?.name ?? (hasSavedFile ? selectedDocument?.fileName : 'Choose a document')}</span>
                <span className="mt-0.5 block text-xs text-slate-500">JPG, PNG, WEBP, or PDF · Up to 10 MB</span>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) chooseFile(selected);
                  event.target.value = '';
                }}
              />
            </button>

            <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {previewUrl && fileIsPdf ? (
                <iframe title="Document preview" src={previewUrl} className="h-72 w-full" />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Selected document preview" className="max-h-80 max-w-full object-contain" />
              ) : (
                <div className="px-6 text-center text-sm text-slate-500">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  Your document preview will appear here.
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(event) => setConsentGiven(event.target.checked)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#4563F5] focus:ring-[#4563F5]"
              />
              I consent to sending this document to Google Gemini for text extraction. Sensitive identity numbers are not requested.
            </label>

            {busy && (
              <div aria-live="polite" className="space-y-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#172554]">
                <div className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin text-[#4563F5]" />
                  <span>{stageLabel}</span>
                </div>
                {stage === 'uploading' && (
                  <progress value={uploadProgress} max="100" className="h-1.5 w-full accent-[#4563F5]" aria-label="Upload progress" />
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex min-h-64 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Extracted information</h3>
              <span className="text-xs text-slate-500" aria-live="polite">{stageLabel}</span>
            </div>
            {Object.keys(fields).length ? (
              <div className="space-y-3 overflow-y-auto pr-1">
                {Object.entries(fields).map(([key, field]) => {
                  const label = FIELD_DEFINITIONS[key]?.label ?? key.replaceAll('_', ' ');
                  return (
                    <label key={key} className="block rounded-lg border border-slate-200 p-3">
                      <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium capitalize text-slate-700">{label}</span>
                        <span className={`text-[11px] ${field.manuallyEdited ? 'text-amber-700' : field.status === 'high' ? 'text-emerald-700' : field.status === 'missing' ? 'text-slate-500' : 'text-amber-700'}`}>
                          {field.manuallyEdited ? 'Edited · verify' : field.value ? `Model confidence ${field.confidence}%` : 'Not found'}
                        </span>
                      </span>
                      <input
                        type="text"
                        value={field.value ?? ''}
                        disabled={saved || saving}
                        onChange={(event) => updateField(key, event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#4563F5] focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        placeholder="Not found in document"
                      />
                    </label>
                  );
                })}
                {warnings.length > 0 && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{warnings.join(' ')}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
                Scan a document to review the extracted fields.
              </div>
            )}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={busy ? cancelScan : onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {busy ? 'Cancel scan' : 'Close'}
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void startScan()}
              disabled={busy || !file && !hasSavedFile || saved || !consentGiven}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4563F5] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ScanSearch className="h-4 w-4" />
              {stage === 'idle' && error ? 'Retry scan' : 'Scan with AI'}
            </button>
            <button
              type="button"
              onClick={() => void saveExtraction()}
              disabled={!Object.values(fields).some((field) => field.value?.trim()) || busy || saving || saved}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#172554] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : saved ? 'Saved' : 'Confirm and save'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
