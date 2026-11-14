import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/server/db.ts';
import { createExamRouter } from './src/server/examRoutes.ts';
import { disconnectPrisma } from './src/server/prisma.ts';
import { hasDocumentSignature, optimizeOcrImage } from './src/server/documentProcessing.ts';
import { calculateProfileCompletion, getDaysRemaining, getRegistrationStatus, evaluateEligibility, mapProfileToExamFields } from './src/utils/eligibilityEngine.ts';
import { mapOcrDataToProfile, validateOcrFieldValue } from './src/services/geminiOcrService.ts';
import { StudentProfile, DocumentRecord, DocumentType, ApplicationRecord, ApplicationStatus, UserAccount, GeminiOcrResponse, ExtractedFieldData } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE_NAME = 'registra_session';
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESETS_PER_WINDOW = 3;
const OTP_COOLDOWN_MS = 60_000;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const otpRequestWindows = new Map<string, { count: number; firstRequestedAt: number }>();
class EmailConfigurationError extends Error {
  constructor() {
    super('Email delivery is not configured. Add EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to .env, then restart REGISTRA.');
    this.name = 'EmailConfigurationError';
  }
}

const getEmailConfigurationError = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM ||
      [SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM].some((value) => /^(your_|change-me|example\.com|smtp\.example\.com|noreply@registra\.local)/i.test(value))) {
    return new EmailConfigurationError();
  }
  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return new Error('SMTP_PORT must be a valid TCP port. Update your .env configuration and restart REGISTRA.');
  }
  return null;
};

const emailTransport = () => {
  const configError = getEmailConfigurationError();
  if (configError) throw configError;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(SMTP_PORT);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

export const app = express();

const sanitizeUser = (user?: UserAccount | null): Partial<UserAccount> | null => {
  if (!user) return null;
  const { passwordHash, otpCode, otpHash, otpExpiresAt, otpAttemptsRemaining, lastOtpSentAt, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user as UserAccount & {
    passwordHash?: string;
    otpCode?: string | null;
    otpHash?: string | null;
    otpExpiresAt?: number | null;
    otpAttemptsRemaining?: number;
    lastOtpSentAt?: number | null;
    passwordResetToken?: string | null;
    passwordResetExpiresAt?: number | null;
  };
  return safeUser;
};

const parseCookieHeader = (req: Request): Record<string, string> => {
  const header = req.headers.cookie;
  if (!header || typeof header !== 'string') return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (!name) continue;
    cookies[name] = decodeURIComponent(rest.join('='));
  }
  return cookies;
};

const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): express.RequestHandler => (req, res, next) => {
  void handler(req, res, next).catch(next);
};

const sensitiveFieldPattern = /password|passwd|token|session|otp|cookie|secret|api.?key|authorization/i;

const collectSensitiveValues = (value: unknown, key = ''): string[] => {
  if (typeof value === 'string') return sensitiveFieldPattern.test(key) && value ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => collectSensitiveValues(item, key));
  if (typeof value !== 'object' || value === null) return [];
  const parentIsSensitive = sensitiveFieldPattern.test(key);
  return Object.entries(value).flatMap(([childKey, childValue]) =>
    collectSensitiveValues(childValue, parentIsSensitive ? key : childKey));
};

const getSensitiveRequestValues = (req: Request): string[] => {
  const values = collectSensitiveValues(req.body);
  for (const headerName of ['cookie', 'authorization', 'x-api-key']) {
    const headerValue = req.headers[headerName];
    const headerValues = typeof headerValue === 'string'
      ? [headerValue]
      : Array.isArray(headerValue) ? headerValue : [];
    for (const value of headerValues) {
      if (!value) continue;
      values.push(value);
      if (headerName === 'cookie') {
        values.push(...value.split(';').map((cookie) => cookie.trim().slice(cookie.indexOf('=') + 1)).filter(Boolean));
      } else if (headerName === 'authorization') {
        values.push(...value.split(/\s+/).slice(1).filter(Boolean));
      }
    }
  }
  return values;
};

const redactSensitiveText = (value: string, sensitiveValues: string[] = []): string => {
  let redacted = value
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, 'postgresql://[REDACTED]')
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, '[REDACTED_HASH]')
    .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{16,})\b/g, '[REDACTED_API_KEY]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(password\w*|passwd\w*|token\w*|session\w*|otp\w*|cookie\w*|secret\w*|api.?key\w*|authorization)\s*[:=]\s*["']?[^,\s"'&]+/gi, '$1=[REDACTED]');
  for (const secret of sensitiveValues.filter(Boolean).sort((a, b) => b.length - a.length)) {
    redacted = redacted.split(secret).join('[REDACTED]');
  }
  return redacted;
};

const sanitizeLogValue = (value: unknown, sensitiveValues: string[], key = ''): unknown => {
  if (sensitiveFieldPattern.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactSensitiveText(value, sensitiveValues);
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item, sensitiveValues));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      sanitizeLogValue(childValue, sensitiveValues, childKey),
    ]),
  );
};

const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  for (const key of ['code', 'errorCode']) {
    const value = Reflect.get(error, key);
    if (typeof value === 'string') return value;
  }
  return undefined;
};

const getErrorMessage = (error: unknown, sensitiveValues: string[] = []): string =>
  redactSensitiveText(error instanceof Error ? error.message : String(error), sensitiveValues);

const logRequestError = (error: unknown, req: Request): void => {
  const code = getErrorCode(error);
  const name = error instanceof Error ? error.name : 'UnknownError';
  if (isProd) {
    console.error(`[Server] ${req.method} ${req.path} failed (${code ?? name})`);
    return;
  }

  const sensitiveValues = getSensitiveRequestValues(req);
  const details: Record<string, unknown> = {
    method: req.method,
    endpoint: req.path,
    name,
    code,
    message: getErrorMessage(error, sensitiveValues),
  };
  if (error instanceof Error && error.stack) {
    details.stack = redactSensitiveText(error.stack, sensitiveValues);
  }
  if (typeof error === 'object' && error !== null) {
    for (const key of ['clientVersion', 'meta', 'batchRequestIdx']) {
      const value = Reflect.get(error, key);
      if (value !== undefined) details[key] = sanitizeLogValue(value, sensitiveValues, key);
    }
  }
  console.error('[Server] Request failed:', JSON.stringify(details, null, 2));
};

const getSessionUserId = async (req: Request): Promise<string | null> => {
  const cookieValue = parseCookieHeader(req)[SESSION_COOKIE_NAME];
  if (!cookieValue) return null;
  const sessionKey = crypto.createHash('sha256').update(cookieValue).digest('hex');
  const session = await db.getSession(sessionKey);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    await db.deleteSession(sessionKey);
    return null;
  }
  if (!await db.getUserById(session.userId)) {
    await db.deleteSession(sessionKey);
    return null;
  }
  return session.userId;
};

const createSession = async (res: Response, userId: string): Promise<void> => {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.saveSession(crypto.createHash('sha256').update(sessionId).digest('hex'), userId, expiresAt);
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
};

const clearSession = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
};

const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = await getSessionUserId(req);
  if (!userId) {
    const cookiePresent = Boolean(parseCookieHeader(req)[SESSION_COOKIE_NAME]);
    res.status(401).json({ error: cookiePresent ? 'Your session has expired. Please sign in again.' : 'Authentication required.' });
    return;
  }
  (req as Request & { userId?: string }).userId = userId;
  next();
});

const isPasswordStrong = (value: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
const generateOtp = () => String(crypto.randomInt(100000, 1_000_000));
const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');
const verifyOtp = (otp: string, otpHash: string) => {
  const supplied = Buffer.from(hashOtp(otp), 'hex');
  const stored = Buffer.from(otpHash, 'hex');
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
};
const sendOtpEmail = async (email: string, otp: string) => {
  await emailTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your REGISTRA email verification code',
    text: `Your REGISTRA verification code is ${otp}. It expires in 10 minutes.`,
  });
};
const sendResetEmail = async (email: string, token: string) => {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL must be configured to send password reset links.');
  const resetUrl = new URL('/reset-password', appUrl);
  resetUrl.searchParams.set('token', token);
  await emailTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your REGISTRA password',
    text: `Use this single-use link to reset your password: ${resetUrl.toString()}\nIt expires in one hour.`,
  });
};

const authenticatedUserId = (req: Request): string => (req as Request & { userId: string }).userId;

// Enable generous JSON body limit for document images & PDFs (up to 30MB)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
    const fetchSite = req.headers['sec-fetch-site'];
    const origin = req.headers.origin;
    let originHost: string | null = null;
    if (typeof origin === 'string') {
      try {
        originHost = new URL(origin).host;
      } catch {
        res.status(403).json({ error: 'Invalid request origin.' });
        return;
      }
    }
    if (fetchSite === 'cross-site' || (originHost !== null && originHost !== req.get('host'))) {
      res.status(403).json({ error: 'Cross-site requests are not allowed.' });
      return;
    }
  }
  next();
});

// Health and Status Endpoint
app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
  await db.checkConnection();
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    service: 'REGISTRA OCR & Examination Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: hasKey,
    model: 'gemini-3.8-flash',
  });
}));

// 1. Auth & Session endpoints
app.get('/api/auth/me', asyncHandler(async (req: Request, res: Response) => {
  const sessionUserId = await getSessionUserId(req);
  if (!sessionUserId) {
    const cookiePresent = Boolean(parseCookieHeader(req)[SESSION_COOKIE_NAME]);
    if (cookiePresent) {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      return;
    }
    res.json({ user: null, profile: null });
    return;
  }
  (req as Request & { userId?: string }).userId = sessionUserId;
  const user = await db.getUserById(sessionUserId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const profile = await db.getProfile(user.id);
  res.json({ user: sanitizeUser(user), profile });
}));

app.post('/api/auth/register', asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, confirmPassword } = req.body ?? {};
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid email required.' });
    return;
  }
  if (!password || typeof password !== 'string' || !isPasswordStrong(password)) {
    res.status(400).json({ error: 'Password must be at least 8 characters and include one uppercase letter and one number.' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (await db.getUserByEmail(normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const emailConfigError = getEmailConfigurationError();
  if (emailConfigError) {
    const isConfigurationError = emailConfigError instanceof EmailConfigurationError;
    res.status(503).json({
      error: emailConfigError.message,
      code: isConfigurationError ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_CONFIGURATION_INVALID',
    });
    return;
  }

  const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserAccount = {
    id: userId,
    email: normalizedEmail,
    fullName: fullName.trim(),
    avatarUrl: '',
    isVerified: false,
    role: 'Prospective Applicant',
    institution: '',
    createdAt: new Date().toISOString(),
    passwordHash,
    otpHash: hashOtp(otp),
    otpExpiresAt: Date.now() + OTP_TTL_MS,
    otpAttemptsRemaining: MAX_OTP_ATTEMPTS,
    lastOtpSentAt: Date.now(),
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  };

  try {
    await db.createUser(user, {
      id: userId,
      personalInfo: {
        fullName: fullName.trim(),
        dob: '',
        gender: '',
        nationality: '',
        category: '',
        email: normalizedEmail,
        phoneNumber: '',
        address: { street: '', city: '', state: '', pincode: '', country: '' },
      },
      academicInfo: {
        class10: { board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '' },
        class12: { status: '', board: '', schoolName: '', passingYear: 0, percentage: 0, rollNumber: '', stream: '', subjects: [] },
        currentQualification: '',
        institution: '',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('email already exists')) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }

  try {
    await sendOtpEmail(normalizedEmail, otp);
  } catch (error) {
    await db.deleteUser(userId);
    if (error instanceof EmailConfigurationError) {
      res.status(503).json({ error: error.message, code: 'EMAIL_NOT_CONFIGURED' });
      return;
    }
    console.error('[Auth] OTP email delivery failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(503).json({
      error: 'We could not deliver the verification email. Check SMTP host, port, authentication, and sender configuration, then try again.',
      code: 'EMAIL_DELIVERY_FAILED',
    });
    return;
  }
  res.status(201).json({
    user: sanitizeUser(user),
    message: 'Registration successful. Please verify your email with the OTP sent to your inbox.',
    requiresVerification: true,
  });
}));

app.post('/api/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const user = await db.getUserByEmail(email.trim().toLowerCase());
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  if (!user.isVerified) {
    res.status(403).json({ error: 'Please verify your email before logging in.' });
    return;
  }
  await createSession(res, user.id);
  res.json({
    user: sanitizeUser(user),
    profile: await db.getProfile(user.id),
  });
}));

app.post('/api/auth/logout', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = parseCookieHeader(req)[SESSION_COOKIE_NAME];
  if (sessionId) await db.deleteSession(crypto.createHash('sha256').update(sessionId).digest('hex'));
  clearSession(res);
  res.json({ ok: true });
}));

app.post('/api/auth/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP are required.' });
    return;
  }
  const user = await db.getUserByEmail(String(email).trim().toLowerCase());
  if (!user?.passwordHash || !user.otpHash || !user.otpExpiresAt) {
    res.status(400).json({ error: 'No active OTP found.' });
    return;
  }
  if (Date.now() > user.otpExpiresAt) {
    await db.updateUser(user.id, { otpHash: null, otpExpiresAt: null, otpAttemptsRemaining: 0 });
    res.status(400).json({ error: 'The OTP has expired. Please request a new one.' });
    return;
  }
  if (!verifyOtp(String(otp).trim(), user.otpHash)) {
    const nextAttempts = Math.max(0, (user.otpAttemptsRemaining ?? 0) - 1);
    const updates: Partial<UserAccount> = { otpAttemptsRemaining: nextAttempts };
    if (nextAttempts <= 0) {
      updates.otpHash = null;
      updates.otpExpiresAt = null;
    }
    await db.updateUser(user.id, updates);
    res.status(400).json({ error: `Invalid OTP. ${nextAttempts} attempts remaining.` });
    return;
  }
  const verifiedUser = await db.updateUser(user.id, {
    isVerified: true,
    otpHash: null,
    otpExpiresAt: null,
    otpAttemptsRemaining: MAX_OTP_ATTEMPTS,
  });
  res.json({ user: sanitizeUser(verifiedUser), message: 'Email verified successfully.' });
}));

app.post('/api/auth/resend-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const normalized = email.trim().toLowerCase();
  const user = await db.getUserByEmail(normalized);
  if (!user?.passwordHash || user.isVerified) {
    res.json({ message: 'If the account needs verification, a new OTP has been sent.' });
    return;
  }
  const now = Date.now();
  const previousWindow = otpRequestWindows.get(normalized);
  const windowEntry = !previousWindow || now - previousWindow.firstRequestedAt >= 10 * 60 * 1000
    ? { count: 0, firstRequestedAt: now }
    : previousWindow;
  if (windowEntry.count >= MAX_OTP_RESETS_PER_WINDOW && now - windowEntry.firstRequestedAt < 10 * 60 * 1000) {
    res.status(429).json({ error: 'Too many OTP requests. Please wait before retrying.' });
    return;
  }
  const lastSent = user.lastOtpSentAt ?? 0;
  if (now - lastSent < OTP_COOLDOWN_MS) {
    res.status(429).json({ error: 'Please wait before requesting a new OTP.' });
    return;
  }
  const otp = generateOtp();
  const emailConfigError = getEmailConfigurationError();
  if (emailConfigError) {
    const isConfigurationError = emailConfigError instanceof EmailConfigurationError;
    res.status(503).json({
      error: emailConfigError.message,
      code: isConfigurationError ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_CONFIGURATION_INVALID',
    });
    return;
  }
  try {
    await sendOtpEmail(normalized, otp);
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      res.status(503).json({ error: error.message, code: 'EMAIL_NOT_CONFIGURED' });
      return;
    }
    console.error('[Auth] OTP email delivery failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(503).json({
      error: 'We could not deliver the verification email. Check SMTP host, port, authentication, and sender configuration, then try again.',
      code: 'EMAIL_DELIVERY_FAILED',
    });
    return;
  }
  await db.updateUser(user.id, {
    otpHash: hashOtp(otp),
    otpExpiresAt: now + OTP_TTL_MS,
    otpAttemptsRemaining: MAX_OTP_ATTEMPTS,
    lastOtpSentAt: now,
  });
  otpRequestWindows.set(normalized, { count: (windowEntry.count || 0) + 1, firstRequestedAt: windowEntry.firstRequestedAt });
  res.json({ message: 'A new OTP has been sent to your email.' });
}));

app.post('/api/auth/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const user = await db.getUserByEmail(email.trim().toLowerCase());
  if (!user?.passwordHash) {
    res.json({ message: 'If an account exists, a password reset email has been sent.' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  await db.updateUser(user.id, {
    passwordResetToken: crypto.createHash('sha256').update(token).digest('hex'),
    passwordResetExpiresAt: Date.now() + RESET_TTL_MS,
  });
  try {
    await sendResetEmail(user.email, token);
    res.json({ message: 'If an account exists, a password reset email has been sent.' });
  } catch (error) {
    await db.updateUser(user.id, { passwordResetToken: null, passwordResetExpiresAt: null });
    console.error('[Auth] Password reset email delivery failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(503).json({ error: 'We could not send the password reset email. Please try again later.' });
  }
}));

app.post('/api/auth/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body ?? {};
  if (!token || !password || !confirmPassword) {
    res.status(400).json({ error: 'Token and new password are required.' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }
  if (!isPasswordStrong(password)) {
    res.status(400).json({ error: 'Password must be at least 8 characters and include one uppercase letter and one number.' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const user = await db.getUserByPasswordResetToken(tokenHash);
  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset token.' });
    return;
  }
  await db.updatePasswordAndRevokeSessions(user.id, await bcrypt.hash(password, 12));
  res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
}));

// 2. User Profile endpoints
app.get('/api/user/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const profile = await db.getProfile(userId);
  const user = await db.getUserById(userId);
  if (!profile || !user) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ profile, user: sanitizeUser(user) });
}));

app.put('/api/user/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const updates = req.body.profile || req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    res.status(400).json({ error: 'Profile updates must be an object.' });
    return;
  }
  const updated = await db.updateProfile(userId, updates);
  const user = await db.getUserById(userId);
  res.json({ profile: updated, user: sanitizeUser(user) });
}));

// 3. User Documents endpoints
app.get('/api/user/documents', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const documents = await db.getDocuments(userId);
  res.json({ documents });
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      const userId = authenticatedUserId(req);
      const dir = path.resolve(__dirname, 'data', 'uploads', userId, 'documents');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    },
  }),
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Unsupported file type. Allowed: PDF, JPG, JPEG, PNG.'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const getStoredDocumentPath = (userId: string, document: DocumentRecord): string | null => {
  const prefix = `/api/user/documents/${encodeURIComponent(userId)}/file/`;
  if (!document.fileUrl?.startsWith(prefix)) return null;
  let fileName: string;
  try {
    fileName = decodeURIComponent(document.fileUrl.slice(prefix.length));
  } catch {
    return null;
  }
  if (!fileName || fileName !== path.basename(fileName)) return null;
  const userDirectory = path.resolve(__dirname, 'data', 'uploads', userId, 'documents');
  const filePath = path.resolve(userDirectory, fileName);
  return filePath.startsWith(`${userDirectory}${path.sep}`) ? filePath : null;
};

const hasValidDocumentSignature = (filePath: string, mimeType: string): boolean => {
  const signature = Buffer.alloc(12);
  const descriptor = fs.openSync(filePath, 'r');
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(descriptor, signature, 0, signature.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hasDocumentSignature(signature.subarray(0, bytesRead), mimeType);
};

app.post('/api/user/documents/upload', requireAuth, upload.array('documents', 10), asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const files = Array.isArray((req as any).files) ? (req as any).files as Express.Multer.File[] : [];
  if (!files.length) {
    res.status(400).json({ error: 'At least one document is required.' });
    return;
  }
  if (files.length > 1) {
    for (const file of files) fs.unlinkSync(file.path);
    res.status(400).json({ error: 'Upload one document record at a time.' });
    return;
  }
  const allowedTypes: DocumentType[] = [
    'class10_marksheet', 'class12_marksheet', 'aadhaar_card', 'passport', 'category_certificate',
    'domicile_certificate', 'income_certificate', 'transfer_certificate', 'educational_certificate',
    'photograph', 'signature', 'identity_proof',
  ];
  const requestedType = String(req.body.type || '');
  if (!allowedTypes.includes(requestedType as DocumentType)) {
    for (const file of files) fs.unlinkSync(file.path);
    res.status(400).json({ error: 'Select a valid document type before uploading.' });
    return;
  }
  const file = files[0];
  if (!hasValidDocumentSignature(file.path, file.mimetype)) {
    fs.unlinkSync(file.path);
    res.status(400).json({ error: 'The file contents do not match a supported PDF, JPG, PNG, or WEBP document.' });
    return;
  }
  const existing = (await db.getDocuments(userId)).find((document) => document.type === requestedType);
  const previousFilePath = existing ? getStoredDocumentPath(userId, existing) : null;
  const doc: DocumentRecord = {
    id: existing?.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: requestedType as DocumentType,
    title: file.originalname,
    description: 'Uploaded securely to your account.',
    requiredFor: existing?.requiredFor ?? [],
    status: 'Uploaded',
    fileUrl: `/api/user/documents/${encodeURIComponent(userId)}/file/${encodeURIComponent(file.filename)}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    uploadedAt: new Date().toISOString(),
    confidenceScore: undefined,
    extractedData: undefined,
    detailedExtraction: undefined,
  };
  try {
    await db.saveDocument(userId, doc);
  } catch (error) {
    fs.unlinkSync(file.path);
    throw error;
  }
  if (previousFilePath && previousFilePath !== file.path && fs.existsSync(previousFilePath)) {
    try {
      fs.unlinkSync(previousFilePath);
    } catch (error) {
      console.error('[DOCUMENT] Replaced file cleanup failed:', error instanceof Error ? error.name : 'Unknown error');
    }
  }
  res.status(201).json({ documents: await db.getDocuments(userId), uploaded: files.length });
}));

app.post('/api/user/documents', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const { docId, updates } = req.body;
  if (typeof docId !== 'string' || !docId || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
    res.status(400).json({ error: 'A document ID and document updates are required.' });
    return;
  }
  if (Object.keys(updates).some((key) => key !== 'title' && key !== 'description') ||
      (updates.title !== undefined && (typeof updates.title !== 'string' || updates.title.trim().length > 200)) ||
      (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.trim().length > 1000))) {
    res.status(400).json({ error: 'Only a document title or description can be changed.' });
    return;
  }
  try {
    const documents = await db.updateDocument(userId, docId, updates);
    res.json({ documents });
  } catch (error) {
    if (error instanceof Error && error.message === 'Document not found.') {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

app.get('/api/user/documents/:userId/file/:fileName', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = authenticatedUserId(req);
  const requestedUserId = req.params.userId;
  if (requestedUserId !== currentUserId) {
    res.status(403).json({ error: 'You do not have permission to access this document.' });
    return;
  }
  const requestedName = path.basename(req.params.fileName);
  const document = (await db.getDocuments(currentUserId)).find((item) => {
    const storedPath = getStoredDocumentPath(currentUserId, item);
    return storedPath && path.basename(storedPath) === requestedName;
  });
  const filePath = document ? getStoredDocumentPath(currentUserId, document) : null;
  if (!document || !filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.query.download === '1') {
    res.download(filePath, document.fileName || path.basename(filePath));
    return;
  }
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.sendFile(filePath, { headers: { 'Content-Disposition': 'inline' } });
}));

app.delete('/api/user/documents/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const docId = req.params.id;
  const docs = await db.getDocuments(userId);
  const target = docs.find((doc) => doc.id === docId);
  const targetPath = target ? getStoredDocumentPath(userId, target) : null;
  const documents = await db.deleteDocument(userId, docId);
  if (targetPath && fs.existsSync(targetPath)) {
    try {
      await fs.promises.unlink(targetPath);
    } catch (error) {
      console.error('[DOCUMENT] Deleted record file cleanup failed:', error instanceof Error ? error.name : 'Unknown error');
    }
  }
  res.json({ documents });
}));

// 4. User Applications endpoints
app.get('/api/user/applications', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const applications = await db.getApplications(userId);
  res.json({ applications });
}));

app.post('/api/user/applications', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
  const appData = req.body?.application || req.body;
  if (typeof appData?.examId !== 'string' || !appData.examId) {
    res.status(400).json({ error: 'examId is required' });
    return;
  }
  const exam = await db.getExamById(appData.examId);
  if (!exam) {
    res.status(404).json({ error: 'This examination is not available from a verified exam record.' });
    return;
  }
  const allowedStatuses: ApplicationStatus[] = ['Completed', 'Submitted', 'Rejected', 'In Progress', 'Pending', 'Needs Review'];
  if (appData.status !== undefined && !allowedStatuses.includes(appData.status)) {
    res.status(400).json({ error: 'Invalid application status.' });
    return;
  }
  const profile = await db.getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  const mappedFields = mapProfileToExamFields(profile, exam, await db.getDocuments(userId)).flatMap((section) => section.fields);
  const mappedFieldsCount = mappedFields.filter((field) => field.status === 'Auto-Mapped' || field.status === 'Verified').length;
  const missingFields = mappedFields
    .filter((field) => field.status === 'Missing' || field.status === 'Manual Review')
    .map((field) => field.examField);
  const saved = await db.saveApplication(userId, {
    ...appData,
    examId: exam.id,
    examName: exam.name,
    authority: exam.authority,
    deadline: exam.applicationDeadline,
    officialPortalUrl: exam.officialWebsite,
    progressPercent: mappedFields.length ? Math.round((mappedFieldsCount / mappedFields.length) * 100) : 0,
    missingFields,
    mappedFieldsCount,
    totalFieldsCount: mappedFields.length,
  });
  const applications = await db.getApplications(userId);
  res.json({ application: saved, applications });
}));

// 5. Competitive Exams database
app.use('/api/exams', createExamRouter(db));

// 6. Dynamic Dashboard Stats (ALL COMPUTED REAL-TIME FOR THE AUTHENTICATED USER)
app.get('/api/dashboard/stats', requireAuth, asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const [user, profile, documents, applications, exams] = await Promise.all([
    db.getUserById(userId),
    db.getProfile(userId),
    db.getDocuments(userId),
    db.getApplications(userId),
    db.getExams(),
  ]);

  if (!user || !profile) {
    res.status(404).json({ error: 'User or profile not found' });
    return;
  }

  // Calculate dynamic profile completion strictly from user's actual profile
  const profileCompletion = calculateProfileCompletion(profile, documents);
  const uploadedDocuments = documents.filter((document) => Boolean(document.fileUrl));
  const storedFiles = await Promise.all(uploadedDocuments.map(async (document) => {
    const filePath = getStoredDocumentPath(userId, document);
    if (!filePath) throw new Error('A saved document has an invalid storage path. Contact support.');
    try {
      const fileStat = await fs.promises.stat(filePath);
      if (!fileStat.isFile()) throw new Error('A saved document is not a regular file. Contact support.');
      return fileStat.size;
    } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }));
  const storageBytes = storedFiles.reduce((sum, size) => sum + size, 0);

  // Calculate dynamic exams availability & eligibility
  const nowStr = new Date().toISOString().slice(0, 10);
  const examStatuses = exams.map((exam) => ({
    exam,
    status: getRegistrationStatus(exam.applicationOpenDate, exam.applicationDeadline, nowStr),
  }));
  const activeExams = examStatuses.filter(({ status }) => status === 'Registration Open');
  const eligibleExams = exams.filter((exam) => {
    const result = evaluateEligibility(profile, exam, nowStr);
    return result.sufficientInformation && result.isEligible;
  });

  const countStatus = (status: ApplicationStatus) => applications.filter((application) => application.status === status).length;

  const upcomingExams = examStatuses
    .filter(({ status }) => status === 'Registration Open' || status === 'Upcoming')
    .map(({ exam }) => {
      const days = getDaysRemaining(exam.applicationDeadline, nowStr);
      return {
        examId: exam.id,
        name: exam.name,
        authority: exam.authority,
        deadline: exam.applicationDeadline,
        daysRemaining: days,
        isUrgent: days !== null && days >= 0 && days <= 20,
      };
    })
    .filter((exam): exam is typeof exam & { daysRemaining: number } => exam.daysRemaining !== null && exam.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const nearest = upcomingExams[0] || null;

  const fieldReuseAnalytics = exams.filter((exam) => (exam.applicationFields?.length ?? 0) > 0).map((exam) => {
    const categories = mapProfileToExamFields(profile, exam, documents);
    const allFields = categories.flatMap(c => c.fields);
    const autoMapped = allFields.filter(f => f.status === 'Auto-Mapped' || f.status === 'Verified').length;
    const manualReview = allFields.filter(f => f.status === 'Missing' || f.status === 'Manual Review').length;
    const total = allFields.length;
    const percentAuto = total ? Math.round((autoMapped / total) * 100) : 0;
    return {
      examId: exam.id,
      name: exam.name,
      autoMapped,
      manualReview,
      total,
      percentAuto,
    };
  });

  res.json({
    userId,
    user: sanitizeUser(user),
    profileCompletion,
    documents: {
      uploadedCount: uploadedDocuments.length,
      storageBytes,
    },
    examsAvailable: {
      total: exams.length,
      activeRegistration: activeExams.length,
      eligibleCount: eligibleExams.length,
    },
    applicationsInProgress: {
      total: applications.length,
      inProgress: countStatus('In Progress'),
      completed: countStatus('Completed'),
      submitted: countStatus('Submitted'),
      rejected: countStatus('Rejected'),
      pending: countStatus('Pending'),
      needsReview: countStatus('Needs Review'),
    },
    upcomingDeadlines: {
      count: upcomingExams.length,
      nearestDaysRemaining: nearest ? nearest.daysRemaining : null,
      nearestExamName: nearest ? nearest.name : null,
      nearestDeadline: nearest ? nearest.deadline : null,
      items: upcomingExams,
    },
    fieldReuseAnalytics,
  });
}));

interface ExtractedField {
  value: string | null;
  confidence: number;
  status: 'high' | 'review' | 'low' | 'missing';
}

interface OcrResponsePayload {
  document_type: string;
  extraction_status: 'success' | 'warning' | 'error';
  extracted_data: Record<string, ExtractedField>;
  warnings: string[];
  requires_manual_review: boolean;
  metadata?: {
    model: string;
    processingTimeMs: number;
    fileSizeKB: number;
    fileName: string;
  };
}

const OCR_FIELDS_BY_DOCUMENT_TYPE: Partial<Record<DocumentType, string[]>> = {
  class10_marksheet: [
    'student_name', 'date_of_birth', 'gender', 'board_or_university', 'school_or_college',
    'roll_number', 'passing_year', 'marks_obtained', 'maximum_marks', 'percentage',
  ],
  class12_marksheet: [
    'student_name', 'date_of_birth', 'gender', 'board_or_university', 'school_or_college',
    'roll_number', 'passing_year', 'subjects', 'marks_obtained', 'maximum_marks', 'percentage',
  ],
  aadhaar_card: ['student_name', 'date_of_birth', 'gender', 'issuing_authority', 'issue_date'],
  identity_proof: ['student_name', 'date_of_birth', 'gender', 'issuing_authority', 'issue_date', 'expiry_date'],
  passport: ['student_name', 'date_of_birth', 'gender', 'issuing_authority', 'issue_date', 'expiry_date'],
  category_certificate: ['student_name', 'issuing_authority', 'issue_date', 'expiry_date'],
  domicile_certificate: ['student_name', 'issuing_authority', 'issue_date', 'expiry_date'],
  income_certificate: ['student_name', 'issuing_authority', 'issue_date', 'expiry_date'],
  transfer_certificate: [
    'student_name', 'date_of_birth', 'board_or_university', 'school_or_college',
    'roll_number', 'passing_year', 'issue_date',
  ],
  educational_certificate: [
    'student_name', 'board_or_university', 'school_or_college', 'roll_number',
    'passing_year', 'subjects', 'marks_obtained', 'maximum_marks', 'percentage', 'cgpa',
  ],
};

const successfulOcrCache = new Map<string, { expiresAt: number; result: GeminiOcrResponse }>();
const inFlightOcr = new Map<string, Promise<GeminiOcrResponse>>();
const OCR_CACHE_TTL_MS = 60 * 60 * 1000;
const OCR_CACHE_MAX_ENTRIES = 100;
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 90_000;
const getOcrDocumentPath = getStoredDocumentPath;

const sendOcrEvent = (res: Response, event: 'stage' | 'result' | 'error', value: unknown) => {
  if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
};

const normalizeOcrResult = (
  raw: unknown,
  documentType: DocumentType,
  fileName: string,
  fileSizeKB: number,
  processingTimeMs: number,
): GeminiOcrResponse => {
  if (!raw || typeof raw !== 'object') throw new Error('The extraction service returned an invalid response. Please retry.');
  const parsed = raw as Record<string, unknown>;
  const rawData = parsed.extracted_data;
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    throw new Error('The extraction service returned no structured fields. Please retry.');
  }

  const fieldKeys = OCR_FIELDS_BY_DOCUMENT_TYPE[documentType] ?? [];
  const extractedData: GeminiOcrResponse['extracted_data'] = {};
  for (const key of fieldKeys) {
    const candidate = (rawData as Record<string, unknown>)[key];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('The extraction response was incomplete. Please retry the scan.');
    }
    const field = candidate as Record<string, unknown>;
    if (typeof field.value !== 'string') {
      throw new Error('The extraction service returned an invalid field value. Please retry the scan.');
    }
    const text = field.value.trim();
    if (typeof field.confidence !== 'number' || !Number.isInteger(field.confidence) || field.confidence < 0 || field.confidence > 100) {
      throw new Error('The extraction service returned an invalid confidence score. Please retry the scan.');
    }
    const confidence = field.confidence;
    const status = !text
      ? 'missing'
      : confidence >= 90
        ? 'high'
        : confidence >= 70
          ? 'review'
          : 'low';
    extractedData[key] = { value: text || null, confidence: text ? confidence : 0, status };
  }

  if (!Object.values(extractedData).some((field) => field.value)) {
    throw new Error('No readable fields were found. Try a clearer image or PDF.');
  }

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 10)
    : [];
  const requiresManualReview = Object.values(extractedData).some((field) => field.status !== 'high');

  return {
    document_type: documentType,
    extraction_status: requiresManualReview ? 'warning' : 'success',
    extracted_data: extractedData,
    warnings,
    requires_manual_review: requiresManualReview,
    metadata: {
      model: 'gemini-3.8-flash',
      processingTimeMs,
      fileSizeKB,
      fileName,
    },
  };
};

const isTemporaryGeminiFailure = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const details = error as { status?: number; code?: string };
  return [408, 429, 500, 502, 503, 504].includes(Number(details.status)) ||
    ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(String(details.code));
};

const runGeminiOcr = async (
  buffer: Buffer,
  mimeType: string,
  documentType: DocumentType,
  fileName: string,
  requestSignal: AbortSignal,
  onStage: (stage: 'processing' | 'extracting') => void,
): Promise<GeminiOcrResponse> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') throw new Error('Gemini OCR is not configured on the server.');
  const fields = OCR_FIELDS_BY_DOCUMENT_TYPE[documentType];
  if (!fields?.length) throw new Error('This document type does not have configured OCR fields.');

  const requestStartedAt = Date.now();
  onStage('processing');
  let optimizedBuffer = buffer;
  let optimizedMimeType = mimeType;
  if (mimeType.startsWith('image/')) {
    optimizedBuffer = await optimizeOcrImage(buffer);
    optimizedMimeType = 'image/jpeg';
  }

  const properties = Object.fromEntries(fields.map((key) => [key, {
    type: 'OBJECT',
    properties: {
      value: { type: 'STRING', description: 'Exact value read from the document, or an empty string if absent or unreadable.' },
      confidence: { type: 'INTEGER', description: 'Visual legibility score from 0 to 100.' },
    },
    required: ['value', 'confidence'],
  }]));
  const responseJsonSchema = {
    type: 'OBJECT',
    properties: {
      document_type: { type: 'STRING' },
      extracted_data: {
        type: 'OBJECT',
        properties,
        required: fields,
      },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['document_type', 'extracted_data', 'warnings'],
  };
  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    `Extract only the requested fields from this ${documentType} document.`,
    'Return the exact visible text. Do not infer missing data or copy the full number from any government identity document.',
    'For identity documents, do not extract any ID number. For each requested field, return an empty value and confidence 0 if absent or unreadable.',
    'Set confidence based only on visual legibility; do not claim official verification.',
    `Fields: ${fields.join(', ')}.`,
  ].join(' ');

  onStage('extracting');
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (requestSignal.aborted) throw new Error('Scan cancelled.');
    try {
      const timeoutSignal = AbortSignal.timeout(OCR_TIMEOUT_MS);
      const signal = AbortSignal.any([requestSignal, timeoutSignal]);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: optimizedMimeType, data: optimizedBuffer.toString('base64') } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema,
          temperature: 0,
          abortSignal: signal,
        },
      });
      if (!response.text) throw new Error('The extraction service returned an empty response.');
      return normalizeOcrResult(
        JSON.parse(response.text),
        documentType,
        fileName,
        Math.ceil(buffer.length / 1024),
        Date.now() - requestStartedAt,
      );
    } catch (error) {
      lastError = error;
      if (requestSignal.aborted) throw new Error('Scan cancelled.');
      if (attempt === 0 && isTemporaryGeminiFailure(error)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      if (error instanceof SyntaxError) throw new Error('The extraction service returned invalid structured data. Please retry.');
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Scanning took too long. Check your connection and retry.');
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Document extraction failed. Please retry.');
};

app.post('/api/user/documents/:id/extract', requireAuth, asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const document = (await db.getDocuments(userId)).find((item) => item.id === req.params.id);
  if (!document || !document.fileUrl) {
    res.status(404).json({ error: 'Uploaded document not found in your vault.' });
    return;
  }
  const documentType = document.type;
  if (!OCR_FIELDS_BY_DOCUMENT_TYPE[documentType]) {
    res.status(400).json({ error: 'OCR is not available for this document type.' });
    return;
  }
  const documentPath = getOcrDocumentPath(userId, document);
  if (!documentPath || !fs.existsSync(documentPath)) {
    res.status(404).json({ error: 'The stored document file is unavailable. Upload it again and retry.' });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  const startedAt = Date.now();
  try {
    sendOcrEvent(res, 'stage', { stage: 'processing' });
    const buffer = await fs.promises.readFile(documentPath);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const cacheKey = `${userId}:${documentType}:${fileHash}`;
    const cached = successfulOcrCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      sendOcrEvent(res, 'stage', { stage: 'extracting', cached: true });
      sendOcrEvent(res, 'result', {
        ...cached.result,
        metadata: { ...cached.result.metadata!, processingTimeMs: Date.now() - startedAt },
      });
      res.end();
      return;
    }
    successfulOcrCache.delete(cacheKey);

    let task = inFlightOcr.get(cacheKey);
    if (!task) {
      task = runGeminiOcr(
        buffer,
        document.mimeType || (path.extname(document.fileName || '').toLowerCase() === '.pdf' ? 'application/pdf' : 'image/jpeg'),
        documentType,
        document.fileName || document.title,
        controller.signal,
        (stage) => sendOcrEvent(res, 'stage', { stage }),
      );
      inFlightOcr.set(cacheKey, task);
      void task.finally(() => inFlightOcr.delete(cacheKey)).catch(() => undefined);
    } else {
      sendOcrEvent(res, 'stage', { stage: 'extracting', cached: false });
    }

    const result = await task;
    if (controller.signal.aborted) return;
    successfulOcrCache.set(cacheKey, { expiresAt: Date.now() + OCR_CACHE_TTL_MS, result });
    while (successfulOcrCache.size > OCR_CACHE_MAX_ENTRIES) {
      const oldest = successfulOcrCache.keys().next().value;
      if (!oldest) break;
      successfulOcrCache.delete(oldest);
    }
    sendOcrEvent(res, 'result', result);
  } catch (error) {
    if (!controller.signal.aborted) {
      const message = error instanceof Error ? error.message : 'Document extraction failed.';
      console.error('[OCR] Document extraction failed:', error instanceof Error ? error.name : 'Unknown error');
      sendOcrEvent(res, 'error', { error: message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}));

app.post('/api/user/documents/:id/confirm-extraction', requireAuth, asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const document = (await db.getDocuments(userId)).find((item) => item.id === req.params.id);
  const profile = await db.getProfile(userId);
  if (!document || !document.fileUrl || !profile) {
    res.status(404).json({ error: 'Uploaded document or profile was not found.' });
    return;
  }
  const supplied = req.body?.extractedData;
  const fieldKeys = OCR_FIELDS_BY_DOCUMENT_TYPE[document.type] ?? [];
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) {
    res.status(400).json({ error: 'Validated extraction data is required.' });
    return;
  }

  const documentPath = getOcrDocumentPath(userId, document);
  if (!documentPath || !fs.existsSync(documentPath)) {
    res.status(404).json({ error: 'The stored document file is unavailable. Upload it again and retry.' });
    return;
  }
  const documentBuffer = await fs.promises.readFile(documentPath);
  const cacheKey = `${userId}:${document.type}:${crypto.createHash('sha256').update(documentBuffer).digest('hex')}`;
  const cached = successfulOcrCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    successfulOcrCache.delete(cacheKey);
    res.status(409).json({ error: 'This scan is no longer available for confirmation. Scan the document again.' });
    return;
  }

  const normalized: Record<string, ExtractedFieldData> = {};
  for (const [key, candidate] of Object.entries(supplied)) {
    if (!fieldKeys.includes(key) || !candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      res.status(400).json({ error: 'Extraction contains an unsupported field.' });
      return;
    }
    const field = candidate as Record<string, unknown>;
    if (field.value !== null && typeof field.value !== 'string') {
      res.status(400).json({ error: 'Extraction field values must be text.' });
      return;
    }
    const value = typeof field.value === 'string' ? field.value.trim() : null;
    if (value && !validateOcrFieldValue(key, value)) {
      res.status(400).json({ error: `The extracted value for ${key.replaceAll('_', ' ')} is invalid. Review it and try again.` });
      return;
    }
    const confidence = typeof field.confidence === 'number' && Number.isInteger(field.confidence) && field.confidence >= 0 && field.confidence <= 100
      ? field.confidence
      : null;
    if (confidence === null || (field.manuallyEdited !== undefined && typeof field.manuallyEdited !== 'boolean')) {
      res.status(400).json({ error: 'Extraction confidence or manual-review status is invalid.' });
      return;
    }
    const manuallyEdited = field.manuallyEdited === true;
    const sourceField = cached.result.extracted_data[key];
    if (!sourceField || confidence !== sourceField.confidence || (!manuallyEdited && value !== sourceField.value)) {
      res.status(400).json({ error: 'Extraction data changed unexpectedly. Scan the document again before saving.' });
      return;
    }
    const status = !value
      ? 'missing'
      : manuallyEdited || confidence < 90
        ? confidence < 70 && !manuallyEdited ? 'low' : 'review'
        : 'high';
    normalized[key] = { value, confidence: sourceField.confidence, status, ...(manuallyEdited ? { manuallyEdited: true } : {}) };
  }
  const obtainedMarks = Number(normalized.marks_obtained?.value);
  const maximumMarks = Number(normalized.maximum_marks?.value);
  if (Number.isFinite(obtainedMarks) && Number.isFinite(maximumMarks) && normalized.marks_obtained?.value && normalized.maximum_marks?.value && obtainedMarks > maximumMarks) {
    res.status(400).json({ error: 'Marks obtained cannot be greater than maximum marks.' });
    return;
  }
  if (!Object.values(normalized).some((field) => field.value)) {
    res.status(400).json({ error: 'At least one readable field is required to save this extraction.' });
    return;
  }

  const profileUpdates = mapOcrDataToProfile(normalized, document.type, profile);
  const extractedData = Object.fromEntries(
    Object.entries(normalized)
      .filter((entry): entry is [string, ExtractedFieldData & { value: string }] => Boolean(entry[1].value))
      .map(([key, field]) => [key, field.value]),
  );
  try {
    const saved = await db.confirmDocumentExtraction(userId, document.id, profileUpdates, normalized, extractedData);
    res.json({ profile: saved.profile, documents: saved.documents });
  } catch (error) {
    if (error instanceof Error && error.message === 'Uploaded document or profile was not found.') {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// POST /api/ocr/extract: Real Gemini 3.8 Flash Multimodal OCR Endpoint
app.post('/api/ocr/extract', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const { 
      documentType, 
      fileName, 
      fileMimeType, 
      fileBase64, 
      consentGiven 
    } = req.body;

    // Security check 1: Mandatory user consent for privacy & compliance
    if (!consentGiven) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['User consent was not provided for document processing.'],
        requires_manual_review: true,
        error: 'Consent required: You must agree to document processing before submitting to the OCR engine.',
      });
      return;
    }

    // Security check 2: Validate payload contents
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['No file data received.'],
        requires_manual_review: true,
        error: 'Invalid request: fileBase64 data is missing or malformed.',
      });
      return;
    }

    // Security check 3: Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ];
    const mimeType = (fileMimeType || 'image/jpeg').toLowerCase();
    if (!allowedMimeTypes.includes(mimeType)) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: [`Unsupported MIME type: ${mimeType}`],
        requires_manual_review: true,
        error: `Unsupported format. Supported document formats are: JPG, PNG, WEBP, and PDF.`,
      });
      return;
    }

    // Clean base64 data (strip data URL prefix if present)
    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');

    // Approximate size check (base64 string length * 0.75)
    const approxSizeKB = Math.round((base64Data.length * 0.75) / 1024);
    if (approxSizeKB > 15 * 1024) {
      res.status(400).json({
        document_type: documentType || 'Unknown',
        extraction_status: 'error',
        extracted_data: {},
        warnings: ['File exceeds maximum allowable size (15MB).'],
        requires_manual_review: true,
        error: 'File size too large. Maximum supported size is 15MB.',
      });
      return;
    }

    // Verify Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        document_type: documentType || 'Educational Document',
        extraction_status: 'error',
        extracted_data: {},
        warnings: [
          'GEMINI_API_KEY is not configured in this environment. Please configure your key in the AI Studio Settings > Secrets panel.',
        ],
        requires_manual_review: true,
        error: 'Gemini API Key is not set on the server. Please attach your GEMINI_API_KEY in the Secrets panel to activate real AI extraction.',
      });
      return;
    }

    // Initialize official @google/genai SDK with telemetry user-agent
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are the REGISTRA National Examination Forensics & OCR Extraction Engine.
Your job is to read candidate academic documents (Class 10 Marksheet, Class 12 Marksheet, Aadhaar Card, Passport, Category Certificate, Domicile Certificate, Income Certificate, etc.) and extract structured fields with realistic confidence scoring.

CRITICAL RULES:
1. For EVERY field in the schema, provide:
   - "value": The extracted string text, or null if completely missing or unreadable.
   - "confidence": An integer between 0 and 100 reflecting visual clarity, sharpness, and legibility.
     * High confidence (90-100): Clear, pristine, typed, unambiguous text.
     * Medium confidence (70-89): Partially blurred, faint stamps, complex cursive, or minor glare.
     * Low confidence (1-69): Heavily occluded, degraded, dubious, or speculative text.
     * Missing (0): Field is absent or completely unreadable.
   - "status": EXACTLY one of: "high" (90-100), "review" (70-89), "low" (0-69), "missing" (0/null).
   DO NOT give 100 to every field! Differentiate genuine confidence realistically based on document quality.
2. DO NOT extract or invent full sensitive national ID numbers. If an Aadhaar is submitted, mask all but the last 4 digits (e.g. "XXXX-XXXX-1234").
3. Determine "document_type" from the document header/watermark/issuer.
4. Set "requires_manual_review" to true if ANY field has status "review" or "low", or if any critical field is missing.
5. In "warnings", list specific observations (e.g. "Board passing certificate stamp is faint", "Candidate photo has slight glare", etc.).
6. Output purely valid JSON matching the requested structure.`;

    const promptText = `Analyze this uploaded document (${documentType || 'Official Exam Record'} - ${fileName || 'document'}) and extract all candidate, academic, and issuing details according to the required schema. Ensure every field has value, confidence (0-100), and status.`;

    const inlinePart = {
      inlineData: {
        mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
        data: base64Data,
      },
    };

    // Use gemini-3.8-flash for multimodal OCR with JSON response
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          inlinePart,
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = geminiResponse.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback clean extraction if wrapped in markdown codeblock
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Normalize and sanitize extracted data format
    const extractedData: Record<string, ExtractedField> = {};
    const rawData = parsed.extracted_data || parsed;

    // Standard field list to ensure consistent coverage
    const standardKeys = [
      'student_name',
      'date_of_birth',
      'gender',
      'fathers_name',
      'mothers_name',
      'board_or_university',
      'school_or_college',
      'roll_number',
      'registration_number',
      'passing_year',
      'subjects',
      'marks_obtained',
      'maximum_marks',
      'percentage',
      'cgpa',
      'document_type',
      'issuing_authority',
      'issue_date',
      'expiry_date',
    ];

    // Recursive flattener for nested model outputs (e.g. candidate_details, academic_details)
    function flattenFields(obj: any): Record<string, any> {
      const flat: Record<string, any> = {};
      if (!obj || typeof obj !== 'object') return flat;

      for (const [k, v] of Object.entries(obj)) {
        if (k === 'warnings' || k === 'requires_manual_review' || k === 'extraction_status') continue;

        // If v is an extracted field object { value, confidence, ... }
        if (v && typeof v === 'object' && ('value' in v || 'confidence' in v)) {
          flat[k] = v;
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          // Nested group object, recursively unpack
          const sub = flattenFields(v);
          for (const [subK, subV] of Object.entries(sub)) {
            flat[subK] = subV;
          }
        } else if (Array.isArray(v)) {
          flat[k] = v.map(item => (typeof item === 'object' && item?.value ? item.value : String(item))).join(', ');
        } else if (v !== undefined && v !== null) {
          flat[k] = String(v);
        }
      }
      return flat;
    }

    const flatRawData = flattenFields(rawData);

    // Combine standard keys and whatever the model returned
    const allKeys = new Set([...standardKeys, ...Object.keys(flatRawData)]);

    let hasReview = false;
    for (const key of allKeys) {
      if (key === 'warnings' || key === 'requires_manual_review' || key === 'document_type' || key === 'extraction_status') {
        continue;
      }

      const item = flatRawData[key];
      if (item && typeof item === 'object' && ('value' in item || 'confidence' in item)) {
        const val = item.value !== undefined ? (item.value === null ? null : String(item.value)) : null;
        let conf = typeof item.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(item.confidence))) : (val ? 85 : 0);
        let status: 'high' | 'review' | 'low' | 'missing' = 'missing';

        if (!val || val.trim() === '' || val.toLowerCase() === 'null' || val.toLowerCase() === 'n/a') {
          conf = 0;
          status = 'missing';
        } else if (conf >= 90) {
          status = 'high';
        } else if (conf >= 70) {
          status = 'review';
          hasReview = true;
        } else {
          status = 'low';
          hasReview = true;
        }

        extractedData[key] = {
          value: val,
          confidence: conf,
          status,
        };
      } else if (item !== undefined && item !== null) {
        // Plain string/number returned
        const strVal = String(item).trim();
        const conf = strVal ? 88 : 0;
        const status = conf >= 90 ? 'high' : conf >= 70 ? 'review' : 'low';
        if (status !== 'high') hasReview = true;
        extractedData[key] = {
          value: strVal || null,
          confidence: conf,
          status: strVal ? status : 'missing',
        };
      }
    }

    // Normalize common synonym keys
    if (extractedData['candidate_name'] && !extractedData['student_name']) {
      extractedData['student_name'] = extractedData['candidate_name'];
    }
    if (extractedData['full_name'] && !extractedData['student_name']) {
      extractedData['student_name'] = extractedData['full_name'];
    }
    if (extractedData['roll_or_student_id'] && !extractedData['roll_number']) {
      extractedData['roll_number'] = extractedData['roll_or_student_id'];
    }
    if (extractedData['roll_number_or_registration_id'] && !extractedData['roll_number']) {
      extractedData['roll_number'] = extractedData['roll_number_or_registration_id'];
    }
    if (extractedData['major_or_stream'] && !extractedData['subjects']) {
      extractedData['subjects'] = extractedData['major_or_stream'];
    }
    if (extractedData['date_of_issue'] && !extractedData['issue_date']) {
      extractedData['issue_date'] = extractedData['date_of_issue'];
    }

    const docTypeStr = typeof parsed.document_type === 'object' && parsed.document_type !== null
      ? String(parsed.document_type.value || documentType || 'Academic Document')
      : String(parsed.document_type || documentType || 'Academic Document');

    const payload: OcrResponsePayload = {
      document_type: docTypeStr,
      extraction_status: 'success',
      extracted_data: extractedData,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      requires_manual_review: parsed.requires_manual_review ?? hasReview,
      metadata: {
        model: 'gemini-3.8-flash',
        processingTimeMs: Date.now() - startTime,
        fileSizeKB: approxSizeKB,
        fileName: fileName || 'uploaded_document',
      },
    };

    res.json(payload);
  } catch (err: any) {
    console.error('Gemini OCR Error:', err instanceof Error ? err.name : 'Unknown error');
    res.status(500).json({
      document_type: req.body?.documentType || 'Unknown Document',
      extraction_status: 'error',
      extracted_data: {},
      warnings: [err.message || 'An unexpected error occurred during Gemini OCR extraction.'],
      requires_manual_review: true,
      error: err.message || 'Internal server error while processing document with Gemini API.',
    });
  }
});

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  logRequestError(error, req);
  const errorCode = getErrorCode(error);
  if (errorCode === 'P2002') {
    res.status(409).json({ error: 'A record with the supplied information already exists.' });
    return;
  }
  if (errorCode === 'P2003') {
    res.status(400).json({ error: 'A referenced record does not exist.' });
    return;
  }
  if (errorCode === 'P2025') {
    res.status(404).json({ error: 'The requested record was not found.' });
    return;
  }
  if (errorCode && /^P10\d\d$/.test(errorCode)) {
    res.status(503).json({
      error: isProd
        ? 'The database is temporarily unavailable. Please try again.'
        : getErrorMessage(error, getSensitiveRequestValues(req)),
    });
    return;
  }
  res.status(500).json({
    error: isProd
      ? 'An unexpected server error occurred. Please try again.'
      : getErrorMessage(error, getSensitiveRequestValues(req)),
    ...(isProd || !errorCode ? {} : { code: errorCode }),
  });
});

// Setup Vite in development or static serving in production
async function startServer() {
  await db.checkConnection();
    if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[REGISTRA] Server running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[REGISTRA] Received ${signal}; closing server.`);
    server.close((error) => {
      if (error) console.error('[REGISTRA] HTTP server shutdown failed:', error.name);
      void disconnectPrisma().then(
        () => process.exit(error ? 1 : 0),
        () => process.exit(1),
      );
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    const errorCode = getErrorCode(err);
    if (isProd) {
      console.error('[REGISTRA] Failed to start server:', errorCode ?? (err instanceof Error ? err.name : 'UnknownError'));
    } else {
      const details: Record<string, unknown> = {
        name: err instanceof Error ? err.name : 'UnknownError',
        code: errorCode,
        message: getErrorMessage(err),
      };
      if (err instanceof Error && err.stack) details.stack = redactSensitiveText(err.stack);
      if (typeof err === 'object' && err !== null) {
        for (const key of ['clientVersion', 'meta']) {
          const value = Reflect.get(err, key);
          if (value !== undefined) details[key] = sanitizeLogValue(value, [], key);
        }
      }
      console.error('[REGISTRA] Failed to start server:', JSON.stringify(details, null, 2));
    }
    process.exit(1);
  });
}
