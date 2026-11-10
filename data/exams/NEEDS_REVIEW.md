# Exam directory items needing review

Current exam records use only existing filter categories. Dates and fees are null unless the linked official source explicitly states them. The seed sets database `verifiedAt` from the record's `verifiedAt` (or its existing `lastVerifiedAt` for older Phase 1 records) and requires a non-empty official `sourceUrl`.

## Unverified details and omitted records

| Exam(s) | Field(s) to verify | Reason / action |
|---|---|---|
| UPSC CSE, ESE, CDS, NDA, CAPF, CMS, IFS | Cycle-specific registration windows, exam stages/dates, fees, eligibility and age limits | Shared official UPSC pages are sourced. Annual-calendar information is not equivalent to an exam notification; a single exam-date field cannot represent multi-stage and twice-yearly exams. |
| SSC CGL, CHSL, MTS, CPO, GD, JE, Stenographer, Selection Post | Current notice/application links, registration dates, exam dates, fees and eligibility | The official SSC site and syllabus page are linked; cycle-specific application pages and current details were not verified. |
| RRB NTPC, Group D, ALP, JE; RPF Constable and SI | Regional notice/CEN, application link, dates, fees, syllabus and eligibility | RRB recruitment information is issued through applicable regional boards/CENs. RPF's official Railway site was confirmed, but no current recruitment notice was verified. |
| IBPS PO, Clerk, RRB Officer Scale I, RRB Office Assistant, SO | Current individual notice/application/syllabus URLs, dates, fees and eligibility | Only the official IBPS homepage was confirmed for the current records. |
| SBI PO and Clerk | Current notice/application links, dates, fees and eligibility | SBI Careers is official, but current exam-specific pages were not confirmed. |
| RBI Grade B and Assistant | Current notice/application links, dates, fees and eligibility | The official RBI opportunities page is linked; current exam-specific notices were not confirmed. |
| LIC AAO; NABARD Grade A | Current notice/application links, dates, fees and eligibility | Official institutional sites are linked; current recruitment notices were not confirmed. |
| JEE Main | Syllabus URL, registration window, admit-card/result dates, fee, eligibility and full multi-day schedule | The official 2027 bulletin/notice verified the cycle, but the linked syllabus PDF host failed DNS resolution. `syllabusUrl` is null. The exam spans multiple days, which the single `examDate` field cannot fully express. |
| JEE Advanced | 2027 organizing institute, registration/notice/syllabus links and dates | The verified official page checked contained prior-cycle material only. |
| GATE | Next-cycle organizing institute, official portal, notice, registration, syllabus and dates | The linked official portal is for GATE 2026; no next-cycle portal was verified. |
| BITSAT, WBJEE, KCET, KEAM, AP EAPCET, COMEDK UGET and VITEEE | Current-cycle registration/notice/syllabus links, dates, fees and eligibility | Official exam/institution portals are linked; cycle-specific values are not populated without a verified current notice. |
| MHT-CET | Official website/source URL and all cycle details | The candidate official portal could not be fetched during verification. No URL is seeded; verify the official Maharashtra CET Cell page before adding this row. |
| TS EAMCET / TG EAPCET | Current official exam name/portal, source URL and all cycle details | The older TS EAMCET portal URL did not resolve. Verify the current Telangana official portal/name before adding a row. |
| NEET UG, NEET PG, AIIMS NORCET and INI-CET | Current notice/registration/syllabus links, dates, fees and eligibility | Official agency portals are linked; current cycle-specific details were not populated. |
| State NEET counselling | State-wise official counselling portals, source URLs and schedules | No state-specific counselling row is seeded pending verification of each official state portal. |
| CUET UG | Current notice/registration/syllabus links, dates, fees and eligibility | The official portal is linked; cycle-specific details were not confirmed. |
| CUET PG | Official current portal/source URL and cycle details | The candidate NTA exams URL returned 404 during verification. Do not add a row until a current official portal is confirmed. |
| CAT | Current notice/application/syllabus links, dates, fees and eligibility | The official CAT portal is linked; cycle-specific details were not verified. |
| CLAT, NIFT Entrance and NID DAT | Current cycle notices, syllabus, dates, fees and eligibility | Official portals are linked. The verified NID 2027 page states an application deadline of 2026-11-30; the opening date and exam date are not set. |
| UGC NET | Current cycle notices, registration/syllabus links, dates, fees and eligibility | The official UGC NET portal is linked and `Teaching & Eligibility` is now an available filter category. Cycle-specific details were not verified and remain null. |
| CTET | **Category**, then current cycle details | Teaching is not an existing category for CTET; no row is added until an existing category mapping is approved or the filter category is extended intentionally. |
| BPSC, UPPSC, RPSC, MPPSC, HPSC, JPSC, WBPSC, TNPSC, KPSC, OPSC and other state PSCs | **Category**, official commission URLs, notices and cycle details | `state-psc.json` is intentionally empty: State PSC is not an existing category in the filter dropdown/type. No new category was introduced silently. |
| Agniveer and state police constable/SI recruitments (Bihar, Uttar Pradesh, Rajasthan, Madhya Pradesh first) | **Category**, official recruitment URLs, notices and cycle details | `police-defence.json` is intentionally empty: Police & Defence is not an existing category in the filter dropdown/type. No new category was introduced silently. |

## Existing category alignment

The directory filter offers `UPSC`, `SSC`, `Railways`, `Banking & Insurance`, `Engineering`, `Medical`, `Management`, `Undergraduate`, and `Teaching & Eligibility`. The last category was added for UGC NET. State PSC, Police & Defence, and State Medical Counselling remain unsupported categories pending your choice.
