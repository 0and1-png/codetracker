// Supabase 数据存储层
// 提供与 localStorage store.ts 相同的 API，但数据存储在 Supabase

import { supabase, isSupabaseConfigured } from './client';
import type {
  Course, Student, TypingRecord, ProblemRetryRecord, HomeworkRecord,
  KnowledgeProgress, ExamRecord, CompetitionRecord, HonorRecord,
  CompetitionEvent, SprintGoalData, ReportData,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 课程操作
// ============================================
export async function getCoursesAsync(): Promise<Course[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    curriculum: row.curriculum || [],
    teachingContent: row.teaching_content || undefined,
    knowledgePoints: row.knowledge_points || [],
    problems: row.problems || [],
    classes: row.classes || [],
  }));
}

export async function saveCoursesAsync(courses: Course[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (courses.length === 0) return;
  const rows = courses.map(c => ({
    id: c.id,
    name: c.name,
    curriculum: c.curriculum,
    teaching_content: c.teachingContent || null,
    knowledge_points: c.knowledgePoints,
    problems: c.problems,
    classes: c.classes,
  }));
  const { error } = await supabase.from('courses').insert(rows);
  if (error) throw error;
}

export async function getCourseAsync(courseId: string): Promise<Course | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  if (error) return null;
  const row = data as any;
  return {
    id: row.id,
    name: row.name,
    curriculum: row.curriculum || [],
    teachingContent: row.teaching_content || undefined,
    knowledgePoints: row.knowledge_points || [],
    problems: row.problems || [],
    classes: row.classes || [],
  };
}

export async function saveCourseAsync(course: Course): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: course.id,
    name: course.name,
    curriculum: course.curriculum,
    teaching_content: course.teachingContent || null,
    knowledge_points: course.knowledgePoints,
    problems: course.problems,
    classes: course.classes,
  };
  const { error } = await supabase.from('courses').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

// ============================================
// 学员操作
// ============================================
export async function getStudentsAsync(): Promise<Student[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    courseId: row.course_id || '',
    className: row.class_name || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  }));
}

export async function addStudentAsync(student: Student): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: student.id,
    name: student.name,
    course_id: student.courseId || null,
    class_name: student.className || null,
    notes: student.notes || null,
  };
  const { error } = await supabase.from('students').insert(row);
  if (error) throw error;
}

export async function updateStudentAsync(student: Student): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    name: student.name,
    course_id: student.courseId || null,
    class_name: student.className || null,
    notes: student.notes || null,
  };
  const { error } = await supabase.from('students').update(row).eq('id', student.id);
  if (error) throw error;
}

export async function deleteStudentAsync(studentId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw error;
}

// ============================================
// 打字记录
// ============================================
export async function getTypingByStudentAsync(studentId: string): Promise<TypingRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('typing_records')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    date: row.date,
    speed: row.speed,
    accuracy: row.accuracy,
    praiseTags: row.praise_tags || [],
    improveTags: row.improve_tags || [],
  }));
}

export async function addTypingRecordAsync(record: TypingRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    date: record.date,
    speed: record.speed,
    accuracy: record.accuracy,
    praise_tags: record.praiseTags || [],
    improve_tags: record.improveTags || [],
  };
  const { error } = await supabase.from('typing_records').insert(row);
  if (error) throw error;
}

// ============================================
// 三刷记录
// ============================================
export async function getRetryByStudentAsync(studentId: string): Promise<ProblemRetryRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('retry_records')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    date: row.date,
    problemId: row.problem_id,
    problemName: row.problem_name,
    attempt: row.attempt,
    timeSpent: row.time_spent,
    notes: row.notes || undefined,
    praiseTags: row.praise_tags || [],
    improveTags: row.improve_tags || [],
    growthSuggestions: row.growth_suggestions || [],
    isQualified: row.is_qualified,
    unqualifiedReason: row.unqualified_reason || undefined,
  }));
}

export async function addRetryRecordAsync(record: ProblemRetryRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    date: record.date,
    problem_id: record.problemId,
    problem_name: record.problemName,
    attempt: record.attempt,
    time_spent: record.timeSpent,
    notes: record.notes || null,
    praise_tags: record.praiseTags || [],
    improve_tags: record.improveTags || [],
    growth_suggestions: record.growthSuggestions || [],
    is_qualified: record.isQualified ?? true,
    unqualified_reason: record.unqualifiedReason || null,
  };
  const { error } = await supabase.from('retry_records').insert(row);
  if (error) throw error;
}

// ============================================
// 作业记录
// ============================================
export async function getHomeworkByStudentAsync(studentId: string): Promise<HomeworkRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('homework_records')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    date: row.date,
    title: row.title,
    content: row.content,
    score: row.score || undefined,
    comment: row.comment || undefined,
    imageUrl: row.image_url || undefined,
    praiseTags: row.praise_tags || [],
    improveTags: row.improve_tags || [],
    growthSuggestions: row.growth_suggestions || [],
  }));
}

export async function addHomeworkRecordAsync(record: HomeworkRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    date: record.date,
    title: record.title,
    content: record.content,
    score: record.score || null,
    comment: record.comment || null,
    image_url: record.imageUrl || null,
    praise_tags: record.praiseTags || [],
    improve_tags: record.improveTags || [],
    growth_suggestions: record.growthSuggestions || [],
  };
  const { error } = await supabase.from('homework_records').insert(row);
  if (error) throw error;
}

// ============================================
// 知识点进度
// ============================================
export async function getKnowledgeByStudentAsync(studentId: string): Promise<KnowledgeProgress[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('knowledge_progress')
    .select('*')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    knowledgePointId: row.knowledge_point_id,
    knowledgePointName: row.knowledge_point_name,
    courseId: row.course_id || '',
    status: row.status,
    score: row.score || undefined,
    description: row.description || undefined,
    updatedAt: row.updated_at,
  }));
}

export async function saveKnowledgeProgressAsync(progress: KnowledgeProgress): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: progress.id,
    student_id: progress.studentId,
    knowledge_point_id: progress.knowledgePointId,
    knowledge_point_name: progress.knowledgePointName,
    course_id: progress.courseId,
    status: progress.status,
    score: progress.score || null,
    description: progress.description || null,
  };
  const { error } = await supabase
    .from('knowledge_progress')
    .upsert(row, { onConflict: 'student_id,knowledge_point_id' });
  if (error) throw error;
}

// ============================================
// 考级记录
// ============================================
export async function getExamRecordsByStudentAsync(studentId: string): Promise<ExamRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('exam_records')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    level: row.level,
    examDate: row.exam_date,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    results: row.results || [],
    certificateUrl: row.certificate_url || undefined,
    createdAt: row.created_at,
  }));
}

export async function saveExamRecordAsync(record: ExamRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    level: record.level,
    exam_date: record.examDate,
    total_questions: record.totalQuestions,
    correct_count: record.correctCount,
    wrong_count: record.wrongCount,
    results: record.results,
    certificate_url: record.certificateUrl || null,
  };
  const { error } = await supabase.from('exam_records').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

// ============================================
// 赛事记录
// ============================================
export async function getCompetitionRecordsByStudentAsync(studentId: string): Promise<CompetitionRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('competition_records')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    competitionName: row.competition_name,
    competitionDate: row.competition_date,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    results: row.results || [],
    certificateUrl: row.certificate_url || undefined,
    createdAt: row.created_at,
  }));
}

export async function saveCompetitionRecordAsync(record: CompetitionRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    competition_name: record.competitionName,
    competition_date: record.competitionDate,
    total_questions: record.totalQuestions,
    correct_count: record.correctCount,
    wrong_count: record.wrongCount,
    results: record.results,
    certificate_url: record.certificateUrl || null,
  };
  const { error } = await supabase.from('competition_records').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

// ============================================
// 荣誉记录
// ============================================
export async function getHonorRecordsByStudentAsync(studentId: string): Promise<HonorRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('honor_records')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id || '',
    courseId: row.course_id || '',
    type: row.type,
    title: row.title,
    level: row.level || undefined,
    achievedDate: row.achieved_date,
    certificateUrl: row.certificate_url || undefined,
    createdAt: row.created_at,
  }));
}

export async function saveHonorRecordAsync(record: HonorRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    id: record.id,
    student_id: record.studentId,
    course_id: record.courseId,
    type: record.type,
    title: record.title,
    level: record.level || null,
    achieved_date: record.achievedDate,
    certificate_url: record.certificateUrl || null,
  };
  const { error } = await supabase.from('honor_records').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

// ============================================
// 成长档案报告
// ============================================
export async function getReportDataAsync(studentId: string, month: string): Promise<ReportData | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('report_data')
    .select('*')
    .eq('student_id', studentId)
    .eq('month', month)
    .single();
  if (error) return null;
  const row = data as any;
  return {
    studentId: row.student_id || '',
    month: row.month,
    teacherComment: row.teacher_comment || '',
    nextGoal: row.next_goal || '',
    studentAge: row.student_age || '',
    studentSchool: row.student_school || '',
    programmingTime: row.programming_time || '',
    learningContent: row.learning_content || '',
    interests: row.interests || '',
    studentPhoto: row.student_photo || '',
    studentAvatarPhoto: row.student_avatar_photo || '',
    coverPhoto: row.cover_photo || '',
    classroomPhotos: row.classroom_photos || [],
    sprintCourseGoal: row.sprint_course_goal || '',
    sprintGespLevels: row.sprint_gesp_levels || [],
    sprintCompetitionIds: row.sprint_competition_ids || [],
    monthFocus: row.month_focus || '',
    selectedCommentPresets: row.selected_comment_presets || [],
    studentWords: row.student_words || '',
    reportMonth: row.report_month || '',
    monthlyQuote: row.monthly_quote || '',
    timelineQuotes: row.timeline_quotes || {},
    editableStrengths: row.editable_strengths || [],
    editableWeaknesses: row.editable_weaknesses || [],
    editableAttendanceDays: row.editable_attendance_days || {},
    editableHomeworkCount: row.editable_homework_count || {},
    editableFullAttendanceDays: row.editable_full_attendance_days || {},
    editableHomeworkStandard: row.editable_homework_standard || {},
    editableGrowthSuggestions: row.editable_growth_suggestions || {},
    editableHomeSchoolTips: row.editable_home_school_tips || {},
    editableKpDescriptions: row.editable_kp_descriptions || {},
    honorRecords: row.honor_records || [],
    mergeTitle: row.merge_title || '',
    mergedQuote: row.merged_quote || '',
    updatedAt: row.updated_at,
  };
}

export async function saveReportDataAsync(report: ReportData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = {
    student_id: report.studentId,
    month: report.month,
    teacher_comment: report.teacherComment,
    next_goal: report.nextGoal,
    student_age: report.studentAge,
    student_school: report.studentSchool,
    programming_time: report.programmingTime,
    learning_content: report.learningContent,
    interests: report.interests,
    student_photo: report.studentPhoto,
    student_avatar_photo: report.studentAvatarPhoto,
    cover_photo: report.coverPhoto,
    classroom_photos: report.classroomPhotos,
    sprint_course_goal: report.sprintCourseGoal,
    sprint_gesp_levels: report.sprintGespLevels,
    sprint_competition_ids: report.sprintCompetitionIds,
    month_focus: report.monthFocus,
    selected_comment_presets: report.selectedCommentPresets,
    student_words: report.studentWords,
    report_month: report.reportMonth,
    monthly_quote: report.monthlyQuote,
    timeline_quotes: report.timelineQuotes,
    editable_strengths: report.editableStrengths,
    editable_weaknesses: report.editableWeaknesses,
    editable_attendance_days: report.editableAttendanceDays,
    editable_homework_count: report.editableHomeworkCount,
    editable_full_attendance_days: report.editableFullAttendanceDays,
    editable_homework_standard: report.editableHomeworkStandard,
    editable_growth_suggestions: report.editableGrowthSuggestions,
    editable_home_school_tips: report.editableHomeSchoolTips,
    editable_kp_descriptions: report.editableKpDescriptions,
    honor_records: report.honorRecords,
    merge_title: report.mergeTitle,
    merged_quote: report.mergedQuote,
  };
  const { error } = await supabase
    .from('report_data')
    .upsert(row, { onConflict: 'student_id,month' });
  if (error) throw error;
}

// ============================================
// 学员图片
// ============================================
export async function getStudentPhotosAsync(studentId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('student_photos')
    .select('photo_url')
    .eq('student_id', studentId)
    .order('sort_order', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => r.photo_url);
}

export async function saveStudentPhotosAsync(studentId: string, photos: string[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('student_photos').delete().eq('student_id', studentId);
  if (photos.length === 0) return;
  const rows = photos.map((url, idx) => ({
    student_id: studentId,
    photo_url: url,
    sort_order: photos.length - idx,
  }));
  const { error } = await supabase.from('student_photos').insert(rows);
  if (error) throw error;
}
