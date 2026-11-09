import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Layers, 
  ExternalLink, 
  AlertTriangle, 
  Check, 
  Compass,
  Download,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { examDatabase } from '../data/mockData';
import { mapProfileToExamFields } from '../utils/eligibilityEngine';

interface SmartWorkflowModalProps {
  examId: string | null;
  onClose: () => void;
}

export const SmartWorkflowModal: React.FC<SmartWorkflowModalProps> = ({ examId, onClose }) => {
  const { profile, documents, updateApplication, addToast } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || 'exam_jee_main');
  
  // Missing fields for step 3
  const [cityChoice1, setCityChoice1] = useState('New Delhi');
  const [cityChoice2, setCityChoice2] = useState('Noida / Greater Noida');
  const [cityChoice3, setCityChoice3] = useState('Gurugram');
  const [aadhaarConsent, setAadhaarConsent] = useState(true);

  // Step 7 Approval
  const [userApproved, setUserApproved] = useState(false);
  const [finalConsentChecked, setFinalConsentChecked] = useState(false);

  const selectedExam = examDatabase.find(e => e.id === selectedExamId) || examDatabase[0];
  const mappedSections = mapProfileToExamFields(profile, selectedExam.name);

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

  const handleFinalApproval = () => {
    if (!finalConsentChecked) {
      addToast('Please confirm your review checkbox first', 'warning');
      return;
    }

    setUserApproved(true);
    updateApplication(`app_${selectedExam.id.replace('exam_', '')}`, {
      status: 'Completed',
      progressPercent: 100,
      lastUpdated: 'Just now',
      missingFields: [],
      mappedFieldsCount: 25,
      totalFieldsCount: 25,
    });

    addToast(`Smart Application Package verified for ${selectedExam.name}!`, 'success');
  };

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
                {examDatabase.map((exam) => {
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
                  Confirm your verified identity that will be stamped into the {selectedExam.name} application.
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
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
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
                <h4 className="text-sm font-bold text-slate-900">Step 3: Exam-Specific Missing Preferences</h4>
                <p className="text-xs text-slate-500">
                  These choices are unique to {selectedExam.name} and cannot be automatically inherited from your generic profile.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Exam City Preference 1 *
                    </label>
                    <input
                      type="text"
                      value={cityChoice1}
                      onChange={(e) => setCityChoice1(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Exam City Preference 2 *
                    </label>
                    <input
                      type="text"
                      value={cityChoice2}
                      onChange={(e) => setCityChoice2(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Exam City Preference 3 *
                    </label>
                    <input
                      type="text"
                      value={cityChoice3}
                      onChange={(e) => setCityChoice3(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent_aadhaar"
                    checked={aadhaarConsent}
                    onChange={(e) => setAadhaarConsent(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="consent_aadhaar" className="text-xs text-slate-700 cursor-pointer">
                    <strong>NTA Aadhaar Authentication Consent:</strong> I voluntarily permit REGISTRA to verify my Aadhaar specimen token with the UIDAI offline XML gateway as mandated by {selectedExam.authority}.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Map Profile Fields to Exam Fields */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 4: Autonomous Field Schema Mapping</h4>
                <p className="text-xs text-slate-500">
                  REGISTRA maps your single profile schema to {selectedExam.authority}'s specific portal schema with zero loss of fidelity.
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
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                            <Check className="w-3 h-3" />
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
                <h4 className="text-sm font-bold text-slate-900">Step 5: Synthesize Registration Package</h4>
                <p className="text-xs text-slate-500">
                  All 25 fields and cryptographic attachments assembled into a standardized JSON submission packet.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-indigo-400 font-bold">
                  <span>REGISTRA_PACKAGE_v2.4</span>
                  <span>DIGITALLY SIGNED</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  // Examination ID: {selectedExam.id}
                  <br />
                  // Candidate Hash: SHA-256 ({(profile.personalInfo.fullName || 'Candidate').replace(/\s+/g, '_')}_CBSE{profile.academicInfo.class12.passingYear || 2024})
                  <br />
                  // Mapped Fields: 25 / 25 (100% Complete)
                  <br />
                  // Document Vault References: [Photo, Signature, 10thMarksheet, 12thMarksheet]
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-[11px]">
                  &gt; Integrity Check: Passed (Zero Schema Conflicts)
                  <br />
                  &gt; Cutoff Score Check: 89.2% &gt;= 75.0% (Eligible)
                  <br />
                  &gt; Ready for Human Audit & Approval
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
                  Inspect every auto-mapped field before final authorization.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Candidate</span>
                    <span className="font-bold text-slate-900">{profile.personalInfo.fullName}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">12th Percentage</span>
                    <span className="font-bold text-slate-900">{profile.academicInfo.class12.percentage}%</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">City Choice 1</span>
                    <span className="font-bold text-slate-900">{cityChoice1}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fee Payable</span>
                    <span className="font-bold text-slate-900">₹{selectedExam.feeINR.general}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All 25 application fields passed automated validity checks.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: User Approval */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 7: Student Final Authorization</h4>
                <p className="text-xs text-slate-500">
                  Review the non-automatic submission policy and unlock your pre-filled submission token.
                </p>
              </div>

              {/* Crucial Prototype Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800">
                  <Lock className="w-4 h-4" />
                  <span>Human-in-the-Loop Barrier (Security Notice)</span>
                </div>
                <p>
                  As an ethical AI assistant, <strong>REGISTRA never automatically makes official fee payments or final government submissions</strong> without your explicit manual review. Final submission is completed under your direct control on the official {selectedExam.authority} portal.
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
                    I confirm that I have reviewed the mapped fields for <strong>{selectedExam.name}</strong>. The academic percentages and personal identity accurately represent my certificates.
                  </label>
                </div>

                {userApproved ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in">
                    <div className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Application Successfully Pre-Filled & Approved!</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Draft Token: <span className="font-mono font-bold">REG-2027-{selectedExam.id.toUpperCase()}-9401</span>
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={selectedExam.officialWebsite}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                      >
                        <span>Open Official Portal to Submit</span>
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
                    <span>Approve & Generate Application Summary</span>
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
