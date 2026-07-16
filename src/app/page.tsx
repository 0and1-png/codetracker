'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Upload, Search, Trash2, FileText, Code2, Settings,
  Users, Check, Keyboard, RotateCcw, BookOpen, Save, X,
  TrendingUp, ChevronDown, History, Sparkles, Scroll, Swords,
  ChevronRight, ChevronLeft, Eye, EyeOff, Edit,
} from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import type { Student, Course, TypingRecord, ProblemRetryRecord, HomeworkRecord } from '@/lib/types';
import {
  getCourses, getStudentsByCourse, addStudent, deleteStudent,
  addTypingRecord, addRetryRecord, addHomeworkRecord, getRetryRecords,
  getTypingByStudent, getRetryByStudent, getHomeworkByStudent, getKnowledgeByStudent,
  getCourses as getCoursesForUpdate,
  addClassToCourse, removeClassFromCourse, renameClassInCourse, getCourseClasses,
} from '@/lib/store';
import {
  type AutoTag, generateAutoTags, calcTypingSummary, calcRetrySummary,
  calcHomeworkSummary, calcKnowledgeMastery, getMonthRange, getPreviousMonthRange,
  getRecordsInPeriod,
} from '@/lib/analytics';
import { XIAN, COURSE_COLORS, PRESET_STRENGTHS, PRESET_IMPROVEMENTS } from '@/lib/constants';

type RecordTab = 'retry' | 'typing' | 'homework';

interface RetryRowForm {
  problemId: string;
  times: [string, string, string]; // [一刷, 二刷, 三刷]
}

interface TypingForm { speed: string; praiseTags: string[]; improveTags: string[] }
interface HomeworkForm { content: string; completion: string; comment: string }

// Growth suggestion presets
const GROWTH_SUGGESTION_PRESETS = [
  '多做基础练习巩固理解',
  '加强打字速度和正确率',
  '尝试独立完成题目',
  '注重代码规范和注释',
  '培养调试和排错能力',
  '学习更高效的解题方法',
  '加强逻辑思维训练',
  '提升问题拆解能力',
] as const;

export default function HomePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCourseId, setNewCourseId] = useState('course_cpp');
  const [newClassName, setNewClassName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  const [activeTab, setActiveTab] = useState<RecordTab>('retry');
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Per-student forms
  const [typingForms, setTypingForms] = useState<Record<string, TypingForm>>({});
  const [retryForms, setRetryForms] = useState<Record<string, RetryRowForm[]>>({});
  const [homeworkForms, setHomeworkForms] = useState<Record<string, HomeworkForm>>({});

  // Class filter
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showTags, setShowTags] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');

  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<{ typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] }>({ typing: [], retry: [], homework: [] });
  const [tagFilter, setTagFilter] = useState<'all' | 'highlight' | 'weakness'>('all');

  // Batch retry upload
  const [showBatchRetry, setShowBatchRetry] = useState(false);
  const [batchRetryStudentId, setBatchRetryStudentId] = useState('');
  const [batchRetryText, setBatchRetryText] = useState('');
  const [batchRetryResult, setBatchRetryResult] = useState<{ success: number; failed: number } | null>(null);

  // Class management
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [createClass, setCreateClass] = useState('');
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  const loadData = useCallback(() => {
    const courseList = getCourses();
    setCourses(courseList);
    if (courseList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courseList[0].id);
    }
  }, [selectedCourseId]);

  const loadStudents = useCallback(() => {
    if (!selectedCourseId) return;
    const students = getStudentsByCourse(selectedCourseId);
    setCourseStudents(students);
    const course = getCourses().find((c) => c.id === selectedCourseId);
    const hints: Record<string, { lastSpeed?: number; lastAccuracy?: number }> = {};
    const month = format(new Date(), 'yyyy-MM');
    const curRange = getMonthRange(month);
    const prevRange = getPreviousMonthRange(month);

    students.forEach((s) => {
      const typing = getTypingByStudent(s.id);
      const retry = getRetryByStudent(s.id);
      const homework = getHomeworkByStudent(s.id);
      const knowledge = getKnowledgeByStudent(s.id);
      const lastTyping = typing.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastTyping) hints[s.id] = { lastSpeed: lastTyping.speed, lastAccuracy: lastTyping.accuracy };
      const curTypingRecs = getRecordsInPeriod(typing, curRange.start, curRange.end);
      const prevTypingRecs = getRecordsInPeriod(typing, prevRange.start, prevRange.end);
      const curRetryRecs = getRecordsInPeriod(retry, curRange.start, curRange.end);
      const prevRetryRecs = getRecordsInPeriod(retry, prevRange.start, prevRange.end);
      const curHomeworkRecs = getRecordsInPeriod(homework, curRange.start, curRange.end);
      const tags = generateAutoTags(
        calcTypingSummary(curTypingRecs), calcTypingSummary(prevTypingRecs),
        calcRetrySummary(curRetryRecs, course || undefined),
        calcRetrySummary(prevRetryRecs, course || undefined),
        calcHomeworkSummary(curHomeworkRecs),
        calcKnowledgeMastery(knowledge, retry, course || undefined),
      );
      (s as Student & { _autoTags?: AutoTag[] })._autoTags = tags;
    });
    setLastRecordHints(hints);
  }, [selectedCourseId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStudents(); }, [loadStudents, selectedCourseId]);

  const [lastRecordHints, setLastRecordHints] = useState<Record<string, { lastSpeed?: number; lastAccuracy?: number }>>({});

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

  // Get unique classes from students
  const courseClasses = getCourseClasses(selectedCourseId);
  const studentClasses = Array.from(new Set(courseStudents.map(s => s.className || '').filter(Boolean)));
  const classList = Array.from(new Set([...courseClasses, ...studentClasses])).sort();
  const filteredByClass = selectedClass === 'all' ? courseStudents : courseStudents.filter(s => (s.className || '') === selectedClass);

  const filteredStudents = filteredByClass.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (tagFilter === 'all') return true;
    const tags = (s as Student & { _autoTags?: AutoTag[] })._autoTags || [];
    if (tagFilter === 'highlight') return tags.some((t) => t.type === 'highlight');
    if (tagFilter === 'weakness') return tags.some((t) => t.type === 'weakness');
    return true;
  });

  const selectedStudents = courseStudents.filter((s) => selectedStudentIds.includes(s.id));

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]);
    setSelectedClass('all');
    setTypingForms({});
    setRetryForms({});
    setHomeworkForms({});
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
      if (!next.includes(id)) {
        setTypingForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
        setRetryForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
        setHomeworkForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
      }
      return next;
    });
  };

  const selectAllInClass = () => {
    const classIds = filteredStudents.map(s => s.id);
    const allSelected = classIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !classIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...classIds])]);
    }
  };

  // Form helpers
  const getTypingForm = (id: string): TypingForm => typingForms[id] || { speed: '', praiseTags: [], improveTags: [] };
  const getRetryForm = (id: string): RetryRowForm[] => retryForms[id] || [{ problemId: '', times: ['', '', ''] }];
  const getHomeworkForm = (id: string): HomeworkForm => homeworkForms[id] || { content: '', completion: '', comment: '' };

  const updateTypingForm = (id: string, field: keyof TypingForm, value: string | string[]) => {
    setTypingForms((prev) => ({ ...prev, [id]: { ...getTypingForm(id), [field]: value } }));
  };
  const updateHomeworkForm = (id: string, field: keyof HomeworkForm, value: string) => {
    setHomeworkForms((prev) => ({ ...prev, [id]: { ...getHomeworkForm(id), [field]: value } }));
  };

  const updateRetryRow = (studentId: string, rowIndex: number, field: 'problemId' | 'times', value: string | [string, string, string]) => {
    setRetryForms(prev => {
      const rows = [...(prev[studentId] || [{ problemId: '', times: ['', '', ''] }])];
      rows[rowIndex] = { ...rows[rowIndex], [field]: value };
      return { ...prev, [studentId]: rows };
    });
  };

  const addRetryRow = (studentId: string) => {
    setRetryForms(prev => {
      const rows = [...(prev[studentId] || []), { problemId: '', times: ['', '', ''] as [string, string, string] }];
      return { ...prev, [studentId]: rows };
    });
  };

  const removeRetryRow = (studentId: string, rowIndex: number) => {
    setRetryForms(prev => {
      const rows = (prev[studentId] || []).filter((_, i) => i !== rowIndex);
      if (rows.length === 0) rows.push({ problemId: '', times: ['', '', ''] });
      return { ...prev, [studentId]: rows };
    });
  };

  // Add student
  const handleAddStudent = () => {
    if (!newName.trim() || !newCourseId) return;
    addStudent({
      id: uuidv4(), name: newName.trim(), courseId: newCourseId,
      className: newClassName.trim() || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewName(''); setNewCourseId('course_cpp'); setNewClassName(''); setNewNotes('');
    setAddStudentOpen(false); loadStudents();
  };

  // Batch import - auto-assign course based on class name
  const handleImport = () => {
    if (!importText.trim()) return;
    const result = Papa.parse(importText.trim(), { header: false, skipEmptyLines: true });
    const rows = result.data as string[][];
    for (const row of rows) {
      const name = (row[0] || '').trim();
      if (!name) continue;
      const className = (row[1] || '').trim();
      // Auto-detect course from class name
      let courseId = selectedCourseId;
      const cnLower = className.toLowerCase();
      if (cnLower.includes('c++') || cnLower.includes('信奥') || cnLower.includes('csp')) {
        courseId = 'course_cpp';
      } else if (cnLower.includes('python') || cnLower.includes('python')) {
        courseId = 'course_python';
      } else if (cnLower.includes('图形化') || cnLower.includes('scratch') || cnLower.includes('编程启蒙')) {
        courseId = 'course_visual';
      }
      addStudent({
        id: uuidv4(), name, courseId,
        className: className || undefined,
        notes: (row[2] || '').trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }
    setImportText(''); setImportOpen(false); loadStudents();
  };

  const handleDelete = (id: string) => {
    deleteStudent(id);
    setSelectedStudentIds((prev) => prev.filter((sid) => sid !== id));
    loadStudents();
  };

  // Save student records
  const handleSaveStudent = (studentId: string) => {
    if (activeTab === 'typing') {
      const form = getTypingForm(studentId);
      if (!form.speed) return;
      addTypingRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        speed: Number(form.speed), accuracy: 0,
        praiseTags: form.praiseTags.length > 0 ? form.praiseTags : undefined,
        improveTags: form.improveTags.length > 0 ? form.improveTags : undefined,
      });
    } else if (activeTab === 'retry') {
      const rows = getRetryForm(studentId);
      for (const row of rows) {
        if (!row.problemId) continue;
        const problem = activeCourse?.problems.find((p) => p.id === row.problemId);
        row.times.forEach((time, idx) => {
          const t = Number(time);
          if (t > 0) {
            addRetryRecord({
              id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
              problemId: row.problemId, problemName: problem?.name || '',
              attempt: idx + 1, timeSpent: t,
            });
          }
        });
      }
    } else if (activeTab === 'homework') {
      const form = getHomeworkForm(studentId);
      if (!form.content.trim()) return;
      addHomeworkRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        title: '课后作业',
        content: form.content.trim(),
        score: form.completion ? Number(form.completion) : undefined,
        comment: form.comment.trim() || undefined,
      });
    }
    setSavedStudents((prev) => new Set(prev).add(studentId));
    setTimeout(() => {
      setSavedStudents((prev) => { const next = new Set(prev); next.delete(studentId); return next; });
    }, 2000);
  };

  const handleSaveAll = () => {
    for (const studentId of selectedStudentIds) {
      handleSaveStudent(studentId);
    }
  };

  // Batch retry upload - auto-add missing problems
  const handleBatchRetryUpload = (studentId: string) => {
    if (!batchRetryText.trim() || !activeCourse) return;
    const lines = batchRetryText.trim().split('\n').filter(l => l.trim());
    let success = 0;
    let failed = 0;
    const course = { ...activeCourse };

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) { failed++; continue; }

      let i = parts.length - 1;
      const tempNums: string[] = [];
      while (i >= 1 && /^\d+(\.\d+)?$/.test(parts[i])) {
        tempNums.unshift(parts[i]);
        i--;
      }

      const problemName = parts.slice(0, i + 1).join(' ');
      const times = tempNums.map(Number);
      if (!problemName || times.length === 0) { failed++; continue; }

      // Find or auto-create problem
      let matchedProblem = course.problems.find(
        p => p.name === problemName || p.id === problemName || problemName.includes(p.name) || p.name.includes(problemName)
      );

      if (!matchedProblem) {
        // Auto-add the problem to the course
        const newProblem = {
          id: `prob_auto_${uuidv4().slice(0, 8)}`,
          name: problemName,
        };
        course.problems = [...course.problems, newProblem];
        matchedProblem = newProblem;
        // Persist to course storage
        const allCourses = getCourses();
        const idx = allCourses.findIndex(c => c.id === selectedCourseId);
        if (idx >= 0) {
          allCourses[idx].problems = course.problems;
          // Save back via localStorage
          localStorage.setItem('coding_courses', JSON.stringify(allCourses));
        }
      }

      times.forEach((time, idx) => {
        if (time > 0) {
          addRetryRecord({
            id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
            problemId: matchedProblem!.id, problemName: matchedProblem!.name,
            attempt: idx + 1, timeSpent: time,
          });
          success++;
        }
      });
    }

    // Reload data to reflect new problems
    setCourses([course]);
    setBatchRetryResult({ success, failed });
    setBatchRetryText('');
    setTimeout(() => setBatchRetryResult(null), 3000);
  };

  const loadHistory = (studentId: string) => {
    if (historyStudentId === studentId) { setHistoryStudentId(null); return; }
    setHistoryStudentId(studentId);
    setHistoryRecords({
      typing: getTypingByStudent(studentId).slice(-5).reverse(),
      retry: getRetryByStudent(studentId).slice(-5).reverse(),
      homework: getHomeworkByStudent(studentId).slice(-5).reverse(),
    });
  };

  // ============ RENDER ============
  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">{XIAN.app}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-500 gap-1" onClick={() => { setImportOpen(true); }}>
            <Upload className="h-4 w-4" />{XIAN.importCSV}
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-500 gap-1" onClick={() => { setAddStudentOpen(true); }}>
            <Plus className="h-4 w-4" />{XIAN.addStudent}
          </Button>
          <Link href="/courses">
            <Button variant="ghost" size="sm" className="text-gray-500 gap-1">
              <Settings className="h-4 w-4" />{XIAN.courses}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main: Left-Right Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Student Selection */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Course tabs */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex gap-1">
              {courses.map(c => {
                const colors = COURSE_COLORS[c.id] || COURSE_COLORS.course_cpp;
                return (
                  <button key={c.id} onClick={() => handleCourseChange(c.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      selectedCourseId === c.id
                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class filter */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => setSelectedClass('all')}
                className={`px-2 py-1 rounded text-xs transition-all ${selectedClass === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
                全部
              </button>
              {classList.map(cls => (
                <div key={cls} className="relative group">
                  <button onClick={() => setSelectedClass(cls)}
                    className={`px-2 py-1 rounded text-xs transition-all pr-4 ${selectedClass === cls ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {cls}
                  </button>
                  <div className="absolute right-0 top-0 hidden group-hover:flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setEditingClass(cls); setEditingClassName(cls); }}
                      className="p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-500" title="重命名">
                      <Edit className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`确定删除班级「${cls}」？班级内学员也将被删除`)) { removeClassFromCourse(selectedCourseId, cls); loadData(); if (selectedClass === cls) setSelectedClass('all'); } }}
                      className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500" title="删除">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowCreateClass(true)}
                className="px-1.5 py-1 rounded text-xs text-blue-500 hover:bg-blue-50 transition-all flex items-center gap-0.5">
                <Plus className="h-3 w-3" /> 班级
              </button>
            </div>
          </div>

          {/* Search + select all */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="搜索学员..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-7 text-xs rounded-lg border-gray-200" />
            </div>
            <button onClick={selectAllInClass} className="text-xs text-blue-500 hover:text-blue-600 shrink-0">
              {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? '取消全选' : '全选'}
            </button>
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">暂无学员</div>
            ) : (
              <div className="py-1">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div key={student.id}
                      className={`px-3 py-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => toggleStudent(student.id)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{student.name}</div>
                        {student.className && (
                          <div className="text-xs text-gray-400 truncate">{student.className}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Link href={`/reports/${student.id}`} className="p-1 hover:bg-blue-50 rounded opacity-60 hover:opacity-100 transition-all"
                          title="查看成长报告" onClick={(e) => e.stopPropagation()}>
                          <FileText className="h-3 w-3 text-blue-500" />
                        </Link>
                        <button className="p-1 hover:bg-red-50 rounded opacity-60 hover:opacity-100 transition-all"
                          onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}>
                          <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Recording Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar + controls */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveTab('retry')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'retry' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.retry}
                </button>
                <button onClick={() => setActiveTab('typing')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'typing' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.typing}
                </button>
                <button onClick={() => setActiveTab('homework')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'homework' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.homework}
                </button>
                <Separator orientation="vertical" className="h-5 mx-2 bg-gray-200" />
                <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
                  className="w-36 h-7 text-xs border-gray-200" />
                {selectedStudentIds.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-5 mx-2 bg-gray-200" />
                    <Button size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSaveAll}>
                      <Save className="h-3.5 w-3.5 mr-1" />全部{XIAN.save}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTags(!showTags)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${showTags ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {showTags ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showTags ? '隐藏评价' : '显示评价'}
                </button>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStudentIds.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">请在左侧选择学员开始记录</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {selectedStudents.map((student) => (
                  <StudentRecordCard
                    key={student.id}
                    student={student}
                    activeTab={activeTab}
                    activeCourse={activeCourse}
                    recordDate={recordDate}
                    showTags={showTags}
                    isSaved={savedStudents.has(student.id)}
                    isHistoryOpen={historyStudentId === student.id}
                    historyRecords={historyRecords}
                    typingForm={getTypingForm(student.id)}
                    retryRows={getRetryForm(student.id)}
                    homeworkForm={getHomeworkForm(student.id)}
                    problemSearch={problemSearch}
                    onProblemSearchChange={setProblemSearch}
                    onUpdateTyping={(field, value) => updateTypingForm(student.id, field, value)}
                    onUpdateRetryRow={(rowIndex, field, value) => updateRetryRow(student.id, rowIndex, field, value)}
                    onAddRetryRow={() => addRetryRow(student.id)}
                    onRemoveRetryRow={(rowIndex) => removeRetryRow(student.id, rowIndex)}
                    onUpdateHomework={(field, value) => updateHomeworkForm(student.id, field, value)}
                    onSave={() => handleSaveStudent(student.id)}
                    onLoadHistory={() => loadHistory(student.id)}
                    onBatchRetry={() => { setBatchRetryStudentId(student.id); setShowBatchRetry(true); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-800">{XIAN.addStudent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">姓名</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="学员姓名" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">课程</Label>
              <Select value={newCourseId} onValueChange={setNewCourseId}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">班级</Label>
              <Select value={newClassName} onValueChange={setNewClassName}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="选择或输入班级" /></SelectTrigger>
                <SelectContent>
                  {classList.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">备注</Label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="备注信息（可选）" className="mt-1 h-8 text-sm" />
            </div>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleAddStudent} disabled={!newName.trim()}>
              确认添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-800">{XIAN.importCSV}</DialogTitle>
            <DialogDescription className="text-gray-500">
              每行一名学员，格式：姓名, 班级, 备注<br/>
              系统会根据班级名称自动分配课程（含C++/信奥→C++课程，含Python→Python课程，含图形化/Scratch→图形化课程）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              placeholder={'张三, C++入门班, 备注\n李四, Python基础班\n王五, 图形化启蒙班'} className="min-h-[140px] text-sm" />
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleImport} disabled={!importText.trim()}>
              确认导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog open={showCreateClass} onOpenChange={(open) => {
        setShowCreateClass(open);
        if (!open) setCreateClass('');
      }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>创建新班级</DialogTitle>
            <DialogDescription>在「{courses.find(c => c.id === selectedCourseId)?.name}」课程下创建班级</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium text-gray-700">班级名称</Label>
            <Input value={createClass} onChange={(e) => setCreateClass(e.target.value)}
              placeholder="例如：周六班、提高班" className="mt-1.5" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateClass(false); setCreateClass(''); }}>取消</Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              if (createClass.trim()) {
                addClassToCourse(selectedCourseId, createClass.trim());
                setShowCreateClass(false);
                setCreateClass('');
                loadData();
              }
            }} disabled={!createClass.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Class Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => {
        if (!open) { setEditingClass(null); setEditingClassName(''); }
      }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>重命名班级</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium text-gray-700">新名称</Label>
            <Input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)}
              placeholder="输入新的班级名称" className="mt-1.5" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingClass(null); setEditingClassName(''); }}>取消</Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              if (editingClass && editingClassName.trim()) {
                renameClassInCourse(selectedCourseId, editingClass, editingClassName.trim());
                setEditingClass(null);
                setEditingClassName('');
                if (selectedClass === editingClass) setSelectedClass(editingClassName.trim());
                loadData();
              }
            }} disabled={!editingClassName.trim()}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Retry Upload Dialog */}
      <Dialog open={showBatchRetry} onOpenChange={(open) => {
        setShowBatchRetry(open);
        if (!open) { setBatchRetryText(''); setBatchRetryResult(null); }
      }}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-800 flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              批量{XIAN.retry}上传
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              为「{courseStudents.find(s => s.id === batchRetryStudentId)?.name}」批量录入三刷记录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium mb-1">格式说明：</p>
              <p className="text-xs text-gray-500">每行一条，空格分隔：题目名称 一刷耗时 二刷耗时 三刷耗时</p>
              <p className="text-xs text-gray-400 mt-1">耗时单位为分钟。不存在的题目会自动添加到题库</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">示例：</p>
                <p className="text-xs text-gray-500 font-mono mt-1">津津的储蓄计划 30 20 15</p>
                <p className="text-xs text-gray-500 font-mono">买铅笔 10 8</p>
              </div>
            </div>
            <Textarea value={batchRetryText} onChange={(e) => setBatchRetryText(e.target.value)}
              placeholder={'津津的储蓄计划 30 20 15\n买铅笔 10 8'} className="min-h-[140px] font-mono text-sm" />
            {batchRetryResult && (
              <div className={`text-sm rounded-lg px-3 py-2 ${batchRetryResult.success > 0 ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                成功录入 {batchRetryResult.success} 条{batchRetryResult.failed > 0 ? `，${batchRetryResult.failed} 条失败` : ''}
              </div>
            )}
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleBatchRetryUpload(batchRetryStudentId)} disabled={!batchRetryText.trim()}>
              确认上传
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Student Record Card Component ============
interface StudentRecordCardProps {
  student: Student;
  activeTab: RecordTab;
  activeCourse: Course | undefined;
  recordDate: string;
  showTags: boolean;
  isSaved: boolean;
  isHistoryOpen: boolean;
  historyRecords: { typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] };
  typingForm: TypingForm;
  retryRows: RetryRowForm[];
  homeworkForm: HomeworkForm;
  problemSearch: string;
  onProblemSearchChange: (v: string) => void;
  onUpdateTyping: (field: keyof TypingForm, value: string | string[]) => void;
  onUpdateRetryRow: (rowIndex: number, field: 'problemId' | 'times', value: string | [string, string, string]) => void;
  onAddRetryRow: () => void;
  onRemoveRetryRow: (rowIndex: number) => void;
  onUpdateHomework: (field: keyof HomeworkForm, value: string) => void;
  onSave: () => void;
  onLoadHistory: () => void;
  onBatchRetry: () => void;
}

function StudentRecordCard({
  student, activeTab, activeCourse, showTags, isSaved, isHistoryOpen,
  historyRecords, typingForm, retryRows, homeworkForm,
  problemSearch, onProblemSearchChange,
  onUpdateTyping, onUpdateRetryRow, onAddRetryRow, onRemoveRetryRow,
  onUpdateHomework, onSave, onLoadHistory, onBatchRetry,
}: StudentRecordCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{student.name}</span>
          {student.className && <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{student.className}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLoadHistory} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
            <History className="h-3 w-3" />{isHistoryOpen ? '收起' : '历史'}
          </button>
          {activeTab === 'retry' && (
            <button onClick={onBatchRetry} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
              <Upload className="h-3 w-3" />批量
            </button>
          )}
          <Button size="sm" className={`h-7 text-xs ${isSaved ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`} onClick={onSave}>
            {isSaved ? <Check className="h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            {isSaved ? '已保存' : XIAN.save}
          </Button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Retry Tab */}
        {activeTab === 'retry' && (
          <div className="space-y-3">
            {retryRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                {/* Problem selector */}
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500 mb-1 block">题目</Label>
                  {activeCourse && activeCourse.problems.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-8 text-sm justify-between">
                          {row.problemId ? (
                            <span className="truncate text-gray-700">
                              {activeCourse.problems.find(p => p.id === row.problemId)?.name || '选择题目'}
                            </span>
                          ) : (
                            <span className="text-gray-400">搜索题号/题目名</span>
                          )}
                          <ChevronDown className="h-3 w-3 text-gray-400 ml-1 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-white border-gray-200" align="start">
                        <div className="p-2 border-b border-gray-100">
                          <Input placeholder="输入题号或题目名搜索..." className="h-7 text-xs"
                            value={problemSearch} onChange={(e) => onProblemSearchChange(e.target.value)} />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {activeCourse.problems
                            .filter(p => {
                              if (!problemSearch) return true;
                              const s = problemSearch.toLowerCase();
                              return p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
                            })
                            .map((p) => (
                              <div key={p.id}
                                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                                  row.problemId === p.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                                onClick={() => { onUpdateRetryRow(rowIndex, 'problemId', p.id); onProblemSearchChange(''); }}>
                                {p.name}
                              </div>
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-xs text-gray-400">请先在课程管理中添加题目</span>
                  )}
                </div>
                {/* Time inputs - horizontal */}
                {(['一刷', '二刷', '三刷'] as const).map((label, timeIdx) => (
                  <div key={label} className="w-20">
                    <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                    <Input type="number" placeholder="分钟"
                      value={row.times[timeIdx]}
                      onChange={(e) => {
                        const newTimes = [...row.times] as [string, string, string];
                        newTimes[timeIdx] = e.target.value;
                        onUpdateRetryRow(rowIndex, 'times', newTimes);
                      }}
                      className="h-8 text-sm" />
                  </div>
                ))}
                {/* Remove row */}
                {retryRows.length > 1 && (
                  <button onClick={() => onRemoveRetryRow(rowIndex)} className="mt-5 p-1 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={onAddRetryRow} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
              <Plus className="h-3 w-3" />添加题目
            </button>
          </div>
        )}

        {/* Typing Tab */}
        {activeTab === 'typing' && (
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-gray-500">打字速度（字/分钟）</Label>
              <Input type="number" placeholder="速度" value={typingForm.speed}
                onChange={(e) => onUpdateTyping('speed', e.target.value)}
                className="w-32 h-8 text-sm mt-1" />
            </div>
          </div>
        )}

        {/* Homework Tab */}
        {activeTab === 'homework' && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-gray-500">作业内容</Label>
                <Textarea value={homeworkForm.content} onChange={(e) => onUpdateHomework('content', e.target.value)}
                  placeholder="记录作业内容..." className="mt-1 min-h-[60px] text-sm" />
              </div>
              <div className="w-24">
                <Label className="text-xs text-gray-500">完成度</Label>
                <Select value={homeworkForm.completion} onValueChange={(v) => onUpdateHomework('completion', v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">全部完成</SelectItem>
                    <SelectItem value="75">大部分完成</SelectItem>
                    <SelectItem value="50">完成一半</SelectItem>
                    <SelectItem value="25">少量完成</SelectItem>
                    <SelectItem value="0">未完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">教师评语</Label>
              <Input value={homeworkForm.comment} onChange={(e) => onUpdateHomework('comment', e.target.value)}
                placeholder="写一句评语..." className="mt-1 h-8 text-sm" />
            </div>
          </div>
        )}

        {/* Tags section (toggleable) */}
        {showTags && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">{XIAN.strengths}</Label>
              <div className="flex flex-wrap gap-1">
                {PRESET_STRENGTHS.map(tag => {
                  const tags = activeTab === 'typing' ? typingForm.praiseTags : activeTab === 'retry' ? [] : [];
                  const isActive = tags.includes(tag);
                  return (
                    <button key={tag} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.praiseTags;
                        onUpdateTyping('praiseTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      }
                    }}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">{XIAN.improvements}</Label>
              <div className="flex flex-wrap gap-1">
                {PRESET_IMPROVEMENTS.map(tag => {
                  const tags = activeTab === 'typing' ? typingForm.improveTags : [];
                  const isActive = tags.includes(tag);
                  return (
                    <button key={tag} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.improveTags;
                        onUpdateTyping('improveTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      }
                    }}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${isActive ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History panel */}
      {isHistoryOpen && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <h4 className="text-xs font-medium text-gray-500 mb-2">{XIAN.history}</h4>
          <div className="space-y-1">
            {historyRecords.retry.length === 0 && historyRecords.typing.length === 0 && historyRecords.homework.length === 0 ? (
              <p className="text-xs text-gray-400">暂无记录</p>
            ) : (
              <>
                {historyRecords.retry.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 text-[10px]">三刷</span>
                    <span>{r.date}</span>
                    <span>{r.problemName}</span>
                    <span>第{r.attempt}次 {r.timeSpent}分</span>
                  </div>
                ))}
                {historyRecords.typing.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-500 text-[10px]">速度</span>
                    <span>{r.date}</span>
                    <span>{r.speed}字/分</span>
                  </div>
                ))}
                {historyRecords.homework.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 text-[10px]">作业</span>
                    <span>{r.date}</span>
                    <span>{r.content.slice(0, 20)}{r.content.length > 20 ? '...' : ''}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
