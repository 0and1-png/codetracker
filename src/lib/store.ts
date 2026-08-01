/**
 * 数据存储层 - 混合方案（localStorage 缓存 + Supabase 云同步）
 * - 读取：优先 localStorage（快速）
 * - 写入：同时写入 localStorage 和 Supabase
 * - 启动时：从 Supabase 同步最新数据到 localStorage
 */
import { supabase } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';
import type {
  Course, Student, TypingRecord, ProblemRetryRecord,
  HomeworkRecord, KnowledgeProgress, ExamRecord,
  CompetitionRecord, HonorRecord, CompetitionEvent,
  SprintGoalData, ReportData, KnowledgeStatus,
} from './types';
import { COURSE_PRESETS, DEFAULT_COMPETITIONS } from './constants';

// ============ LocalStorage Keys ============
const KEYS = {
  courses: 'coding_courses',
  students: 'coding_students',
  typingRecords: 'coding_typing_records',
  retryRecords: 'coding_retry_records',
  homeworkRecords: 'coding_homework_records',
  knowledgeProgress: 'coding_knowledge_progress',
  examRecords: 'coding_exam_records',
  competitionRecords: 'coding_competition_records',
  honorRecords: 'coding_honor_records',
  competitionEvents: 'coding_competition_events',
  sprintGoals: 'coding_sprint_goals',
  reportData: 'coding_report_data',
  studentPhotos: 'coding_student_photos',
};

// ============ LocalStorage Helpers ============
function lsGet<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function lsSet<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function lsGetOne<T>(key: string, id: string): T | undefined {
  const items = lsGet<T & { id: string }>(key);
  return items.find((item) => item.id === id);
}

// ============ Courses ============

const DEFAULT_COURSES: Course[] = COURSE_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  curriculum: [],
  knowledgePoints: [],
  problems: [],
  classes: [],
}));

export function getCourses(): Course[] {
  const courses = lsGet<Course>(KEYS.courses);
  if (courses.length === 0) {
    lsSet(KEYS.courses, DEFAULT_COURSES);
    return DEFAULT_COURSES;
  }
  return courses;
}

export function getCourse(id: string): Course | undefined {
  return lsGetOne<Course>(KEYS.courses, id);
}

export function saveCourse(course: Course): void {
  const courses = getCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) courses[idx] = course;
  else courses.push(course);
  lsSet(KEYS.courses, courses);
  // Sync to Supabase
  syncCourseToSupabase(course);
}

export function saveCourses(courses: Course[]): void {
  lsSet(KEYS.courses, courses);
}

export function deleteCourse(id: string): void {
  lsSet(KEYS.courses, getCourses().filter((c) => c.id !== id));
}

// ============ Students ============

export function getStudents(): Student[] {
  return lsGet<Student>(KEYS.students);
}

export function getStudent(id: string): Student | undefined {
  return lsGetOne<Student>(KEYS.students, id);
}

export function getStudentsByCourse(courseId: string): Student[] {
  return getStudents().filter((s) => s.courseId === courseId);
}

export function saveStudent(student: Student): void {
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === student.id);
  if (idx >= 0) students[idx] = student;
  else students.push(student);
  lsSet(KEYS.students, students);
  // Sync to Supabase
  syncStudentToSupabase(student);
}

export function saveStudents(students: Student[]): void {
  lsSet(KEYS.students, students);
}

export function deleteStudent(id: string): void {
  lsSet(KEYS.students, getStudents().filter((s) => s.id !== id));
}

// ============ Typing Records ============

export function getTypingRecords(): TypingRecord[] {
  return lsGet<TypingRecord>(KEYS.typingRecords);
}

export function getTypingByStudent(studentId: string): TypingRecord[] {
  return getTypingRecords().filter((r) => r.studentId === studentId);
}

export function saveTypingRecord(record: TypingRecord): void {
  const records = getTypingRecords();
  records.push(record);
  lsSet(KEYS.typingRecords, records);
  // Sync to Supabase
  syncTypingToSupabase(record);
}

export function saveTypingRecords(records: TypingRecord[]): void {
  lsSet(KEYS.typingRecords, records);
}

// ============ Retry Records ============

export function getRetryRecords(): ProblemRetryRecord[] {
  return lsGet<ProblemRetryRecord>(KEYS.retryRecords);
}

export function getRetryByStudent(studentId: string): ProblemRetryRecord[] {
  return getRetryRecords().filter((r) => r.studentId === studentId);
}

export function saveRetryRecord(record: ProblemRetryRecord): void {
  const records = getRetryRecords();
  records.push(record);
  lsSet(KEYS.retryRecords, records);
  // Sync to Supabase
  syncRetryToSupabase(record);
}

export function saveRetryRecords(records: ProblemRetryRecord[]): void {
  lsSet(KEYS.retryRecords, records);
}

// ============ Homework Records ============

export function getHomeworkRecords(): HomeworkRecord[] {
  return lsGet<HomeworkRecord>(KEYS.homeworkRecords);
}

export function getHomeworkByStudent(studentId: string): HomeworkRecord[] {
  return getHomeworkRecords().filter((r) => r.studentId === studentId);
}

export function saveHomeworkRecord(record: HomeworkRecord): void {
  const records = getHomeworkRecords();
  records.push(record);
  lsSet(KEYS.homeworkRecords, records);
  // Sync to Supabase
  syncHomeworkToSupabase(record);
}

export function saveHomeworkRecords(records: HomeworkRecord[]): void {
  lsSet(KEYS.homeworkRecords, records);
}

// ============ Knowledge Progress ============

export function getKnowledgeProgress(): KnowledgeProgress[] {
  return lsGet<KnowledgeProgress>(KEYS.knowledgeProgress);
}

export function getKnowledgeByStudent(studentId: string): KnowledgeProgress[] {
  return getKnowledgeProgress().filter((k) => k.studentId === studentId);
}

export function saveKnowledgeProgress(kp: KnowledgeProgress): void {
  const items = getKnowledgeProgress();
  const idx = items.findIndex((k) => k.studentId === kp.studentId && k.knowledgePointId === kp.knowledgePointId);
  if (idx >= 0) items[idx] = kp;
  else items.push(kp);
  lsSet(KEYS.knowledgeProgress, items);
  // Sync to Supabase
  syncKnowledgeToSupabase(kp);
}

export function saveKnowledgeProgressList(items: KnowledgeProgress[]): void {
  lsSet(KEYS.knowledgeProgress, items);
}

export function updateKnowledgeStatus(
  studentId: string,
  knowledgePointId: string,
  status: KnowledgeStatus,
  courseId?: string
): void {
  const items = lsGet<KnowledgeProgress>(KEYS.knowledgeProgress);
  const idx = items.findIndex(
    (k) => k.studentId === studentId && k.knowledgePointId === knowledgePointId
  );
  if (idx >= 0) {
    items[idx].status = status;
    items[idx].updatedAt = new Date().toISOString();
    lsSet(KEYS.knowledgeProgress, items);
  }
}

export function deleteTypingRecord(id: string): void {
  const items = lsGet<TypingRecord>(KEYS.typingRecords);
  lsSet(KEYS.typingRecords, items.filter((r) => r.id !== id));
}

export function deleteRetryRecord(id: string): void {
  const items = lsGet<ProblemRetryRecord>(KEYS.retryRecords);
  lsSet(KEYS.retryRecords, items.filter((r) => r.id !== id));
}

export function deleteHomeworkRecord(id: string): void {
  const items = lsGet<HomeworkRecord>(KEYS.homeworkRecords);
  lsSet(KEYS.homeworkRecords, items.filter((r) => r.id !== id));
}

export function getExamRecordsByStudent(studentId: string): ExamRecord[] {
  return getExamByStudent(studentId);
}

export function getStudentPhotos(studentId: string): string[] {
  try {
    const data = localStorage.getItem(KEYS.studentPhotos);
    const all: { [key: string]: string[] } = data ? JSON.parse(data) : {};
    return all[studentId] || [];
  } catch { return []; }
}

export function saveStudentPhotos(studentId: string, photos: string[]): void {
  try {
    const data = localStorage.getItem(KEYS.studentPhotos);
    const all: { [key: string]: string[] } = data ? JSON.parse(data) : {};
    all[studentId] = photos;
    localStorage.setItem(KEYS.studentPhotos, JSON.stringify(all));
  } catch {}
}

export function addStudentPhoto(studentId: string, photo: string): void {
  const photos = getStudentPhotos(studentId);
  photos.unshift(photo);
  saveStudentPhotos(studentId, photos);
}

export function deleteStudentPhoto(studentId: string, index: number): void {
  const photos = getStudentPhotos(studentId);
  photos.splice(index, 1);
  saveStudentPhotos(studentId, photos);
}

export function cleanupOldReports(): void {
  // Reports are kept indefinitely
}

export function getLocalStorageUsage(): { used: number; total: number; percent: number } {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  const limit = 5 * 1024 * 1024; // 5MB
  return { used: total, total: limit, percent: (total / limit) * 100 };
}

// Async wrappers for Supabase compatibility
export async function saveReportDataAsync(data: ReportData): Promise<void> {
  saveReportData(data);
}

export async function getReportDataAsync(studentId: string, month: string): Promise<ReportData | null> {
  const list = getReports();
  return list.find(r => r.studentId === studentId && r.month === month) || null;
}

// ============ Exam Records ============

export function getExamRecords(): ExamRecord[] {
  return lsGet<ExamRecord>(KEYS.examRecords);
}

export function getExamByStudent(studentId: string): ExamRecord[] {
  return getExamRecords().filter((r) => r.studentId === studentId);
}

export function saveExamRecord(record: ExamRecord): void {
  const records = getExamRecords();
  records.push(record);
  lsSet(KEYS.examRecords, records);
}

export function saveExamRecords(records: ExamRecord[]): void {
  lsSet(KEYS.examRecords, records);
}

// ============ Competition Records ============

export function getCompetitionRecords(): CompetitionRecord[] {
  return lsGet<CompetitionRecord>(KEYS.competitionRecords);
}

export function getCompetitionByStudent(studentId: string): CompetitionRecord[] {
  return getCompetitionRecords().filter((r) => r.studentId === studentId);
}

export function saveCompetitionRecord(record: CompetitionRecord): void {
  const records = getCompetitionRecords();
  records.push(record);
  lsSet(KEYS.competitionRecords, records);
}

export function saveCompetitionRecords(records: CompetitionRecord[]): void {
  lsSet(KEYS.competitionRecords, records);
}

// ============ Honor Records ============

export function getHonorRecords(): HonorRecord[] {
  return lsGet<HonorRecord>(KEYS.honorRecords);
}

export function getHonorByStudent(studentId: string): HonorRecord[] {
  return getHonorRecords().filter((r) => r.studentId === studentId);
}

export function saveHonorRecord(record: HonorRecord): void {
  const records = getHonorRecords();
  records.push(record);
  lsSet(KEYS.honorRecords, records);
}

export function saveHonorRecords(records: HonorRecord[]): void {
  lsSet(KEYS.honorRecords, records);
}

// ============ Competition Events ============

export function getCompetitionEvents(): CompetitionEvent[] {
  return lsGet<CompetitionEvent>(KEYS.competitionEvents);
}

export function saveCompetitionEvent(event: CompetitionEvent): void {
  const events = getCompetitionEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  lsSet(KEYS.competitionEvents, events);
}

export function saveCompetitionEvents(events: CompetitionEvent[]): void {
  lsSet(KEYS.competitionEvents, events);
}

// ============ Sprint Goals ============

export function getSprintGoals(): SprintGoalData[] {
  return lsGet<SprintGoalData>(KEYS.sprintGoals);
}

export function getSprintGoalsByStudent(studentId: string): SprintGoalData[] {
  return getSprintGoals().filter((s) => s.studentId === studentId);
}

export function saveSprintGoal(goal: SprintGoalData): void {
  const goals = getSprintGoals();
  const idx = goals.findIndex((g) => g.studentId === goal.studentId && g.month === goal.month);
  if (idx >= 0) goals[idx] = goal;
  else goals.push(goal);
  lsSet(KEYS.sprintGoals, goals);
}

export function saveSprintGoals(goals: SprintGoalData[]): void {
  lsSet(KEYS.sprintGoals, goals);
}

// ============ Report Data ============

export function getReportData(): ReportData[] {
  return lsGet<ReportData>(KEYS.reportData);
}

export function getReportByStudent(studentId: string): ReportData | undefined {
  return lsGetOne<ReportData>(KEYS.reportData, studentId);
}

export function saveReportData(data: ReportData): void {
  const items = getReportData();
  const idx = items.findIndex((r) => r.studentId === data.studentId);
  if (idx >= 0) items[idx] = data;
  else items.push(data);
  lsSet(KEYS.reportData, items);
}

export function saveReportDataList(items: ReportData[]): void {
  lsSet(KEYS.reportData, items);
}

export function getReports(): ReportData[] {
  return lsGet<ReportData>(KEYS.reportData);
}

export function updateKnowledgeScore(
  studentId: string,
  knowledgePointId: string,
  score: number,
  description?: string,
  courseId?: string,
  status?: KnowledgeStatus
): void {
  const items = lsGet<KnowledgeProgress>(KEYS.knowledgeProgress);
  const idx = items.findIndex(
    (k) => k.studentId === studentId && k.knowledgePointId === knowledgePointId
  );
  const progress: KnowledgeProgress = {
    id: idx >= 0 ? items[idx].id : crypto.randomUUID(),
    studentId,
    courseId: courseId || (idx >= 0 ? items[idx].courseId : ''),
    knowledgePointId,
    knowledgePointName: idx >= 0 ? items[idx].knowledgePointName : '',
    status: status || (idx >= 0 ? items[idx].status : 'not_started'),
    score,
    description: description || '',
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) items[idx] = progress;
  else items.push(progress);
  lsSet(KEYS.knowledgeProgress, items);
}

// ============ Course Classes ============

export function getCourseClasses(courseId: string): string[] {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  return course?.classes || [];
}

export function addClassToCourse(courseId: string, className: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (course) {
    if (!course.classes) course.classes = [];
    if (!course.classes.includes(className)) {
      course.classes.push(className);
      saveCourses(courses);
    }
  }
}

export function removeClassFromCourse(courseId: string, className: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (course?.classes) {
    course.classes = course.classes.filter((c) => c !== className);
    saveCourses(courses);
  }
}

export function renameClassInCourse(courseId: string, oldName: string, newName: string): void {
  const courses = getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (course?.classes) {
    const idx = course.classes.indexOf(oldName);
    if (idx >= 0) {
      course.classes[idx] = newName;
      saveCourses(courses);
    }
  }
}

// ============ Students ============

export function addStudent(student: Student): void {
  const students = getStudents();
  students.push(student);
  saveStudents(students);
}

export function updateStudent(student: Student): void {
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === student.id);
  if (idx >= 0) {
    students[idx] = student;
    saveStudents(students);
  }
}

// ============ Typing Records ============

export function addTypingRecord(record: TypingRecord): void {
  const records = getTypingRecords();
  records.push(record);
  saveTypingRecords(records);
}

// ============ Retry Records ============

export function addRetryRecord(record: ProblemRetryRecord): void {
  const records = getRetryRecords();
  records.push(record);
  saveRetryRecords(records);
}

// ============ Homework Records ============

export function addHomeworkRecord(record: HomeworkRecord): void {
  const records = getHomeworkRecords();
  records.push(record);
  saveHomeworkRecords(records);
}

// ============ Courses ============

export function updateCourse(course: Course): void {
  const courses = getCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    courses[idx] = course;
    saveCourses(courses);
  }
}

// ============ Supabase Sync ============

async function syncCourseToSupabase(course: Course) {
  try {
    await supabase.from('courses').upsert({
      id: course.id,
      name: course.name,
      curriculum: course.curriculum,
    });
  } catch (e) { console.error('Sync course failed:', e); }
}

async function syncStudentToSupabase(student: Student) {
  try {
    await supabase.from('students').upsert({
      id: student.id,
      name: student.name,
      course_id: student.courseId,
      class_name: student.className,
      notes: student.notes,
    });
  } catch (e) { console.error('Sync student failed:', e); }
}

async function syncTypingToSupabase(record: TypingRecord) {
  try {
    await supabase.from('typing_records').insert({
      id: record.id,
      student_id: record.studentId,
      speed: record.speed,
      accuracy: record.accuracy,
      record_date: record.date,
    });
  } catch (e) { console.error('Sync typing failed:', e); }
}

async function syncRetryToSupabase(record: ProblemRetryRecord) {
  try {
    await supabase.from('retry_records').insert({
      id: record.id,
      student_id: record.studentId,
      problem_id: record.problemId,
      problem_name: record.problemName,
      attempt_number: record.attempt,
      duration: record.timeSpent,
      record_date: record.date,
    });
  } catch (e) { console.error('Sync retry failed:', e); }
}

async function syncHomeworkToSupabase(record: HomeworkRecord) {
  try {
    await supabase.from('homework_records').insert({
      id: record.id,
      student_id: record.studentId,
      content: record.content,
      comment: record.comment,
      record_date: record.date,
    });
  } catch (e) { console.error('Sync homework failed:', e); }
}

async function syncKnowledgeToSupabase(kp: KnowledgeProgress) {
  try {
    await supabase.from('knowledge_progress').upsert({
      id: `${kp.studentId}_${kp.knowledgePointId}`,
      student_id: kp.studentId,
      knowledge_id: kp.knowledgePointId,
      knowledge_name: kp.knowledgePointName,
      course_id: kp.courseId,
      status: kp.status,
      score: kp.score,
      description: kp.description,
    });
  } catch (e) { console.error('Sync knowledge failed:', e); }
}

/**
 * 从 Supabase 同步所有数据到 localStorage（应用启动时调用）
 */
export async function syncFromSupabase(): Promise<void> {
  try {
    // 同步课程
    const { data: courses } = await supabase.from('courses').select('*');
    if (courses && courses.length > 0) {
      const mapped: Course[] = courses.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        icon: c.icon || 'code',
        color: c.color || '#6B8BA4',
        curriculum: c.curriculum || [],
        knowledgePoints: [],
        problems: [],
        classes: [],
        customKnowledgePoints: c.custom_knowledge_points || [],
        customProblems: c.custom_problems || [],
      }));
      lsSet(KEYS.courses, mapped);
    }

    // 同步学生
    const { data: students } = await supabase.from('students').select('*');
    if (students && students.length > 0) {
      const mapped: Student[] = students.map((s: any) => ({
        id: s.id,
        name: s.name,
        courseId: s.course_id,
        className: s.class_name || '',
        notes: s.notes || '',
        createdAt: s.created_at || new Date().toISOString(),
      }));
      lsSet(KEYS.students, mapped);
    }

    // 同步打字记录
    const { data: typing } = await supabase.from('typing_records').select('*');
    if (typing && typing.length > 0) {
      const mapped: TypingRecord[] = typing.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        courseId: r.course_id || '',
        speed: r.speed,
        accuracy: r.accuracy,
        duration: r.duration || 0,
        errors: r.errors || 0,
        date: r.record_date,
      }));
      lsSet(KEYS.typingRecords, mapped);
    }

    // 同步三刷记录
    const { data: retry } = await supabase.from('retry_records').select('*');
    if (retry && retry.length > 0) {
      const mapped: ProblemRetryRecord[] = retry.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        courseId: r.course_id || '',
        problemId: r.problem_id,
        problemName: r.problem_name,
        attempt: r.attempt_number || 1,
        attemptNumber: r.attempt_number || 1,
        timeSpent: r.duration || 0,
        duration: r.duration || 0,
        improvement: r.improvement || 0,
        isPassed: r.is_passed || false,
        date: r.record_date,
      }));
      lsSet(KEYS.retryRecords, mapped);
    }

    // 同步作业记录
    const { data: homework } = await supabase.from('homework_records').select('*');
    if (homework && homework.length > 0) {
      const mapped: HomeworkRecord[] = homework.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        courseId: r.course_id || '',
        title: r.title || '',
        content: r.content,
        feedback: r.feedback || '',
        date: r.record_date,
      }));
      lsSet(KEYS.homeworkRecords, mapped);
    }

    // 同步知识点进度
    const { data: knowledge } = await supabase.from('knowledge_progress').select('*');
    if (knowledge && knowledge.length > 0) {
      const mapped: KnowledgeProgress[] = knowledge.map((k: any) => ({
        id: k.id,
        studentId: k.student_id,
        knowledgePointId: k.knowledge_id,
        knowledgePointName: k.knowledge_name,
        knowledgeId: k.knowledge_id,
        knowledgeName: k.knowledge_name,
        courseId: k.course_id,
        status: k.status,
        score: k.score,
        description: k.description,
        updatedAt: k.updated_at || new Date().toISOString(),
      }));
      lsSet(KEYS.knowledgeProgress, mapped);
    }

    console.log('[Store] Synced from Supabase successfully');
  } catch (e) {
    console.error('[Store] Sync from Supabase failed:', e);
  }
}

// ============ Utility ============

export function generateId(): string {
  return uuidv4();
}

// 赛事模板（CompetitionEvent）
export function getAllCompetitions(): CompetitionEvent[] {
  const custom = lsGet<CompetitionEvent>(KEYS.competitionEvents);
  const defaults: CompetitionEvent[] = DEFAULT_COMPETITIONS.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    createdAt: new Date().toISOString(),
  }));
  const customIds = new Set(custom.map((c) => c.id));
  return [...defaults.filter((d) => !customIds.has(d.id)), ...custom];
}

export function addCompetition(event: Omit<CompetitionEvent, 'id' | 'createdAt'>): CompetitionEvent {
  const list = lsGet<CompetitionEvent>(KEYS.competitionEvents);
  const newEvent: CompetitionEvent = {
    ...event,
    id: `comp_custom_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  list.push(newEvent);
  lsSet(KEYS.competitionEvents, list);
  return newEvent;
}

export function removeCompetition(id: string): void {
  const list = lsGet<CompetitionEvent>(KEYS.competitionEvents);
  lsSet(KEYS.competitionEvents, list.filter((c) => c.id !== id));
}

// 冲刺目标
export function getSprintGoal(studentId: string, month?: string): SprintGoalData | undefined {
  return lsGet<SprintGoalData>(KEYS.sprintGoals).find(g => g.studentId === studentId && (!month || g.month === month));
}

// 荣誉记录
export function getHonorRecordsByStudent(studentId: string): HonorRecord[] {
  return lsGet<HonorRecord>(KEYS.honorRecords).filter(h => h.studentId === studentId);
}
