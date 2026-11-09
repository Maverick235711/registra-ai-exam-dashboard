# REGISTRA – AI-Powered Competitive Exam Application Dashboard

> **Tagline**: *"One Profile. Every Exam. Zero Repetition."*

REGISTRA is an enterprise-grade SaaS dashboard designed for ambitious students preparing for competitive entrance examinations in India (JEE Main, NEET UG, CUET UG, BITSAT, GATE, CAT, UPSC CSE, SSC CGL).

Students establish a verified academic and demographic profile **once**, upload foundational documents to their secure vault, and use automated AI mapping to register across multiple national examination portals with zero redundant form filling.

---

## 🌟 Key Features

1. **Dashboard Overview**:
   - 4 Core Metrics: Profile Completion (85%), Available Exams (24), Applications in Progress (3), Upcoming Deadlines (5).
   - Profile Readiness Index with breakdown by Personal, Academic, Documents, and Contact information.
   - Live Application pipeline table with status indicators (`Completed`, `In Progress`, `Pending`, `Needs Review`).
   - Upcoming deadlines widget with urgency badges.
   - Form field reuse analytics powered by Recharts (illustrating 14.5 hours saved & 180+ fields automated).

2. **My Profile**:
   - Full student profile management: Demographics, Category reservation, Contact details, and Address.
   - Detailed academic records for Class 10 (Secondary) and Class 12 (Senior Secondary).
   - DigiLocker & CBSE verification badges.
   - Interactive Edit, Validate, and Save mechanisms.

3. **Document Vault**:
   - Class 10 marksheet, Class 12 marksheet, Passport photo, Digital specimen signature, Government ID proof (Aadhaar).
   - Drag-and-drop file upload with real-time simulated progress.
   - Document preview modal with high-fidelity visual assets.
   - AI Document Extraction: Simulates OCR key-value extraction with confidence scoring.

4. **Find Exams Discovery**:
   - Search across 24+ national examinations.
   - Filter by Category (Engineering, Medical, Undergraduate, Management, Civil Services, Government & Banking).
   - Filter by status and sort by deadline or fee.
   - One-click eligibility evaluation and direct form pre-fill actions.

5. **AI Eligibility Checker**:
   - Evaluates 10+2 percentages, academic streams (PCM, PCB, etc.), mandatory subject requirements, and age brackets against official gazette brochures.
   - Itemized verification matrix with pass/fail badges.
   - Registra AI explanation detailing why the candidate qualifies or which criteria need attention.

6. **Deadline Calendar**:
   - Chronological timeline tracking Registration opening dates, Application cutoffs, Admit card releases, and Examination dates.
   - Export reminders and Google Calendar integration.

7. **Meet Registra AI (Companion Assistant)**:
   - Interactive conversational chat with simulated typing indicators.
   - Quick prompt chips ("Which exams am I eligible for?", "Help me fill my JEE application", "Which documents are missing?", "What are my upcoming deadlines?").
   - Actionable response cards with direct navigation triggers.

8. **Smart Application Workflow (7-Step Wizard)**:
   - Step 1: Select Examination
   - Step 2: Review Student Profile
   - Step 3: Identify Missing Information
   - Step 4: Map Profile Fields to Exam Fields
   - Step 5: Prepare Application Package
   - Step 6: Review Every Field
   - Step 7: User Approval & Official Portal Transfer
   - **Human-in-the-Loop Barrier**: Strict ethical guardrail ensuring that official fee payment and final government submission remain strictly under student control.

---

## 🛠 Tech Stack

- **Framework**: React 19, Vite 8, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React icons, Inter & Plus Jakarta Sans typography
- **Data Visualizations**: Recharts
- **State Management**: React Context with LocalStorage persistence
- **Architecture**: Modular, zero-dependency unit-tested business logic (`src/utils/eligibilityEngine.ts`), ready for Firebase Firestore and Gemini API integration (`@google/genai`).

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npx tsx --test src/utils/eligibilityEngine.test.ts

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with REGISTRA.
