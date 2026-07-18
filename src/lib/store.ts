import type {
  Course,
  CurriculumNode,
  Student,
  TypingRecord,
  ProblemRetryRecord,
  HomeworkRecord,
  KnowledgeProgress,
  KnowledgeStatus,
  CompetitionEvent,
  SprintGoalData,
  GESPLlevel,
  ExamRecord,
  CompetitionRecord,
  HonorRecord,
  ReportData,
} from './types';
import {
  COURSE_PRESETS,
  DEFAULT_CPP_KNOWLEDGE,
  DEFAULT_PYTHON_KNOWLEDGE,
  DEFAULT_VISUAL_KNOWLEDGE,
  DEFAULT_COMPETITIONS,
} from './constants';

const COURSES_KEY = 'coding_courses';
const STUDENTS_KEY = 'coding_students';
const TYPING_KEY = 'coding_typing_records';
const RETRY_KEY = 'coding_retry_records';
const HOMEWORK_KEY = 'coding_homework_records';
const KNOWLEDGE_KEY = 'coding_knowledge_progress';
const COMPETITIONS_KEY = 'coding_competitions';
const SPRINT_GOALS_KEY = 'coding_sprint_goals';
const REPORTS_KEY = 'coding_reports';

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ============ Courses ============

/** Migrate old flat teachingContent to structured curriculum tree */
function migrateToCurriculum(course: Course): Course {
  if (course.curriculum && course.curriculum.length > 0) return course;
  // If has legacy teachingContent, convert to single chapter node
  if (course.teachingContent && course.teachingContent.trim()) {
    const rootNode: CurriculumNode = {
      id: `migrated_${course.id}_${Date.now()}`,
      title: '备课内容（已迁移）',
      type: 'chapter',
      content: course.teachingContent,
      order: 0,
    };
    return { ...course, curriculum: [rootNode] };
  }
  return { ...course, curriculum: course.curriculum || [] };
}

export function getCourses(): Course[] {
  const courses = getItem<Course[]>(COURSES_KEY, []);
  if (courses.length === 0) {
    // Initialize default courses
    const defaults: Course[] = COURSE_PRESETS.map((preset) => {
      const kpMap: Record<string, readonly string[]> = {
        course_cpp: DEFAULT_CPP_KNOWLEDGE,
        course_python: DEFAULT_PYTHON_KNOWLEDGE,
        course_visual: DEFAULT_VISUAL_KNOWLEDGE,
      };
      const kpNames = kpMap[preset.id] || [];
      return {
        id: preset.id,
        name: preset.name,
        curriculum: [],
        knowledgePoints: kpNames.map((name, idx) => ({
          id: `${preset.id}_kp_${idx}`,
          name,
        })),
        problems: [],
        classes: [],
      };
    });
    setItem(COURSES_KEY, defaults);
    return defaults;
  }
  // Migrate old courses: ensure curriculum field exists and classes array
  let needsSave = false;
  const migrated = courses.map((c) => {
    const withContent = { ...c, teachingContent: c.teachingContent ?? '' };
    const withCurriculum = migrateToCurriculum(withContent);
    if (withCurriculum.curriculum !== c.curriculum) needsSave = true;
    // Migrate: add classes array if missing
    if (!withCurriculum.classes) {
      withCurriculum.classes = [];
      needsSave = true;
    }
    return withCurriculum;
  });
  if (needsSave) setItem(COURSES_KEY, migrated);
  return migrated;
}

export function getCourse(id: string): Course | undefined {
  return getCourses().find((c) => c.id === id);
}

export function saveCourses(courses: Course[]): void {
  setItem(COURSES_KEY, courses);
}

export function updateCourse(updated: Course): void {
  const list = getCourses().map((c) => (c.id === updated.id ? updated : c));
  saveCourses(list);
}

// ============ Course Classes ============
export function getCourseClasses(courseId: string): string[] {
  const course = getCourses().find((c) => c.id === courseId);
  return course?.classes ?? [];
}

export function addClassToCourse(courseId: string, className: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;
  if (!course.classes) course.classes = [];
  if (!course.classes.includes(className)) {
    course.classes.push(className);
    saveCourses(courses);
  }
}

export function removeClassFromCourse(courseId: string, className: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course || !course.classes) return;
  course.classes = course.classes.filter((c) => c !== className);
  saveCourses(courses);
  // Also remove students from this class
  const students = getStudents().filter(
    (s) => !(s.courseId === courseId && s.className === className)
  );
  saveStudents(students);
}

export function renameClassInCourse(courseId: string, oldName: string, newName: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course || !course.classes) return;
  course.classes = course.classes.map((c) => (c === oldName ? newName : c));
  saveCourses(courses);
  // Also update students' className
  const students = getStudents().map((s) =>
    s.courseId === courseId && s.className === oldName
      ? { ...s, className: newName }
      : s
  );
  saveStudents(students);
}

// ============ Students ============
export function getStudents(): Student[] {
  return getItem<Student[]>(STUDENTS_KEY, []);
}

export function getStudentsByCourse(courseId: string): Student[] {
  return getStudents().filter((s) => s.courseId === courseId);
}

export function saveStudents(students: Student[]): void {
  setItem(STUDENTS_KEY, students);
}

export function addStudent(student: Student): void {
  const list = getStudents();
  list.push(student);
  saveStudents(list);
  // Init knowledge progress
  const course = getCourse(student.courseId);
  if (course) {
    const existing = getKnowledgeByStudent(student.id);
    const existingKpIds = new Set(existing.map((k) => k.knowledgePointId));
    const newProgress: KnowledgeProgress[] = [];
    for (const kp of course.knowledgePoints) {
      if (!existingKpIds.has(kp.id)) {
        newProgress.push({
          id: `${student.id}_${kp.id}`,
          studentId: student.id,
          knowledgePointId: kp.id,
          knowledgePointName: kp.name,
          courseId: student.courseId,
          status: 'not_started',
          updatedAt: new Date().toISOString(),
        });
      }
    }
    if (newProgress.length > 0) {
      saveKnowledge([...getKnowledge(), ...newProgress]);
    }
  }
}

export function updateStudent(updated: Student): void {
  const list = getStudents().map((s) => (s.id === updated.id ? updated : s));
  saveStudents(list);
}

export function deleteStudent(id: string): void {
  saveStudents(getStudents().filter((s) => s.id !== id));
  saveTypingRecords(getTypingRecords().filter((r) => r.studentId !== id));
  saveRetryRecords(getRetryRecords().filter((r) => r.studentId !== id));
  saveHomeworkRecords(getHomeworkRecords().filter((r) => r.studentId !== id));
  saveKnowledge(getKnowledge().filter((k) => k.studentId !== id));
}

// ============ Typing Records ============
export function getTypingRecords(): TypingRecord[] {
  return getItem<TypingRecord[]>(TYPING_KEY, []);
}

export function getTypingByStudent(studentId: string): TypingRecord[] {
  return getTypingRecords().filter((r) => r.studentId === studentId);
}

export function getTypingByCourse(courseId: string): TypingRecord[] {
  return getTypingRecords().filter((r) => r.courseId === courseId);
}

export function saveTypingRecords(records: TypingRecord[]): void {
  setItem(TYPING_KEY, records);
}

export function addTypingRecord(record: TypingRecord): void {
  const list = getTypingRecords();
  list.push(record);
  saveTypingRecords(list);
}

export function deleteTypingRecord(id: string): void {
  saveTypingRecords(getTypingRecords().filter((r) => r.id !== id));
}

// ============ Problem Retry Records ============
export function getRetryRecords(): ProblemRetryRecord[] {
  return getItem<ProblemRetryRecord[]>(RETRY_KEY, []);
}

export function getRetryByStudent(studentId: string): ProblemRetryRecord[] {
  return getRetryRecords().filter((r) => r.studentId === studentId);
}

export function getRetryByProblem(problemId: string): ProblemRetryRecord[] {
  return getRetryRecords().filter((r) => r.problemId === problemId);
}

export function saveRetryRecords(records: ProblemRetryRecord[]): void {
  setItem(RETRY_KEY, records);
}

export function addRetryRecord(record: ProblemRetryRecord): void {
  const list = getRetryRecords();
  list.push(record);
  saveRetryRecords(list);
}

export function deleteRetryRecord(id: string): void {
  saveRetryRecords(getRetryRecords().filter((r) => r.id !== id));
}

// ============ Homework Records ============
export function getHomeworkRecords(): HomeworkRecord[] {
  return getItem<HomeworkRecord[]>(HOMEWORK_KEY, []);
}

export function getHomeworkByStudent(studentId: string): HomeworkRecord[] {
  return getHomeworkRecords().filter((r) => r.studentId === studentId);
}

export function saveHomeworkRecords(records: HomeworkRecord[]): void {
  setItem(HOMEWORK_KEY, records);
}

export function addHomeworkRecord(record: HomeworkRecord): void {
  const list = getHomeworkRecords();
  list.push(record);
  saveHomeworkRecords(list);
}

export function deleteHomeworkRecord(id: string): void {
  saveHomeworkRecords(getHomeworkRecords().filter((r) => r.id !== id));
}

// ============ Knowledge Progress ============
export function getKnowledge(): KnowledgeProgress[] {
  return getItem<KnowledgeProgress[]>(KNOWLEDGE_KEY, []);
}

export function getKnowledgeByStudent(studentId: string): KnowledgeProgress[] {
  return getKnowledge().filter((k) => k.studentId === studentId);
}

export function getKnowledgeByCourse(courseId: string): KnowledgeProgress[] {
  return getKnowledge().filter((k) => k.courseId === courseId);
}

export function saveKnowledge(points: KnowledgeProgress[]): void {
  setItem(KNOWLEDGE_KEY, points);
}

export function upsertKnowledge(point: KnowledgeProgress): void {
  const list = getKnowledge();
  const idx = list.findIndex((k) => k.id === point.id);
  if (idx >= 0) {
    list[idx] = point;
  } else {
    list.push(point);
  }
  saveKnowledge(list);
}

export function updateKnowledgeStatus(
  studentId: string,
  knowledgePointId: string,
  status: KnowledgeStatus
): void {
  const list = getKnowledge();
  const existing = list.find(
    (k) => k.studentId === studentId && k.knowledgePointId === knowledgePointId
  );
  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    saveKnowledge(list);
  }
}

export function updateKnowledgeScore(
  studentId: string,
  knowledgePointId: string,
  score: number,
  description?: string
): void {
  const list = getKnowledge();
  const existing = list.find(
    (k) => k.studentId === studentId && k.knowledgePointId === knowledgePointId
  );
  if (existing) {
    existing.score = score;
    if (description !== undefined) existing.description = description;
    existing.updatedAt = new Date().toISOString();
    saveKnowledge(list);
  }
}

// ============ Competitions (自定义赛事) ============

function getCompetitions(): CompetitionEvent[] {
  return getItem<CompetitionEvent[]>(COMPETITIONS_KEY, []);
}

function saveCompetitions(data: CompetitionEvent[]): void {
  setItem(COMPETITIONS_KEY, data);
}

/** 获取所有赛事（默认 + 自定义） */
export function getAllCompetitions(): CompetitionEvent[] {
  const custom = getCompetitions();
  const defaults: CompetitionEvent[] = DEFAULT_COMPETITIONS.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    createdAt: new Date().toISOString(),
  }));
  // Merge: defaults first, then custom (avoid duplicates by id)
  const customIds = new Set(custom.map((c) => c.id));
  const merged = [...defaults.filter((d) => !customIds.has(d.id)), ...custom];
  return merged;
}

/** 添加自定义赛事 */
export function addCompetition(event: Omit<CompetitionEvent, 'id' | 'createdAt'>): CompetitionEvent {
  const list = getCompetitions();
  const newEvent: CompetitionEvent = {
    ...event,
    id: `comp_custom_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  list.push(newEvent);
  saveCompetitions(list);
  return newEvent;
}

/** 删除自定义赛事（只能删自定义的，不能删默认的） */
export function removeCompetition(id: string): void {
  const list = getCompetitions();
  const filtered = list.filter((c) => c.id !== id);
  saveCompetitions(filtered);
}

// ============ Sprint Goals (冲刺目标) ============

function getSprintGoals(): SprintGoalData[] {
  return getItem<SprintGoalData[]>(SPRINT_GOALS_KEY, []);
}

function saveSprintGoals(data: SprintGoalData[]): void {
  setItem(SPRINT_GOALS_KEY, data);
}

/** 获取某月某学生的冲刺目标 */
export function getSprintGoal(studentId: string, month: string): SprintGoalData | null {
  const list = getSprintGoals();
  return list.find((g) => g.studentId === studentId && g.month === month) || null;
}

/** 保存/更新冲刺目标 */
export function saveSprintGoal(data: SprintGoalData): void {
  const list = getSprintGoals();
  const idx = list.findIndex((g) => g.studentId === data.studentId && g.month === data.month);
  if (idx >= 0) {
    list[idx] = data;
  } else {
    list.push(data);
  }
  saveSprintGoals(list);
}

// ==================== 报告数据清理 ====================

/** 清理最旧的报告数据以释放存储空间 */
export function cleanupOldReports(keepCount = 3): void {
  const all = getReports();
  if (all.length <= keepCount) return;
  // 按更新时间排序，保留最新的 keepCount 条
  const sorted = [...all].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const toKeep = sorted.slice(0, keepCount);
  saveReports(toKeep);
}

/** 检查 localStorage 剩余空间（返回大致可用字节数） */
export function getLocalStorageUsage(): { used: number; total: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += (localStorage.getItem(key) || '').length * 2; // UTF-16
    }
  }
  return { used, total: 5 * 1024 * 1024 }; // 假设 5MB 限制
}

// ============ Reports ============

function getReports(): ReportData[] {
  return getItem<ReportData[]>(REPORTS_KEY, []);
}

function saveReports(reports: ReportData[]): void {
  setItem(REPORTS_KEY, reports);
}

export function getReportData(studentId: string, month: string): ReportData | null {
  const list = getReports();
  return list.find(r => r.studentId === studentId && r.month === month) || null;
}

export function saveReportData(data: ReportData): void {
  const list = getReports();
  const idx = list.findIndex(r => r.studentId === data.studentId && r.month === data.month);
  if (idx >= 0) {
    list[idx] = data;
  } else {
    list.push(data);
  }
  saveReports(list);
}

// ==================== 考级记录 ====================
const EXAM_KEY = 'coding_exam_records';
export function getExamRecords(): ExamRecord[] {
  return getItem<ExamRecord[]>(EXAM_KEY, []);
}
export function saveExamRecords(records: ExamRecord[]): void {
  localStorage.setItem(EXAM_KEY, JSON.stringify(records));
}
export function getExamRecordsByStudent(studentId: string): ExamRecord[] {
  return getExamRecords().filter((r) => r.studentId === studentId);
}
export function saveExamRecord(record: ExamRecord): void {
  const records = getExamRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  saveExamRecords(records);
}
export function deleteExamRecord(id: string): void {
  saveExamRecords(getExamRecords().filter((r) => r.id !== id));
}

// ==================== 赛事记录 ====================
const COMPETITION_KEY = 'coding_competition_records';
export function getCompetitionRecords(): CompetitionRecord[] {
  return getItem<CompetitionRecord[]>(COMPETITION_KEY, []);
}
export function saveCompetitionRecords(records: CompetitionRecord[]): void {
  localStorage.setItem(COMPETITION_KEY, JSON.stringify(records));
}
export function getCompetitionRecordsByStudent(studentId: string): CompetitionRecord[] {
  return getCompetitionRecords().filter((r) => r.studentId === studentId);
}
export function saveCompetitionRecord(record: CompetitionRecord): void {
  const records = getCompetitionRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  saveCompetitionRecords(records);
}
export function deleteCompetitionRecord(id: string): void {
  saveCompetitionRecords(getCompetitionRecords().filter((r) => r.id !== id));
}

// ==================== 荣誉记录 ====================
const HONOR_KEY = 'coding_honor_records';
export function getHonorRecords(): HonorRecord[] {
  return getItem<HonorRecord[]>(HONOR_KEY, []);
}
export function saveHonorRecords(records: HonorRecord[]): void {
  localStorage.setItem(HONOR_KEY, JSON.stringify(records));
}
export function getHonorRecordsByStudent(studentId: string): HonorRecord[] {
  return getHonorRecords().filter((r) => r.studentId === studentId);
}
export function saveHonorRecord(record: HonorRecord): void {
  const records = getHonorRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  saveHonorRecords(records);
}
export function deleteHonorRecord(id: string): void {
  saveHonorRecords(getHonorRecords().filter((r) => r.id !== id));
}

/** 更新冲刺目标的课程目标 */
export function updateSprintGoalCourse(studentId: string, month: string, courseGoal: string): void {
  const list = getSprintGoals();
  const existing = list.find((g) => g.studentId === studentId && g.month === month);
  if (existing) {
    existing.courseGoal = courseGoal;
    existing.updatedAt = new Date().toISOString();
  } else {
    list.push({
      month,
      studentId,
      courseGoal,
      gespLevels: [],
      competitionIds: [],
      updatedAt: new Date().toISOString(),
    });
  }
  saveSprintGoals(list);
}

/** 更新冲刺目标的 GESP 考级 */
export function updateSprintGoalGesp(studentId: string, month: string, levels: GESPLlevel[]): void {
  const list = getSprintGoals();
  const existing = list.find((g) => g.studentId === studentId && g.month === month);
  if (existing) {
    existing.gespLevels = levels;
    existing.updatedAt = new Date().toISOString();
  } else {
    list.push({
      month,
      studentId,
      courseGoal: '',
      gespLevels: levels,
      competitionIds: [],
      updatedAt: new Date().toISOString(),
    });
  }
  saveSprintGoals(list);
}

/** 更新冲刺目标的赛事选择 */
export function updateSprintGoalCompetitions(studentId: string, month: string, competitionIds: string[]): void {
  const list = getSprintGoals();
  const existing = list.find((g) => g.studentId === studentId && g.month === month);
  if (existing) {
    existing.competitionIds = competitionIds;
    existing.updatedAt = new Date().toISOString();
  } else {
    list.push({
      month,
      studentId,
      courseGoal: '',
      gespLevels: [],
      competitionIds,
      updatedAt: new Date().toISOString(),
    });
  }
  saveSprintGoals(list);
}

// ============ IndexedDB 图片存储 ============
// 用于存储报告中的大体积图片数据，避免 localStorage 5MB 配额溢出

const IDB_NAME = 'coding_tracker_db';
const IDB_VERSION = 1;
const IDB_STORE = 'images';

/** 打开 IndexedDB 数据库 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 保存图片数据到 IndexedDB */
export async function saveImageToIDB(key: string, data: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 从 IndexedDB 加载图片数据 */
export async function loadImageFromIDB(key: string): Promise<string | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** 从 IndexedDB 删除图片数据 */
export async function deleteImageFromIDB(key: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 报告图片字段的 key 生成 */
function reportImageKeys(studentId: string, month: string) {
  const prefix = `report_${studentId}_${month}`;
  return {
    studentPhoto: `${prefix}_studentPhoto`,
    studentAvatarPhoto: `${prefix}_studentAvatarPhoto`,
    coverPhoto: `${prefix}_coverPhoto`,
    classroomPhotos: `${prefix}_classroomPhotos`,
  };
}

/** 保存报告数据（文本→localStorage，图片→IndexedDB） */
export async function saveReportDataAsync(data: ReportData): Promise<void> {
  const { studentId, month } = data;
  const keys = reportImageKeys(studentId, month);

  // 提取图片数据，保存到 IndexedDB
  const imageEntries: [string, string][] = [];
  if (data.studentPhoto) imageEntries.push([keys.studentPhoto, data.studentPhoto]);
  if (data.studentAvatarPhoto) imageEntries.push([keys.studentAvatarPhoto, data.studentAvatarPhoto]);
  if (data.coverPhoto) imageEntries.push([keys.coverPhoto, data.coverPhoto]);
  if (data.classroomPhotos?.length) imageEntries.push([keys.classroomPhotos, JSON.stringify(data.classroomPhotos)]);

  await Promise.all(imageEntries.map(([k, v]) => saveImageToIDB(k, v)));

  // 文本数据（不含图片）保存到 localStorage
  const textData = {
    ...data,
    studentPhoto: '',
    studentAvatarPhoto: '',
    coverPhoto: '',
    classroomPhotos: [],
  };
  const list = getReports();
  const idx = list.findIndex(r => r.studentId === data.studentId && r.month === data.month);
  if (idx >= 0) {
    list[idx] = textData;
  } else {
    list.push(textData);
  }
  saveReports(list);
}

/** 加载报告数据（文本←localStorage，图片←IndexedDB） */
export async function getReportDataAsync(studentId: string, month: string): Promise<ReportData | null> {
  const list = getReports();
  const textData = list.find(r => r.studentId === studentId && r.month === month);
  if (!textData) return null;

  const keys = reportImageKeys(studentId, month);

  // 从 IndexedDB 加载图片
  const [studentPhoto, studentAvatarPhoto, coverPhoto, classroomPhotosStr] = await Promise.all([
    loadImageFromIDB(keys.studentPhoto),
    loadImageFromIDB(keys.studentAvatarPhoto),
    loadImageFromIDB(keys.coverPhoto),
    loadImageFromIDB(keys.classroomPhotos),
  ]);

  return {
    ...textData,
    studentPhoto: studentPhoto || '',
    studentAvatarPhoto: studentAvatarPhoto || '',
    coverPhoto: coverPhoto || '',
    classroomPhotos: classroomPhotosStr ? JSON.parse(classroomPhotosStr) : [],
  };
}
