// ============ Course ============

/** Curriculum node in the teaching tree */
export type CurriculumNodeType = 'chapter' | 'section' | 'topic';

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  description?: string;
}

export interface CurriculumNode {
  id: string;
  title: string;
  type: CurriculumNodeType;
  content?: string;            // Rich text / markdown description
  codeBlocks?: CodeBlock[];    // Code examples
  knowledgePointId?: string;   // Link to knowledge point
  problemIds?: string[];       // Linked practice problems
  children?: CurriculumNode[];
  order: number;
}

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
  curriculum: CurriculumNode[]; // Structured teaching tree (replaces teachingContent)
  teachingContent?: string;     // Legacy field, kept for migration
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
