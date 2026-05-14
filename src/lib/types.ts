// ============ Course ============
export interface KnowledgePointDef {
  id: string;
  name: string;
  description?: string;
}

export interface ProblemDef {
  id: string;
  name: string;
  knowledgePointId?: string;
}

export interface Course {
  id: string;
  name: string;
  teachingContent: string; // Markdown-style teaching plan content
  knowledgePoints: KnowledgePointDef[];
  problems: ProblemDef[];
}

// ============ Student ============
export interface Student {
  id: string;
  name: string;
  courseId: string;
  className?: string;
  notes?: string;
  createdAt: string;
}

// ============ Records (separated by type) ============
export interface TypingRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  speed: number;
  accuracy: number;
}

export interface ProblemRetryRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  problemId: string;
  problemName: string;
  attempt: number;
  timeSpent: number;
  notes?: string;
}

export interface HomeworkRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  title: string;
  content: string;
  score?: number;
  comment?: string;
  imageUrl?: string;
}

// ============ Knowledge Progress ============
export type KnowledgeStatus = 'not_started' | 'learning' | 'mastered';

export interface KnowledgeProgress {
  id: string;
  studentId: string;
  knowledgePointId: string;
  knowledgePointName: string;
  courseId: string;
  status: KnowledgeStatus;
  score?: number; // 1-10 rating
  description?: string; // Teacher's assessment description
  updatedAt: string;
}
