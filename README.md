# REGISTRA – AI-Powered Competitive Exam Application Dashboard

> **Tagline**: *"One Profile. Every Exam. Zero Repetition."*

REGISTRA is an application dashboard for managing examination profiles, uploaded documents, and application drafts.

Students establish a verified academic and demographic profile **once**, upload foundational documents to their secure vault, and use automated AI mapping to register across multiple national examination portals with zero redundant form filling.

---

## 🌟 Key Features

1. **Dashboard Overview**:
   - Account-specific profile completion, verified exam availability, application statuses, and upcoming verified deadlines.
   - Profile readiness calculated from required saved fields and uploaded documents.
   - Application pipeline and field mapping based on the authenticated user's records and exam-specific field requirements.

2. **My Profile**:
   - Full student profile management: Demographics, Category reservation, Contact details, and Address.
   - Detailed academic records for Class 10 (Secondary) and Class 12 (Senior Secondary).
   - DigiLocker & CBSE verification badges.
   - Interactive Edit, Validate, and Save mechanisms.

3. **Document Vault**:
   - Private, account-scoped uploads support PDF, JPG, PNG, and WEBP files up to 10 MB; users can preview, download, replace, and delete them.
   - OCR requires explicit consent, optimizes images on the server, reports actual upload/processing stages, and asks users to review extracted fields before saving.
   - Successful results are cached temporarily by account, document type, and file hash to avoid rescanning unchanged files.

4. **Find Exams Discovery**:
   - Search verified exam records loaded from the backend database.
   - Filter by Category (Engineering, Medical, Undergraduate, Management, Civil Services, Government & Banking).
   - Filter by status and sort by deadline or fee.
   - One-click eligibility evaluation and direct form pre-fill actions.

5. **AI Eligibility Checker**:
   - Evaluates 10+2 percentages, academic streams (PCM, PCB, etc.), mandatory subject requirements, and age brackets against official gazette brochures.
   - Itemized verification matrix with pass/fail badges.
   - Registra AI explanation detailing why the candidate qualifies or which criteria need attention.

6. **Deadline Calendar**:
   - Chronological timeline from available verified exam records, with exportable calendar entries.

7. **Meet Registra AI (Companion Assistant)**:
   - Interactive assistant summarizes the profile, documents, applications, and verified exam records available in the account.
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
- **State Management**: React Context with server-verified, HTTP-only cookie sessions
- **Architecture**: Express API, authenticated HTTP-only cookie sessions, Prisma ORM with Neon PostgreSQL, private per-user file storage, and server-side Gemini integration (`@google/genai`).

---

## 🚀 Neon and Prisma Setup

1. Create a Neon project and database. In the Neon dashboard, copy both the pooled connection string (pooler hostname) and the direct connection string (non-pooler hostname).
2. Copy `.env.example` to `.env`; set:
   - `DATABASE_URL` to the pooled Neon URL for application queries.
   - `DIRECT_URL` to the direct Neon URL for Prisma migrations.
   - Keep `?sslmode=require` on both URLs. Do not commit `.env` or paste these URLs into frontend variables.
   - Prisma Client uses the `@prisma/adapter-neon` driver with `DATABASE_URL`; Prisma CLI reads `DIRECT_URL` from `prisma.config.ts`.
3. Install dependencies and generate Prisma Client:

```bash
npm ci
npm run db:generate
```

4. Apply the checked-in migration to a new development database:

```bash
npm run db:migrate:dev
```

For production, apply committed migrations with `npm run db:migrate:deploy`; do not use `prisma db push` in production.

## Running Locally

Use Node.js `20.19+` or `22.12+` (including later major releases), as required by Vite 8. Configure `.env` using `.env.example` before starting the server; at minimum, set `DATABASE_URL` and `DIRECT_URL` for Neon.

```bash
npm ci
npm run db:generate
npm run db:migrate:dev
npm run build
npm run lint
npm test
npm run dev
```

`npm run dev` starts Express with Vite's development middleware. Visit `http://localhost:3000` to interact with REGISTRA.

## Importing Existing JSON Data

Keep a secure backup of `data/registra_db.json` and the corresponding private `data/uploads/` files before migration. Apply the Prisma migration first, then run the importer once against the intended Neon database:

```bash
npm run db:import-json -- ./data/registra_db.json
```

The importer preserves account IDs and relationships, imports private document metadata (not file bytes), hashes legacy password-reset tokens, skips known demo accounts and already-existing rows, and prints category counts without personal values. Invalid records are reported by record category and cause a non-zero exit status. Resolve all failures, compare source/target counts, test authentication and ownership in a non-production environment, and verify private file access before archiving or removing the JSON database. Do not import production data into a test database.

Uploaded file bytes remain outside PostgreSQL. The existing per-user storage path is private and Git-ignored; production deployments must mount durable private storage or connect a private object-storage provider and retain the ownership-checked document API. Do not serve the uploads directory as static content.

## Exam Directory Data

The Phase 1 exam directory records are maintained in `data/exams/`, one JSON array per category. Only use information published by the exam's official conducting body. Keep unannounced dates and unverified fees or links as `null`; add uncertain links to `data/exams/NEEDS_REVIEW.md` rather than guessing. `sourceUrl` must point to the official page used to verify the record, and update `lastVerifiedAt` when checking that source.

Each record uses the directory fields in `prisma/schema.prisma`. For example:

```json
{
  "slug": "example-exam",
  "name": "Example Exam",
  "shortName": "EE",
  "category": "example-category",
  "level": "national",
  "state": null,
  "conductingBody": "Official conducting body",
  "officialWebsite": "https://official.gov.in/",
  "registrationUrl": null,
  "notificationUrl": null,
  "syllabusUrl": null,
  "registrationStartDate": null,
  "registrationEndDate": null,
  "examDate": null,
  "admitCardDate": null,
  "resultDate": null,
  "applicationFee": null,
  "eligibility": null,
  "ageLimit": null,
  "mode": null,
  "frequency": null,
  "sourceUrl": "https://official.gov.in/",
  "lastVerifiedAt": "YYYY-MM-DD"
}
```

After adding or updating records, check the dataset and seed the configured Neon database. Upserts use `slug`, so rerunning the seed is safe:

```bash
npm run exams:check-links
npm run exams:seed
```

The link checker sends a HEAD request to each unique non-null URL. If a site rejects or cannot complete HEAD, it retries with a ranged GET and then a `curl` fallback for Node TLS incompatibilities; it reports URLs that still fail and never edits data. `curl` must be available for that final fallback. The seed command prints inserted and updated row counts per category. Apply `npm run db:migrate:deploy` before seeding a production database. Review every source and date before publishing updates.

## Tests

`npm test` runs unit and database tests. The database integration test uses synthetic records only and is skipped unless `REGISTRA_TEST_DATABASE_URL` points to a dedicated, isolated test database whose data may be cleared. Never point it at production. It covers account isolation, profile/document/application persistence, foreign keys, uniqueness, sessions, and repeatable JSON import.

## Production Deployment

Use Node.js `20.19+` or `22.12+` (including later major releases). Configure `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV=production`, `APP_URL`, email provider settings, `GEMINI_API_KEY`, and durable private document storage in the hosting provider's secret/environment settings; never commit credentials. Run these commands from the repository root as part of deployment:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run build
NODE_ENV=production npm start
```

`npm start` runs the existing Express server through `tsx`. With `NODE_ENV=production`, the server serves the Vite build from `dist/`; the API routes are registered before static assets and the SPA fallback. Set `PORT` if the hosting provider supplies a port other than `3000`. Apply migrations as a release step before starting the app. Ensure the Neon database role has only the required application permissions and that backups/restore procedures are enabled.

## Authentication and email setup

Copy `.env.example` to `.env`. Configure the following to enable real registration OTP and password-reset email delivery:

- `EMAIL_FROM`: a sender address verified with your email provider
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: the provider's SMTP endpoint and credentials
- `APP_URL`: the app's public base URL, required to create password-reset links
- `NODE_ENV=production` when deployed, which enables Secure session cookies
- `GEMINI_API_KEY` to enable Gemini OCR; without it, OCR is unavailable.
- OCR sends a selected document to Google Gemini only after the user opts in. Keep this key on the server and never expose it to browser code.

Do not commit `.env` or expose SMTP credentials in frontend settings. Registration returns an error if email delivery is unavailable; OTPs are never printed to logs or returned to the browser.

The application no longer uses a JSON file for runtime persistence. New PostgreSQL databases start empty and REGISTRA does not seed users, profiles, documents, applications, or exams. Examination records are shown only when they have both `verifiedAt` and `sourceUrl`. Profile completion is calculated from saved profile fields and actual uploaded documents according to `src/utils/eligibilityEngine.ts`.
