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
  tags?: string[];                // Problem tags: 例题/作业/重点/普通/自定义
  image?: string;                 // Problem image (base64 data URL)
}

export interface Course {
  id: string;
  name: string;
  curriculum: CurriculumNode[]; // Structured teaching tree (replaces teachingContent)
  teachingContent?: string;     // Legacy field, kept for migration
  knowledgePoints: KnowledgePointDef[];
  problems: ProblemDef[];
  classes: string[];            // 班级名称列表
}

// ============ Student ============
export interface Student {
  id: string;
  name: string;
  courseId: string;
  className?: string;
  notes?: string;
  photos?: string[];  // Student photos (base64)
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
  isQualified?: boolean;       // 是否合格
  unqualifiedReason?: string;  // 不合格原因
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

// ==================== 考级记录 ====================
export interface ExamQuestionResult {
  questionIndex: number; // 题目序号 (1-based)
  isCorrect: boolean;
  note?: string; // 错题详情
}

export interface ExamRecord {
  id: string;
  studentId: string;
  courseId: string;
  level: number; // GESP级别 1-8
  examDate: string; // 考级日期 (如 "2026-03")
  totalQuestions: number; // 总题数
  correctCount: number; // 正确数
  wrongCount: number; // 错误数
  results: ExamQuestionResult[]; // 每题结果
  certificateUrl?: string; // 证书图片URL
  createdAt: string;
}

// ==================== 赛事记录 ====================
export interface CompetitionQuestionResult {
  questionIndex: number;
  isCorrect: boolean;
  note?: string;
}

export interface CompetitionRecord {
  id: string;
  studentId: string;
  courseId: string;
  competitionName: string; // 赛事名称
  competitionDate: string; // 赛事日期
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  results: CompetitionQuestionResult[];
  certificateUrl?: string;
  createdAt: string;
}

// ==================== 荣誉记录 ====================
export interface HonorRecord {
  id: string;
  studentId: string;
  courseId: string;
  type: 'exam' | 'competition'; // 考级 or 赛事
  title: string; // 荣誉标题 (如 "GESP Python 四级")
  level?: number; // 考级级别
  achievedDate: string; // 获得日期
  certificateUrl?: string; // 证书图片
  createdAt: string;
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

/** 成长档案报告数据（按学生+月份存储） */
export interface ReportData {
  studentId: string;
  month: string;                    // YYYY-MM
  teacherComment: string;
  nextGoal: string;
  studentAge: string;
  studentSchool: string;
  programmingTime: string;
  learningContent: string;
  interests: string;
  studentPhoto: string;
  studentAvatarPhoto: string;
  coverPhoto: string;
  classroomPhotos: string[];
  sprintCourseGoal: string;
  sprintGespLevels: GESPLlevel[];
  sprintCompetitionIds: string[];
  monthFocus: string;
  selectedCommentPresets: string[];
  studentWords: string;
  reportMonth: string;
  monthlyQuote: string;
  timelineQuotes: Record<string, string>;
  // 可编辑标签与统计
  editableStrengths: string[];
  editableWeaknesses: string[];
  editableAttendanceDays: Record<string, number>;
  editableHomeworkCount: Record<string, number>;
  editableFullAttendanceDays: Record<string, number>;
  editableHomeworkStandard: Record<string, number>;
  editableGrowthSuggestions: Record<string, string[]>;
  editableHomeSchoolTips: Record<string, string>;
  editableKpDescriptions: Record<string, string>;
  // 荣誉证书
  honorRecords: HonorRecord[];
  // 合并报告
  mergeTitle: string;
  mergedQuote: string;
  updatedAt: string;
}
