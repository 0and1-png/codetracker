import type { Student, LearningRecord, KnowledgePoint } from './types';

const STUDENTS_KEY = 'coding_students';
const RECORDS_KEY = 'coding_records';
const KNOWLEDGE_KEY = 'coding_knowledge';

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

// Students
export function getStudents(): Student[] {
  return getItem<Student[]>(STUDENTS_KEY, []);
}

export function saveStudents(students: Student[]): void {
  setItem(STUDENTS_KEY, students);
}

export function addStudent(student: Student): void {
  const list = getStudents();
  list.push(student);
  saveStudents(list);
}

export function updateStudent(updated: Student): void {
  const list = getStudents().map((s) => (s.id === updated.id ? updated : s));
  saveStudents(list);
}

export function deleteStudent(id: string): void {
  saveStudents(getStudents().filter((s) => s.id !== id));
  // Also clean up records and knowledge
  saveRecords(getRecords().filter((r) => r.studentId !== id));
  saveKnowledge(getKnowledge().filter((k) => k.studentId !== id));
}

// Learning Records
export function getRecords(): LearningRecord[] {
  return getItem<LearningRecord[]>(RECORDS_KEY, []);
}

export function getRecordsByStudent(studentId: string): LearningRecord[] {
  return getRecords().filter((r) => r.studentId === studentId);
}

export function saveRecords(records: LearningRecord[]): void {
  setItem(RECORDS_KEY, records);
}

export function addRecord(record: LearningRecord): void {
  const list = getRecords();
  list.push(record);
  saveRecords(list);
}

export function updateRecord(updated: LearningRecord): void {
  const list = getRecords().map((r) => (r.id === updated.id ? updated : r));
  saveRecords(list);
}

export function deleteRecord(id: string): void {
  saveRecords(getRecords().filter((r) => r.id !== id));
}

// Knowledge Points
export function getKnowledge(): KnowledgePoint[] {
  return getItem<KnowledgePoint[]>(KNOWLEDGE_KEY, []);
}

export function getKnowledgeByStudent(studentId: string): KnowledgePoint[] {
  return getKnowledge().filter((k) => k.studentId === studentId);
}

export function saveKnowledge(points: KnowledgePoint[]): void {
  setItem(KNOWLEDGE_KEY, points);
}

export function upsertKnowledge(point: KnowledgePoint): void {
  const list = getKnowledge();
  const idx = list.findIndex((k) => k.id === point.id);
  if (idx >= 0) {
    list[idx] = point;
  } else {
    list.push(point);
  }
  saveKnowledge(list);
}

export function initKnowledgeForStudent(studentId: string, names: readonly string[]): void {
  const existing = getKnowledgeByStudent(studentId);
  const existingNames = new Set(existing.map((k) => k.name));
  const newPoints: KnowledgePoint[] = [];
  for (const name of names) {
    if (!existingNames.has(name)) {
      newPoints.push({
        id: `${studentId}_${name}`,
        studentId,
        name,
        status: 'not_started',
        updatedAt: new Date().toISOString(),
      });
    }
  }
  if (newPoints.length > 0) {
    saveKnowledge([...getKnowledge(), ...newPoints]);
  }
}
