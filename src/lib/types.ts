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
  knowledgePointId?: string;      // Legacy single KP link
  knowledgePointIds?: string[];   // Multiple KP links (new)
  description?: string;           // Problem description
  codeExample?: string;           // Code example / solution
  difficulty?: 'easy' | 'medium' | 'hard';  // Difficulty level
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
  praiseTags?: string[];    // Teacher praise tags (synced to report)
  improveTags?: string[];   // Teacher improvement tags (synced to report)
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
  praiseTags?: string[];       // Teacher praise tags
  improveTags?: string[];      // Teacher improvement tags
  growthSuggestions?: string[]; // Growth suggestions selected by teacher
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
  praiseTags?: string[];       // Teacher praise tags
  improveTags?: string[];      // Teacher improvement tags
  growthSuggestions?: string[]; // Growth suggestions selected by teacher
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

// ============ Sprint Goal (冲刺目标) ============

/** GESP 考级等级 */
export type GESPLlevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** 自定义赛事/活动 */
export interface CompetitionEvent {
  id: string;
  name: string;           // 赛事名称
  date?: string;          // 预计日期
  description?: string;   // 简要说明
  category?: string;      // 分类（如：编程竞赛、考级、科技比赛等）
  createdAt: string;
}

/** 冲刺目标数据（按月份存储） */
export interface SprintGoalData {
  month: string;                    // YYYY-MM
  studentId: string;
  courseGoal: string;               // 课程目标（自动推荐 + 可编辑）
  gespLevels: GESPLlevel[];         // 选中的 GESP 考级等级
  competitionIds: string[];         // 选中的赛事 ID
  updatedAt: string;
}
