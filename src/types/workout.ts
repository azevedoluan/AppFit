export interface ExerciseSet {
  id: string;
  setNumber: number;
  targetReps: string;
  weight: number;
  completed: boolean;
  completedAt?: string;
}

export interface WeightHistoryEntry {
  id: string;
  date: string;       // YYYY-MM-DD ou ISO
  weight: number;     // kg
  reps?: string;
  setNumber?: number;
}

export interface Exercise {
  id: string;
  order: number;
  name: string;
  category: string;
  seriesCount: number;
  repsDescription: string;
  restDescription: string;
  suggestedRestOptions: number[];
  orientation: string;
  sets: ExerciseSet[];
  isExpanded?: boolean;
  isOptional?: boolean;
  lastWeight?: number;
  weightHistory?: WeightHistoryEntry[];
}

export type DayCode = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string;

export interface WorkoutDay {
  id: string;
  dayCode: DayCode;
  dayName: string;
  title: string;
  shortLabel: string; // e.g. "Sup A", "Inf A", "Treino A"
  categoryBadge: string; // e.g. "MEMBROS INFERIORES • A", "TREINO A"
  subtitle: string;
  exercises: Exercise[];
  divisionType?: 'weekly' | 'alphabetical';
}

export interface WorkoutCycle {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  durationWeeks: number;
  durationMonths: number;
  isActive: boolean;
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
  cycle: WorkoutCycle;
}

export interface RestTimerState {
  isActive: boolean;
  secondsRemaining: number;
  totalDuration: number;
  targetEndTime?: number;
  exerciseName?: string;
}

export interface CompletedWorkoutRecord {
  id: string;
  workoutDayId: string;
  workoutTitle: string;
  dayName: string;
  startedAt: string; // ISO string
  endedAt: string;   // ISO string
  durationSeconds: number;
  totalSets: number;
  completedSets: number;
  comment?: string;
  exercisesSummary: {
    name: string;
    completedSets: number;
    maxWeight: number;
  }[];
}

export interface ActiveWorkoutSession {
  isActive: boolean;
  workoutDayId: string;
  startedAt: string;
  elapsedSeconds: number;
}
