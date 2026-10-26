import type { WorkoutCycle } from '../types/workout';

export function calculateCycleFromDates(startDateStr: string, endDateStr: string): WorkoutCycle {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const durationWeeks = Math.max(1, Math.round(diffDays / 7));
  const durationMonths = Math.max(0.5, Math.round((diffDays / 30.4375) * 10) / 10);

  const isActive = today >= start && today <= end;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    durationWeeks,
    durationMonths,
    isActive
  };
}

export function calculateEndDateFromWeeks(startDateStr: string, weeks: number): string {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return end.toISOString().split('T')[0];
}

export function calculateEndDateFromMonths(startDateStr: string, months: number): string {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end.toISOString().split('T')[0];
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function getDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 0;
  const end = new Date(endDateStr + 'T23:59:59');
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
