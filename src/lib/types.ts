export interface Student {
  id: string;
  name: string;
  className?: string;
  course?: string;
  notes?: string;
  createdAt: string;
}

export interface ProblemRetry {
  problemName: string;
  attempt: number;
  timeSpent: number;
  date: string;
}

export interface WorkUpload {
  imageUrl: string;
  comment?: string;
  date: string;
}

export interface BehaviorRating {
  focus: number;
  attendance: number;
}

export interface LearningRecord {
  id: string;
  studentId: string;
  date: string;
  strengths: string[];
  improvements: string[];
  customStrengths: string[];
  customImprovements: string[];
  typingSpeed?: number;
  accuracy?: number;
  problemRetries: ProblemRetry[];
  works: WorkUpload[];
  behavior: BehaviorRating;
  notes: string;
}

export type KnowledgeStatus = 'not_started' | 'learning' | 'mastered';

export interface KnowledgePoint {
  id: string;
  studentId: string;
  name: string;
  status: KnowledgeStatus;
  updatedAt: string;
}

export interface MonthlyReport {
  studentId: string;
  month: string;
  growthKeywords: string[];
  typingSpeedData: { date: string; speed: number }[];
  problemTrendData: { problemName: string; attempts: { attempt: number; timeSpent: number }[] }[];
  knowledgeStatus: { name: string; status: KnowledgeStatus }[];
  teacherMessage: string;
  bestWork: WorkUpload | null;
  nextMonthGoals: string;
}
