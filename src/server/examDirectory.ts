import type { ExamDirectoryStatus } from '../types/index.ts';

export interface ExamDirectoryFilters {
  category?: string;
  level?: 'national' | 'state';
  state?: string;
  status?: ExamDirectoryStatus;
  search?: string;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

export interface ExamDirectoryQueryResult<T> {
  exams: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const singleString = (value: unknown, name: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Query parameter "${name}" must be supplied once as text.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Query parameter "${name}" cannot be empty.`);
  return trimmed;
};

const positiveInteger = (value: unknown, name: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`Query parameter "${name}" must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    throw new Error(`Query parameter "${name}" must not exceed ${max}.`);
  }
  return parsed;
};

export const parseExamDirectoryFilters = (query: Record<string, unknown>): ExamDirectoryFilters => {
  const category = singleString(query.category, 'category');
  const rawLevel = singleString(query.level, 'level');
  if (rawLevel && rawLevel !== 'national' && rawLevel !== 'state') {
    throw new Error('Query parameter "level" must be "national" or "state".');
  }
  const state = singleString(query.state, 'state');
  const rawStatus = singleString(query.status, 'status');
  if (rawStatus && !['upcoming', 'open', 'closed', 'tbd'].includes(rawStatus)) {
    throw new Error('Query parameter "status" must be upcoming, open, closed, or tbd.');
  }
  const search = singleString(query.search, 'search');
  if (category && category.length > 80) throw new Error('Query parameter "category" is too long.');
  if (state && state.length > 80) throw new Error('Query parameter "state" is too long.');
  if (search && search.length > 100) throw new Error('Query parameter "search" must not exceed 100 characters.');

  const rawSort = singleString(query.sort, 'sort');
  if (rawSort && rawSort !== 'registrationEndDate') {
    throw new Error('Query parameter "sort" must be "registrationEndDate".');
  }
  const rawSortOrder = singleString(query.sortOrder, 'sortOrder');
  if (rawSortOrder && rawSortOrder !== 'asc' && rawSortOrder !== 'desc') {
    throw new Error('Query parameter "sortOrder" must be "asc" or "desc".');
  }

  return {
    ...(category ? { category } : {}),
    ...(rawLevel ? { level: rawLevel as 'national' | 'state' } : {}),
    ...(state ? { state } : {}),
    ...(rawStatus ? { status: rawStatus as ExamDirectoryStatus } : {}),
    ...(search ? { search } : {}),
    page: positiveInteger(query.page, 'page', 1),
    limit: positiveInteger(query.limit, 'limit', 20, 100),
    sortOrder: (rawSortOrder as 'asc' | 'desc' | undefined) ?? 'asc',
  };
};

export const getExamRegistrationStatus = (
  startDate: string | null,
  endDate: string | null,
  today = new Date().toISOString().slice(0, 10),
): ExamDirectoryStatus => {
  if (!startDate || !endDate) return 'tbd';
  if (endDate < today) return 'closed';
  if (startDate > today) return 'upcoming';
  return 'open';
};
