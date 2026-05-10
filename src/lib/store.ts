import type {
  Course,
  Student,
  TypingRecord,
  ProblemRetryRecord,
  HomeworkRecord,
  KnowledgeProgress,
  KnowledgeStatus,
} from './types';
import {
  COURSE_PRESETS,
  DEFAULT_CPP_KNOWLEDGE,
  DEFAULT_PYTHON_KNOWLEDGE,
  DEFAULT_VISUAL_KNOWLEDGE,
} from './constants';

const COURSES_KEY = 'coding_courses';
const STUDENTS_KEY = 'coding_students';
const TYPING_KEY = 'coding_typing_records';
const RETRY_KEY = 'coding_retry_records';
const HOMEWORK_KEY = 'coding_homework_records';
const KNOWLEDGE_KEY = 'coding_knowledge_progress';

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
        teachingContent: '',
        knowledgePoints: kpNames.map((name, idx) => ({
          id: `${preset.id}_kp_${idx}`,
          name,
        })),
        problems: [],
      };
    });
    setItem(COURSES_KEY, defaults);
    return defaults;
  }
  // Migrate old courses missing teachingContent
  const migrated = courses.map((c) => ({
    ...c,
    teachingContent: c.teachingContent ?? '',
  }));
  if (migrated.some((c, i) => c.teachingContent !== courses[i].teachingContent)) {
    setItem(COURSES_KEY, migrated);
  }
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
