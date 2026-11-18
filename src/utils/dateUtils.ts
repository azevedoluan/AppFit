import type { WorkoutCycle } from '../types/workout';

/**
 * Normaliza qualquer formato de data (ISO 8601, Date, timestamp) para string estrita YYYY-MM-DD.
 * Evita o bug crítico de Invalid Date/NaN ao concatenar strings que já contêm 'T' ou 'Z'.
 */
export function normalizeDateString(dateStr: string | Date | null | undefined): string {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(dateStr).trim();
  if (s.includes('T')) {
    return s.split('T')[0];
  }
  if (s.includes(' ')) {
    return s.split(' ')[0];
  }
  return s;
}

export function calculateCycleFromDates(startDateStr: string, endDateStr: string): WorkoutCycle {
  const cleanStart = normalizeDateString(startDateStr);
  const cleanEnd = normalizeDateString(endDateStr);

  const start = new Date(cleanStart + 'T00:00:00');
  const end = new Date(cleanEnd + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const durationWeeks = Math.max(1, Math.round(diffDays / 7));
  const durationMonths = Math.max(0.5, Math.round((diffDays / 30.4375) * 10) / 10);

  const isActive = today >= start && today <= end;

  return {
    startDate: cleanStart,
    endDate: cleanEnd,
    durationWeeks,
    durationMonths,
    isActive
  };
}

export function calculateEndDateFromWeeks(startDateStr: string, weeks: number): string {
  const cleanStart = normalizeDateString(startDateStr);
  const [year, month, day] = cleanStart.split('-').map(Number);
  const validWeeks = Math.max(1, weeks);
  
  const end = new Date(year, (month || 1) - 1, day || 1);
  end.setDate(end.getDate() + validWeeks * 7);

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateEndDateFromMonths(startDateStr: string, months: number): string {
  const cleanStart = normalizeDateString(startDateStr);
  const [year, month, day] = cleanStart.split('-').map(Number);
  const validMonths = Math.max(0.5, months);
  
  const end = new Date(year, (month || 1) - 1, day || 1);
  end.setDate(end.getDate() + Math.round(validMonths * 30.4375));

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const clean = normalizeDateString(dateStr);
  const [year, month, day] = clean.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 0;
  const clean = normalizeDateString(endDateStr);
  const [year, month, day] = clean.split('-').map(Number);
  const end = new Date(year, (month || 1) - 1, day || 1, 23, 59, 59);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
