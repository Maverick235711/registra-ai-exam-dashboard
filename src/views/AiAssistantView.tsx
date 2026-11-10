import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileText,
  RotateCcw,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage } from '../types';
import { evaluateEligibility, getDaysRemaining, REQUIRED_PROFILE_DOCUMENTS } from '../utils/eligibilityEngine';

export const AiAssistantView: React.FC = () => {
  const { 
    profile, 
    documents, 
    applications, 
    exams,
    profileCompletion,
    openWorkflow, 
    setActiveTab, 
    setSelectedExamForEligibility 
  } = useApp();

  const userFirstName = profile.personalInfo.fullName ? profile.personalInfo.fullName.split(' ')[0] : 'there';

  const createWelcomeMessage = (): ChatMessage => ({
    id: `msg_welcome_${profile.id}`,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: `Hello ${userFirstName}! Your saved profile is **${profileCompletion.overall}%** complete. I can summarize data currently saved in your account.`,
    actions: [
      { label: 'Which exams am I eligible for?', actionType: 'CHECK_ELIGIBILITY' },
      ...(exams[0] ? [{ label: `Prepare ${exams[0].name} draft`, actionType: 'START_WORKFLOW' as const, payload: exams[0].id }] : []),
      { label: 'Which documents are missing?', actionType: 'VIEW_DOCS' },
      { label: 'What are my upcoming deadlines?', actionType: 'NAVIGATE', payload: 'deadlines' },
    ],
  });
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);

  useEffect(() => {
    setMessages([createWelcomeMessage()]);
  }, [profile.id, userFirstName, profileCompletion.overall, exams]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Which exams am I eligible for?',
    'Help me prepare an application draft.',
    'Which documents are missing?',
    'What are my upcoming deadlines?',
    'Check my application for mistakes.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // AI Simulated logic responding specifically to query
    setTimeout(() => {
      let responseText = '';
      let actions: ChatMessage['actions'] = [];

      const lower = text.toLowerCase();
      if (lower.includes('eligible') || lower.includes('which exams')) {
        const results = exams.map((exam) => ({ exam, result: evaluateEligibility(profile, exam) }));
        const eligible = results.filter(({ result }) => result.sufficientInformation && result.isEligible);
        const undetermined = results.filter(({ result }) => !result.sufficientInformation);
        if (eligible.length) {
          responseText = `Based on your saved profile and configured criteria, these exams currently match: ${eligible.map(({ exam }) => exam.name).join(', ')}. Confirm requirements against each official notice.`;
          actions = eligible.slice(0, 3).map(({ exam }) => ({
            label: `Review ${exam.name}`,
            actionType: 'CHECK_ELIGIBILITY' as const,
            payload: exam.id,
          }));
        } else if (undetermined.length) {
          responseText = 'I cannot determine eligibility yet. Add the profile information required by the available exam criteria, then check again.';
          actions = [{ label: 'Update profile', actionType: 'NAVIGATE', payload: 'profile' }];
        } else {
          responseText = exams.length
            ? 'Your saved profile does not meet the currently configured criteria for the available exams.'
            : 'No verified exam records with eligibility criteria are currently available.';
        }
      } else if (lower.includes('jee') || lower.includes('fill') || lower.includes('application draft')) {
        const exam = lower.includes('jee') ? exams.find((item) => item.name.toLowerCase().includes('jee')) : exams[0];
        if (exam) {
          responseText = `${exam.name} is present in your verified exam catalog. REGISTRA can prepare a draft only when application-field requirements are configured; it does not submit applications to exam portals.`;
          actions = [{ label: `Review ${exam.name}`, actionType: 'START_WORKFLOW', payload: exam.id }];
        } else {
          responseText = 'No verified exam record is currently available to prepare an application draft.';
        }
      } else if (lower.includes('document') || lower.includes('missing')) {
        const missing = REQUIRED_PROFILE_DOCUMENTS.filter((type) => {
          const document = documents.find((item) => item.type === type);
          return !document?.fileUrl || document.status === 'Missing';
        }).map((type) => documents.find((document) => document.type === type)?.title || type.replaceAll('_', ' '));
        const pending = documents.filter((document) => document.fileUrl && document.status !== 'Verified');
        if (missing.length) {
          responseText = `Required documents not uploaded: ${missing.join(', ')}.${pending.length ? ` ${pending.length} uploaded document(s) still need review.` : ''}`;
        } else {
          responseText = pending.length
            ? `All required document slots have uploads; ${pending.length} document(s) are still awaiting verification.`
            : 'All required document slots have uploaded files marked verified.';
        }
        actions = [{ label: 'Open Document Vault', actionType: 'VIEW_DOCS' }];
      } else if (lower.includes('deadline') || lower.includes('upcoming')) {
        const deadlines = exams
          .filter((exam) => exam.status === 'Registration Open' || exam.status === 'Upcoming')
          .map((exam) => ({ exam, days: getDaysRemaining(exam.applicationDeadline) }))
          .filter((item): item is { exam: typeof exams[number]; days: number } => item.days !== null && item.days >= 0)
          .sort((a, b) => a.days - b.days);
        responseText = deadlines.length
          ? `Upcoming verified registration deadlines: ${deadlines.map(({ exam, days }) => `${exam.name} (${exam.applicationDeadline}, ${days} days)`).join('; ')}.`
          : 'No upcoming registration deadlines are available from verified exam records.';
        actions = [{ label: 'View Deadline Calendar', actionType: 'NAVIGATE', payload: 'deadlines' }];
      } else if (lower.includes('mistake') || lower.includes('check')) {
        responseText = applications.length
          ? `Your account has ${applications.length} saved application record(s): ${applications.map((application) => `${application.examName} (${application.status})`).join(', ')}. Review each record and its missing-field list before continuing.`
          : 'There are no application records in your account to review.';
        actions = [{ label: 'Inspect Applications', actionType: 'NAVIGATE', payload: 'applications' }];
      } else {
        responseText = 'I can summarize the profile, documents, applications, and verified exam records currently available in your REGISTRA account.';
        actions = [
          { label: 'Which exams am I eligible for?', actionType: 'CHECK_ELIGIBILITY' },
          { label: 'Review my applications', actionType: 'NAVIGATE', payload: 'applications' },
        ];
      }

      const botMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: responseText,
        actions,
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const handleActionClick = (action: NonNullable<ChatMessage['actions']>[number]) => {
    if (action.actionType === 'START_WORKFLOW') {
      openWorkflow(action.payload);
    } else if (action.actionType === 'CHECK_ELIGIBILITY') {
      if (action.payload) setSelectedExamForEligibility(action.payload);
      setActiveTab('eligibility');
    } else if (action.actionType === 'VIEW_DOCS') {
      setActiveTab('documents');
    } else if (action.actionType === 'NAVIGATE') {
      setActiveTab(action.payload || 'overview');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950 text-white shadow-xl shadow-slate-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Application Companion</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Meet Registra AI</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Your intelligent companion for every examination application. Ask about eligibility rules, missing documents, or auto-fill assistance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMessages([createWelcomeMessage()])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Session</span>
        </button>
      </div>

      {/* Suggested Questions Carousel */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
          Suggested Prompts:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 text-xs font-medium whitespace-nowrap shadow-sm transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[520px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isBot = msg.sender === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isBot ? 'max-w-2xl' : 'max-w-xl ml-auto flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isBot 
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-slate-900 text-white'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isBot 
                      ? 'bg-slate-50 text-slate-800 border border-slate-100' 
                      : 'bg-indigo-600 text-white'
                  }`}>
                    <div className="whitespace-pre-line">
                      {msg.text}
                    </div>
                  </div>

                  {/* Action suggestions / interactive buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[10px] text-slate-400 block ${isBot ? 'text-left' : 'text-right'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-3 max-w-md">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">Registra AI is checking regulations...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about JEE, NEET, CUET eligibility, documents, or fee rules..."
              className="flex-1 px-4 py-2.5 text-xs bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white transition-colors shrink-0 shadow-sm"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-400">
            Official Exam Application Assistant · Non-submission simulation environment
          </div>
        </div>
      </div>
    </div>
  );
};
