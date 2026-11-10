import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  AlertTriangle, 
  Check, 
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mapProfileToExamFields } from '../utils/eligibilityEngine';

interface SmartWorkflowModalProps {
  examId: string | null;
  onClose: () => void;
}

export const SmartWorkflowModal: React.FC<SmartWorkflowModalProps> = ({ examId, onClose }) => {
  const { profile, documents, exams, saveApplication, addToast } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || '');

  const [savedApplicationId, setSavedApplicationId] = useState<string | null>(null);
  const [finalConsentChecked, setFinalConsentChecked] = useState(false);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId);
  const mappedSections = selectedExam ? mapProfileToExamFields(profile, selectedExam, documents) : [];
  const mappedFields = mappedSections.flatMap((section) => section.fields);
  const mappedFieldsCount = mappedFields.filter((field) => field.status === 'Auto-Mapped' || field.status === 'Verified').length;
  const fieldsForReview = mappedFields.filter((field) => field.status === 'Missing' || field.status === 'Manual Review');

  const steps = [
    { number: 1, title: 'Select Exam' },
    { number: 2, title: 'Review Profile' },
    { number: 3, title: 'Missing Info' },
    { number: 4, title: 'Field Mapping' },
    { number: 5, title: 'Prepare Package' },
    { number: 6, title: 'Review Fields' },
    { number: 7, title: 'User Approval' },
  ];

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalApproval = async () => {
    if (!finalConsentChecked) {
      addToast('Please confirm your review checkbox first', 'warning');
      return;
    }

    if (!selectedExam || !selectedExam.applicationFields?.length) {
      addToast('Verified application-field requirements are unavailable for this exam.', 'warning');
      return;
    }
    try {
      const saved = await saveApplication({
        examId: selectedExam.id,
        status: 'Needs Review',
        progressPercent: mappedFields.length ? Math.round((mappedFieldsCount / mappedFields.length) * 100) : 0,
        missingFields: fieldsForReview.map((field) => field.examField),
        mappedFieldsCount,
        totalFieldsCount: mappedFields.length,
      });
      setSavedApplicationId(saved.id);
      addToast(`Draft saved for ${selectedExam.name}. No official application was submitted.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Application draft could not be saved.', 'warning');
    }
  };

  if (!selectedExam) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center">
          <h3 className="text-sm font-bold text-slate-900">Exam record unavailable</h3>
          <p className="mt-2 text-xs text-slate-500">The selected exam is not present in the verified exam catalog.</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Close</button>
        </div>
      </div>
    );
  }

  if (!selectedExam.applicationFields?.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center">
          <h3 className="text-sm font-bold text-slate-900">Application requirements unavailable</h3>
          <p className="mt-2 text-xs text-slate-500">
            {selectedExam.name} has no verified application-field schema yet. REGISTRA will not fabricate mappings or create a misleading draft.
          </p>
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-600/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Smart Application Flow
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Step {currentStep} of 7
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Target: {selectedExam.name} ({selectedExam.authority})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between min-w-[560px] gap-2">
            {steps.map((step) => {
              const isPassed = step.number < currentStep;
              const isCurrent = step.number === currentStep;

              return (
                <div key={step.number} className="flex items-center gap-1.5 flex-1 last:flex-none">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap font-medium ${
                    isCurrent ? 'text-indigo-900 font-bold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                  {step.number < 7 && (
                    <div className={`h-0.5 flex-1 ml-1 rounded-full ${
                      isPassed ? 'bg-emerald-400' : 'bg-slate-100'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Select Examination */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 1: Choose Target Examination</h4>
                <p className="text-xs text-slate-500">
                  Select which competitive exam application you want REGISTRA to prepare.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exams.map((exam) => {
                  const isSelected = exam.id === selectedExamId;
                  return (
                    <div
                      key={exam.id}
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">{exam.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {exam.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">{exam.authority}</p>
                      <div className="text-[10px] text-slate-600 line-clamp-2">
                        {exam.eligibilitySummary}
                      </div>
                      <div className="mt-2 text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                        <span>Deadline: {exam.applicationDeadline}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Review Student Profile */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 2: Confirm Stored Profile Credentials</h4>
                <p className="text-xs text-slate-500">
                  Review the actual profile information REGISTRA would use for {selectedExam.name}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Personal Profile</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-semibold text-slate-900">{profile.personalInfo.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="font-semibold text-slate-900 font-mono">{profile.personalInfo.dob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gender / Category</span>
                    <span className="font-semibold text-slate-900">{profile.personalInfo.gender} ({profile.personalInfo.category})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold text-slate-900">{profile.personalInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-semibold text-slate-900 font-mono">{profile.personalInfo.phoneNumber}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Credentials</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">10th Board</span>
                    <span className="font-semibold text-slate-900">{profile.academicInfo.class10.board} ({profile.academicInfo.class10.percentage}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">10th Roll No</span>
                    <span className="font-semibold text-slate-900 font-mono">{profile.academicInfo.class10.rollNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">12th Stream</span>
                    <span className="font-semibold text-slate-900">{profile.academicInfo.class12.stream} ({profile.academicInfo.class12.percentage}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">12th Passing Year</span>
                    <span className="font-semibold text-slate-900 font-mono">{profile.academicInfo.class12.passingYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DigiLocker Status</span>
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Not connected</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Identify Missing Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 3: Fields Requiring Review</h4>
                <p className="text-xs text-slate-500">
                  This list is calculated from {selectedExam.name}'s configured application fields and your saved profile and document data.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
                {fieldsForReview.length === 0
                  ? <p className="text-xs text-slate-500">All configured fields currently have mapped or verified profile values.</p>
                  : fieldsForReview.map((field) => (
                    <div key={field.examField} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-700">{field.examField}</span>
                      <span className="text-amber-700">{field.status}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* STEP 4: Map Profile Fields to Exam Fields */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 4: Field Mapping</h4>
                <p className="text-xs text-slate-500">
                  Values and statuses are derived from the configured exam fields, saved profile, and verified documents.
                </p>
              </div>

              <div className="space-y-4">
                {mappedSections.map((sec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-800">{sec.category}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sec.fields.map((f, fi) => (
                        <div key={fi} className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">{f.examField}</span>
                            <span className="font-semibold text-slate-800">{f.studentValue}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            f.status === 'Missing' || f.status === 'Manual Review'
                              ? 'text-amber-700 bg-amber-50 border-amber-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                          }`}>
                            {f.status === 'Missing' || f.status === 'Manual Review' ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            <span>{f.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Prepare Application */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 5: Review Draft Data</h4>
                <p className="text-xs text-slate-500">
                  This summary is calculated from this exam's configured fields and the saved values available in your account.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-indigo-400 font-bold">
                  <span>{selectedExam.name}</span>
                  <span>Draft preview</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  // Exam record: {selectedExam.id}
                  <br />
                  // Fields mapped: {mappedFieldsCount} / {mappedFields.length}
                  <br />
                  // Fields requiring review: {fieldsForReview.length}
                  <br />
                  // Required exam documents uploaded: {selectedExam.documentsRequired.filter((type) =>
                    documents.some((document) => document.type === type && Boolean(document.fileUrl))
                  ).length} / {selectedExam.documentsRequired.length}
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-[11px]">
                  &gt; This is a draft preview, not a submission package.
                  <br />
                  &gt; REGISTRA has not submitted data to the exam authority.
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review Every Field */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 6: Comprehensive Field Audit</h4>
                <p className="text-xs text-slate-500">
                  Inspect mapped fields and review any missing or unverified values.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Candidate</span>
                    <span className="font-bold text-slate-900">{profile.personalInfo.fullName}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">12th Percentage</span>
                    <span className="font-bold text-slate-900">{profile.academicInfo.class12.percentage > 0 ? `${profile.academicInfo.class12.percentage}%` : 'Not provided'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fields requiring review</span>
                    <span className="font-bold text-slate-900">{fieldsForReview.length}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{mappedFieldsCount} of {mappedFields.length} configured fields have mapped values. Verify all details with the official exam authority.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: User Approval */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 7: Save Application Draft</h4>
                <p className="text-xs text-slate-500">
                  Saving here records an application draft in REGISTRA only. It does not submit anything to the exam authority.
                </p>
              </div>

              {/* Crucial Prototype Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800">
                  <Lock className="w-4 h-4" />
                  <span>Official submission status</span>
                </div>
                <p>
                  REGISTRA does not connect to {selectedExam.authority}'s application system, submit applications, or make payments. Use the official portal to complete the application yourself.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="final_consent"
                    checked={finalConsentChecked}
                    onChange={(e) => setFinalConsentChecked(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="final_consent" className="text-xs text-slate-700 cursor-pointer">
                    I have reviewed the saved profile values and understand this only saves a REGISTRA draft for <strong>{selectedExam.name}</strong>.
                  </label>
                </div>

                {savedApplicationId ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in">
                    <div className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>REGISTRA draft saved</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Application ID: <span className="font-mono font-bold">{savedApplicationId}</span>
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={selectedExam.officialWebsite}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                      >
                        <span>Open Official Exam Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalApproval}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Draft in REGISTRA</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Stepper Navigation */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
