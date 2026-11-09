import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  Calendar, 
  ChevronRight, 
  Info,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { examDatabase } from '../data/mockData';
import { evaluateEligibility } from '../utils/eligibilityEngine';

export const EligibilityCheckerView: React.FC = () => {
  const { 
    profile, 
    selectedExamForEligibility, 
    setSelectedExamForEligibility, 
    openWorkflow, 
    setActiveTab,
    exams
  } = useApp();

  const activeExams = exams && exams.length > 0 ? exams : examDatabase;

  const [activeExamId, setActiveExamId] = useState<string>(
    selectedExamForEligibility || 'exam_jee_main'
  );

  const selectedExam = activeExams.find(e => e.id === activeExamId) || activeExams[0];
  const evalResult = evaluateEligibility(profile, selectedExam);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">AI Eligibility Evaluation Engine</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              Autonomous Verification
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Evaluates your 10+2 marks, subjects, age bracket, and category reservation against official gazette brochures published by conducting authorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Candidate:</span>
          <span className="text-xs font-bold text-slate-900">{profile.personalInfo.fullName}</span>
          <span className="text-[11px] font-mono text-slate-400">({profile.academicInfo.class12.stream})</span>
        </div>
      </div>

      {/* Exam Selector Strip */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80">
        <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 px-1">
          Select Target Competitive Examination:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {activeExams.map((exam) => {
            const isSelected = exam.id === activeExamId;
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => {
                  setActiveExamId(exam.id);
                  setSelectedExamForEligibility(exam.id);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="text-xs truncate">{exam.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{exam.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overall Status Card & Rationale */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${
            evalResult.isEligible 
              ? 'bg-emerald-950/10 border-emerald-200/90' 
              : 'bg-rose-950/10 border-rose-200/90'
          } shadow-sm space-y-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Determination
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                Score: {evalResult.scorePercentage}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              {evalResult.isEligible ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className={`text-lg font-extrabold ${evalResult.isEligible ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {evalResult.isEligible ? 'Candidate Eligible' : 'Criteria Not Met'}
                </h3>
                <p className="text-xs text-slate-600">
                  Target: {selectedExam.name} ({selectedExam.authority})
                </p>
              </div>
            </div>

            {/* AI Explanation Callout */}
            <div className="p-4 rounded-xl bg-white/90 border border-slate-200/60 text-xs text-slate-700 leading-relaxed shadow-sm">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Registra AI Rationale</span>
              </div>
              <p>{evalResult.aiExplanation}</p>
            </div>

            {/* Missing Info Alert if any */}
            {evalResult.missingInfo.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Missing Verification Data</span>
                </span>
                <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5">
                  {evalResult.missingInfo.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline block"
                >
                  Update Profile to Resolve
                </button>
              </div>
            )}

            {/* Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openWorkflow(selectedExam.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <span>Proceed to Form Pre-Fill</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exam Summary Specs */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900">Conducting Body Specifications</h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Conducting Agency</span>
                <span className="font-semibold text-slate-800">{selectedExam.authority}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Registration Closes</span>
                <span className="font-semibold text-rose-600 tabular-nums">{selectedExam.applicationDeadline}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Exam Mode</span>
                <span className="font-semibold text-slate-800">Computer Based Test (CBT)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Application Fee</span>
                <span className="font-semibold text-slate-800 tabular-nums">₹{selectedExam.feeINR.general}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Criteria Breakdown Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Detailed Requirement Evaluation Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Itemized comparison between official exam notification requirements and student profile.
              </p>
            </div>

            <div className="space-y-3">
              {evalResult.checks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    check.met
                      ? 'bg-emerald-50/30 border-emerald-200/60'
                      : 'bg-rose-50/30 border-rose-200/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {check.met ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-slate-900">{check.criteriaName}</h4>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      check.met
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {check.met ? 'Satisfied' : 'Violated'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-100 mb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Official Requirement</span>
                      <span className="text-slate-700 font-medium">{check.expected}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Candidate Record</span>
                      <span className="text-slate-900 font-bold">{check.actual}</span>
                    </div>
                  </div>

                  {check.notes && (
                    <p className={`text-[11px] ${check.met ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {check.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              <strong>Official Gazette Notice:</strong> Criteria are matched against Information Bulletin published for 2026-2027 admissions. Candidates with disputed reservation categories or non-standard subject codes should inspect the conducting authority's official corrigendum.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
