'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Upload, Search, Trash2, FileText, Code2, Settings,
  Users, Check, Keyboard, RotateCcw, BookOpen, Save, X,
  TrendingUp, ChevronDown, History, Sparkles, Scroll, Swords,
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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
} from '@/lib/store';
import {
  type AutoTag, generateAutoTags, calcTypingSummary, calcRetrySummary,
  calcHomeworkSummary, calcKnowledgeMastery, getMonthRange, getPreviousMonthRange,
  getRecordsInPeriod,
} from '@/lib/analytics';
import { XIAN, COURSE_COLORS, PRESET_STRENGTHS, PRESET_IMPROVEMENTS } from '@/lib/constants';

type RecordTab = 'typing' | 'retry' | 'homework';

interface TypingForm { speed: string; accuracy: string; praiseTags: string[]; improveTags: string[] }
interface RetryForm { problemId: string; attempt: string; timeSpent: string; notes: string; praiseTags: string[]; improveTags: string[]; growthSuggestions: string[] }
interface HomeworkForm { title: string; content: string; score: string; comment: string; imageUrl: string; praiseTags: string[]; improveTags: string[]; growthSuggestions: string[] }

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
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  const [activeTab, setActiveTab] = useState<RecordTab>('typing');
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [typingForms, setTypingForms] = useState<Record<string, TypingForm>>({});
  const [retryForms, setRetryForms] = useState<Record<string, RetryForm>>({});
  const [homeworkForms, setHomeworkForms] = useState<Record<string, HomeworkForm>>({});
  const [problemSearch, setProblemSearch] = useState<string>('');

  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());

  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<{ typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] }>({ typing: [], retry: [], homework: [] });

  const [tagFilter, setTagFilter] = useState<'all' | 'highlight' | 'weakness'>('all');
  const [lastRecordHints, setLastRecordHints] = useState<Record<string, { lastSpeed?: number; lastAccuracy?: number }>>({});

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

    const hints: Record<string, { lastSpeed?: number; lastAccuracy?: number }> = {};
    const month = format(new Date(), 'yyyy-MM');
    const curRange = getMonthRange(month);
    const prevRange = getPreviousMonthRange(month);
    const course = getCourses().find((c) => c.id === selectedCourseId);

    students.forEach((s) => {
      const typing = getTypingByStudent(s.id);
      const retry = getRetryByStudent(s.id);
      const homework = getHomeworkByStudent(s.id);
      const knowledge = getKnowledgeByStudent(s.id);

      const lastTyping = typing.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastTyping) {
        hints[s.id] = { lastSpeed: lastTyping.speed, lastAccuracy: lastTyping.accuracy };
      }

      const curTypingRecs = getRecordsInPeriod(typing, curRange.start, curRange.end);
      const prevTypingRecs = getRecordsInPeriod(typing, prevRange.start, prevRange.end);
      const curRetryRecs = getRecordsInPeriod(retry, curRange.start, curRange.end);
      const prevRetryRecs = getRecordsInPeriod(retry, prevRange.start, prevRange.end);
      const curHomeworkRecs = getRecordsInPeriod(homework, curRange.start, curRange.end);

      const curTypingSum = calcTypingSummary(curTypingRecs);
      const prevTypingSum = calcTypingSummary(prevTypingRecs);
      const curRetrySum = calcRetrySummary(curRetryRecs, course || undefined);
      const prevRetrySum = calcRetrySummary(prevRetryRecs, course || undefined);
      const curHomeworkSum = calcHomeworkSummary(curHomeworkRecs);
      const mastery = calcKnowledgeMastery(knowledge, retry, course || undefined);

      const tags = generateAutoTags(curTypingSum, prevTypingSum, curRetrySum, prevRetrySum, curHomeworkSum, mastery);
      (s as Student & { _autoTags?: AutoTag[] })._autoTags = tags;
    });
    setLastRecordHints(hints);
  }, [selectedCourseId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStudents(); }, [loadStudents, selectedCourseId]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]);
    setTypingForms({});
    setRetryForms({});
    setHomeworkForms({});
  };

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

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

  const selectAllStudents = () => {
    if (selectedStudentIds.length === courseStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(courseStudents.map((s) => s.id));
    }
  };

  const getTypingForm = (id: string): TypingForm => typingForms[id] || { speed: '', accuracy: '', praiseTags: [], improveTags: [] };
  const getRetryForm = (id: string): RetryForm => retryForms[id] || { problemId: '', attempt: '1', timeSpent: '', notes: '', praiseTags: [], improveTags: [], growthSuggestions: [] };
  const getHomeworkForm = (id: string): HomeworkForm => homeworkForms[id] || { title: '', content: '', score: '', comment: '', imageUrl: '', praiseTags: [], improveTags: [], growthSuggestions: [] };

  const updateTypingForm = (id: string, field: keyof TypingForm, value: string) => {
    setTypingForms((prev) => ({ ...prev, [id]: { ...getTypingForm(id), [field]: value } }));
  };
  const updateRetryForm = (id: string, field: keyof RetryForm, value: string) => {
    setRetryForms((prev) => ({ ...prev, [id]: { ...getRetryForm(id), [field]: value } }));
  };
  const updateHomeworkForm = (id: string, field: keyof HomeworkForm, value: string) => {
    setHomeworkForms((prev) => ({ ...prev, [id]: { ...getHomeworkForm(id), [field]: value } }));
  };

  const handleAddStudent = () => {
    if (!newName.trim() || !selectedCourseId) return;
    addStudent({
      id: uuidv4(), name: newName.trim(), courseId: selectedCourseId,
      className: newClassName.trim() || undefined, notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewName(''); setNewClassName(''); setNewNotes('');
    setAddStudentOpen(false); loadStudents();
  };

  const handleImport = () => {
    if (!importText.trim() || !selectedCourseId) return;
    const result = Papa.parse(importText.trim(), { header: false, skipEmptyLines: true });
    const rows = result.data as string[][];
    for (const row of rows) {
      const name = (row[0] || '').trim();
      if (!name) continue;
      addStudent({
        id: uuidv4(), name, courseId: selectedCourseId,
        className: (row[1] || '').trim() || undefined,
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

  const handleSaveStudent = (studentId: string) => {
    if (activeTab === 'typing') {
      const form = getTypingForm(studentId);
      if (!form.speed) return;
      addTypingRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        speed: Number(form.speed), accuracy: Number(form.accuracy) || 0,
        praiseTags: form.praiseTags.length > 0 ? form.praiseTags : undefined,
        improveTags: form.improveTags.length > 0 ? form.improveTags : undefined,
      });
    } else if (activeTab === 'retry') {
      const form = getRetryForm(studentId);
      if (!form.problemId || !form.timeSpent) return;
      const problem = activeCourse?.problems.find((p) => p.id === form.problemId);
      addRetryRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        problemId: form.problemId, problemName: problem?.name || '',
        attempt: Number(form.attempt) || 1, timeSpent: Number(form.timeSpent),
        notes: form.notes.trim() || undefined,
        praiseTags: form.praiseTags.length > 0 ? form.praiseTags : undefined,
        improveTags: form.improveTags.length > 0 ? form.improveTags : undefined,
        growthSuggestions: form.growthSuggestions.length > 0 ? form.growthSuggestions : undefined,
      });
    } else if (activeTab === 'homework') {
      const form = getHomeworkForm(studentId);
      if (!form.title.trim()) return;
      addHomeworkRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        title: form.title.trim(), content: form.content.trim(),
        score: form.score ? Number(form.score) : undefined,
        comment: form.comment.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        praiseTags: form.praiseTags.length > 0 ? form.praiseTags : undefined,
        improveTags: form.improveTags.length > 0 ? form.improveTags : undefined,
        growthSuggestions: form.growthSuggestions.length > 0 ? form.growthSuggestions : undefined,
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

  const getRetryImprovement = (problemId: string, attempt: number, currentTime: number): number | null => {
    const allRetries = getRetryRecords();
    const prev = allRetries.find((r) => r.problemId === problemId && r.attempt === attempt - 1);
    if (prev) return Math.round(((prev.timeSpent - currentTime) / prev.timeSpent) * 100);
    return null;
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

  const filteredStudents = courseStudents.filter((s) => {
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

  const courseColor = COURSE_COLORS[selectedCourseId] || COURSE_COLORS.course_cpp;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - 修仙风 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-xianjin/20" style={{ background: 'rgba(12, 14, 26, 0.9)' }}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
              <Sparkles className="h-5 w-5 text-amber-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold xian-text-gold font-serif">
                {XIAN.app}
              </h1>
              <p className="text-[10px] text-amber-600/60 -mt-0.5">修仙编程录</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-36 h-9 bg-anye/60 border-xianjin/20 text-amber-200">
                <SelectValue placeholder="选择功法" />
              </SelectTrigger>
              <SelectContent className="bg-anye border-xianjin/20">
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-amber-200 focus:bg-xianjin/10 focus:text-amber-100">{COURSE_COLORS[c.id]?.icon || ''} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/courses">
              <Button size="sm" variant="outline" className="border-xianjin/20 text-amber-400 hover:bg-xianjin/10 hover:text-amber-300">
                <Scroll className="h-4 w-4 mr-1" />{XIAN.courses}
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="border-xianjin/20 text-amber-400 hover:bg-xianjin/10 hover:text-amber-300" onClick={() => setAddStudentOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />{XIAN.addStudent}
            </Button>
            <Button size="sm" variant="outline" className="border-xianjin/20 text-amber-400 hover:bg-xianjin/10 hover:text-amber-300" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />{XIAN.importCSV}
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-[57px] z-40 backdrop-blur-xl border-b border-xianjin/15 px-4 sm:px-6 py-3" style={{ background: 'rgba(21, 24, 41, 0.9)' }}>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Student multi-select */}
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0 text-amber-300 font-medium">{XIAN.student}</Label>
            <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between h-9 border-xianjin/20 text-amber-200 hover:bg-xianjin/10">
                  <span className="truncate">
                    {selectedStudentIds.length === 0
                      ? `点击选择${XIAN.student}...`
                      : `已选 ${selectedStudentIds.length} 名${XIAN.student}`}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-anye border-xianjin/20" align="start">
                <div className="p-2 border-b border-xianjin/10">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-600" />
                    <Input
                      value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder={`搜索${XIAN.student}...`}
                      className="pl-8 h-8 text-sm xian-input"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {([['all', '全部'], ['highlight', '亮点'], ['weakness', '薄弱']] as const).map(([val, label]) => (
                      <button
                        key={val} onClick={() => setTagFilter(val)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          tagFilter === val
                            ? val === 'highlight' ? 'xian-tag-biyu' : val === 'weakness' ? 'xian-tag-zhusa' : 'xian-tag-xianjin'
                            : 'bg-anye/60 text-amber-700 hover:bg-anye'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-1 border-b border-xianjin/10">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-amber-400 justify-start hover:bg-xianjin/10" onClick={selectAllStudents}>
                    {selectedStudentIds.length === courseStudents.length ? '取消全选' : '全选'}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-amber-700">尚无{XIAN.student}</div>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1 ${
                            isSelected ? 'bg-xianjin/15' : 'hover:bg-anye/80'
                          }`}
                          onClick={() => toggleStudent(student.id)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 border-amber-500' : 'border-amber-800'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-amber-950" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-200 truncate">{student.name}</p>
                            {student.className && <p className="text-xs text-amber-700 truncate">{student.className}</p>}
                            {((student as Student & { _autoTags?: AutoTag[] })._autoTags || []).length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {((student as Student & { _autoTags?: AutoTag[] })._autoTags || []).slice(0, 3).map((tag: AutoTag, i: number) => (
                                  <span key={i} className={`px-1 py-0 rounded text-[10px] leading-tight ${
                                    tag.type === 'highlight' ? 'xian-tag-biyu' : 'xian-tag-zhusa'
                                  }`}>
                                    {tag.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-xianjin/10" onClick={() => router.push(`/students/${student.id}`)}>
                              <FileText className="h-3 w-3 text-amber-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-900/20">
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-anye border-xianjin/20">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-amber-200">确认逐出门派</AlertDialogTitle>
                                  <AlertDialogDescription className="text-amber-600">
                                    确定要将{XIAN.student}「{student.name}」逐出门派吗？所有修炼记录也将被清除。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-xianjin/20 text-amber-400">取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-red-600 hover:bg-red-700">逐出</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedStudentIds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedStudents.slice(0, 4).map((s) => (
                  <Badge key={s.id} className="xian-tag-xianjin gap-1 pr-1 border-0">
                    {s.name}
                    <X className="h-3 w-3 cursor-pointer hover:text-red-400" onClick={() => toggleStudent(s.id)} />
                  </Badge>
                ))}
                {selectedStudents.length > 4 && (
                  <Badge className="xian-tag-zixia border-0">+{selectedStudents.length - 4}</Badge>
                )}
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-6 bg-xianjin/15" />

          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0 text-amber-300">日期</Label>
            <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
              className="w-36 h-9 xian-input" />
          </div>

          <Separator orientation="vertical" className="h-6 bg-xianjin/15" />

          {/* Record type tabs */}
          <div className="flex items-center gap-1 bg-anye/60 rounded-lg p-0.5 border border-xianjin/10">
            <Button size="sm" variant={activeTab === 'typing' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'typing' ? 'xian-btn-gold' : 'text-amber-500 hover:bg-xianjin/10 hover:text-amber-300'}`}
              onClick={() => setActiveTab('typing')}>
              <Keyboard className="h-3.5 w-3.5" />{XIAN.typing}
            </Button>
            <Button size="sm" variant={activeTab === 'retry' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'retry' ? 'xian-btn-gold' : 'text-amber-500 hover:bg-xianjin/10 hover:text-amber-300'}`}
              onClick={() => setActiveTab('retry')}>
              <Swords className="h-3.5 w-3.5" />{XIAN.retry}
            </Button>
            <Button size="sm" variant={activeTab === 'homework' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'homework' ? 'xian-btn-gold' : 'text-amber-500 hover:bg-xianjin/10 hover:text-amber-300'}`}
              onClick={() => setActiveTab('homework')}>
              <BookOpen className="h-3.5 w-3.5" />{XIAN.homework}
            </Button>
          </div>

          {selectedStudentIds.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 bg-xianjin/15" />
              <Button size="sm" className="xian-btn-gold h-8" onClick={handleSaveAll}>
                <Save className="h-3.5 w-3.5 mr-1" />全部{XIAN.save}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content: Student rows */}
      <div className="flex-1 overflow-y-auto">
        {selectedStudentIds.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center xian-animate-in">
              <div className="w-16 h-16 rounded-full bg-amber-900/20 flex items-center justify-center mx-auto mb-4 border border-xianjin/20">
                <Users className="h-8 w-8 text-amber-700" />
              </div>
              <h3 className="text-lg font-medium text-amber-500 font-serif">请先选择{XIAN.student}</h3>
              <p className="text-sm text-amber-700 mt-2">点击上方「{XIAN.student}」下拉框选择一名或多名{XIAN.student}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-3 max-w-5xl">
            {selectedStudents.map((student) => {
              const isSaved = savedStudents.has(student.id);
              const isHistoryOpen = historyStudentId === student.id;

              return (
                <div key={student.id} className="xian-card rounded-xl xian-animate-in">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Student name */}
                      <div className="w-20 shrink-0 pt-1">
                        <button
                          className="text-sm font-semibold text-amber-300 hover:text-amber-200 hover:underline cursor-pointer text-left font-serif"
                          onClick={() => router.push(`/students/${student.id}`)}
                        >
                          {student.name}
                        </button>
                        {student.className && <p className="text-xs text-amber-700 mt-0.5">{student.className}</p>}
                      </div>

                      <Separator orientation="vertical" className="h-12 shrink-0 bg-xianjin/15" />

                      {/* Form fields */}
                      <div className="flex-1 min-w-0">
                        {activeTab === 'typing' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">{XIAN.speed}</Label>
                              <Input type="number"
                                placeholder={lastRecordHints[student.id]?.lastSpeed ? `上次${lastRecordHints[student.id].lastSpeed}` : '字/分'}
                                value={getTypingForm(student.id).speed}
                                onChange={(e) => updateTypingForm(student.id, 'speed', e.target.value)}
                                className="w-24 h-8 text-sm xian-input" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">{XIAN.accuracy}</Label>
                              <Input type="number"
                                placeholder={lastRecordHints[student.id]?.lastAccuracy ? `上次${lastRecordHints[student.id].lastAccuracy}%` : '%'}
                                min={0} max={100}
                                value={getTypingForm(student.id).accuracy}
                                onChange={(e) => updateTypingForm(student.id, 'accuracy', e.target.value)}
                                className="w-20 h-8 text-sm xian-input" />
                            </div>
                            {lastRecordHints[student.id]?.lastSpeed && (
                              <span className="text-[10px] xian-tag-xianjin px-1.5 py-0.5 rounded">
                                上次 {lastRecordHints[student.id].lastSpeed}字/分 / {lastRecordHints[student.id].lastAccuracy}%
                              </span>
                            )}
                          </div>
                        )}

                        {activeTab === 'retry' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">题目</Label>
                              {activeCourse && activeCourse.problems.length > 0 ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-48 h-8 text-sm xian-input justify-between">
                                      {getRetryForm(student.id).problemId ? (
                                        <span className="truncate text-amber-200">
                                          {activeCourse.problems.find(p => p.id === getRetryForm(student.id).problemId)?.name || '选择题目'}
                                        </span>
                                      ) : (
                                        <span className="text-amber-600">搜索题号/题目名</span>
                                      )}
                                      <ChevronDown className="h-3 w-3 text-amber-500 ml-1 shrink-0" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-0 bg-anye border-xianjin/20" align="start">
                                    <div className="p-2 border-b border-xianjin/10">
                                      <Input
                                        placeholder="输入题号或题目名搜索..."
                                        className="xian-input h-7 text-xs"
                                        value={problemSearch}
                                        onChange={(e) => setProblemSearch(e.target.value)}
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {activeCourse.problems
                                        .filter(p => {
                                          if (!problemSearch) return true;
                                          const search = problemSearch.toLowerCase();
                                          return p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search);
                                        })
                                        .map((p) => {
                                          const kpId = p.knowledgePointIds?.[0] || p.knowledgePointId;
                                          const kp = kpId ? activeCourse!.knowledgePoints.find((k) => k.id === kpId) : undefined;
                                          return (
                                            <div
                                              key={p.id}
                                              className={`px-3 py-2 text-xs cursor-pointer hover:bg-xianjin/10 transition-colors ${
                                                getRetryForm(student.id).problemId === p.id ? 'bg-xianjin/20 text-xianjin' : 'text-amber-200'
                                              }`}
                                              onClick={() => {
                                                updateRetryForm(student.id, 'problemId', p.id);
                                                setProblemSearch('');
                                              }}
                                            >
                                              <div className="font-medium">{p.name}</div>
                                              {kp && <div className="text-amber-600 text-[10px] mt-0.5">{kp.name}</div>}
                                            </div>
                                          );
                                        })}
                                      {activeCourse.problems.filter(p => {
                                        if (!problemSearch) return true;
                                        const search = problemSearch.toLowerCase();
                                        return p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search);
                                      }).length === 0 && (
                                        <div className="px-3 py-4 text-xs text-amber-600 text-center">未找到匹配的题目</div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-xs text-amber-700">请先添加题目</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">第几次</Label>
                              <Select value={getRetryForm(student.id).attempt}
                                onValueChange={(v) => updateRetryForm(student.id, 'attempt', v)}>
                                <SelectTrigger className="w-20 h-8 text-sm xian-input"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-anye border-xianjin/20">
                                  {[1,2,3,4,5].map((n) => (
                                    <SelectItem key={n} value={String(n)} className="text-amber-200 focus:bg-xianjin/10">第{n}次</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">耗时</Label>
                              <Input type="number" placeholder="分钟"
                                value={getRetryForm(student.id).timeSpent}
                                onChange={(e) => updateRetryForm(student.id, 'timeSpent', e.target.value)}
                                className="w-20 h-8 text-sm xian-input" />
                            </div>
                            {(() => {
                              const form = getRetryForm(student.id);
                              if (form.problemId && form.timeSpent && Number(form.attempt) > 1) {
                                const improvement = getRetryImprovement(form.problemId, Number(form.attempt), Number(form.timeSpent));
                                if (improvement !== null) {
                                  return (
                                    <Badge className={`text-xs border-0 ${improvement > 0 ? 'xian-tag-biyu' : 'xian-tag-zhusa'}`}>
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      {improvement > 0 ? '提升' : '延缓'} {Math.abs(improvement)}%
                                    </Badge>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {activeTab === 'homework' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">标题</Label>
                              <Input value={getHomeworkForm(student.id).title}
                                onChange={(e) => updateHomeworkForm(student.id, 'title', e.target.value)}
                                placeholder="作业标题" className="w-32 h-8 text-sm xian-input" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">内容</Label>
                              <Input value={getHomeworkForm(student.id).content}
                                onChange={(e) => updateHomeworkForm(student.id, 'content', e.target.value)}
                                placeholder="完成情况" className="w-36 h-8 text-sm xian-input" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">评分</Label>
                              <Input type="number" placeholder="分"
                                value={getHomeworkForm(student.id).score}
                                onChange={(e) => updateHomeworkForm(student.id, 'score', e.target.value)}
                                className="w-16 h-8 text-sm xian-input" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-amber-500 shrink-0">点评</Label>
                              <Input value={getHomeworkForm(student.id).comment}
                                onChange={(e) => updateHomeworkForm(student.id, 'comment', e.target.value)}
                                placeholder="老师点评" className="w-28 h-8 text-sm xian-input" />
                            </div>
                          </div>
                        )}

                        {/* Teacher feedback tags */}
                        <div className="mt-2 pt-2 border-t border-xianjin/10 space-y-1.5">
                          {/* Praise tags */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-emerald-500 shrink-0 w-8">点赞</span>
                            {PRESET_STRENGTHS.map((tag) => {
                              const form = activeTab === 'typing' ? getTypingForm(student.id) : activeTab === 'retry' ? getRetryForm(student.id) : getHomeworkForm(student.id);
                              const tags = form.praiseTags;
                              const isSelected = tags.includes(tag);
                              return (
                                <button key={tag} type="button"
                                  className={`px-1.5 py-0 rounded text-[10px] leading-tight transition-colors ${
                                    isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-900/20 text-emerald-600 hover:bg-emerald-900/40 border border-emerald-800/30'
                                  }`}
                                  onClick={() => {
                                    const newTags = isSelected ? tags.filter((t: string) => t !== tag) : [...tags, tag];
                                    if (activeTab === 'typing') setTypingForms((prev) => ({ ...prev, [student.id]: { ...getTypingForm(student.id), praiseTags: newTags } }));
                                    else if (activeTab === 'retry') setRetryForms((prev) => ({ ...prev, [student.id]: { ...getRetryForm(student.id), praiseTags: newTags } }));
                                    else setHomeworkForms((prev) => ({ ...prev, [student.id]: { ...getHomeworkForm(student.id), praiseTags: newTags } }));
                                  }}>
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                          {/* Improve tags */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-orange-500 shrink-0 w-8">待提升</span>
                            {PRESET_IMPROVEMENTS.map((tag) => {
                              const form = activeTab === 'typing' ? getTypingForm(student.id) : activeTab === 'retry' ? getRetryForm(student.id) : getHomeworkForm(student.id);
                              const tags = form.improveTags;
                              const isSelected = tags.includes(tag);
                              return (
                                <button key={tag} type="button"
                                  className={`px-1.5 py-0 rounded text-[10px] leading-tight transition-colors ${
                                    isSelected ? 'bg-orange-600 text-white' : 'bg-orange-900/20 text-orange-600 hover:bg-orange-900/40 border border-orange-800/30'
                                  }`}
                                  onClick={() => {
                                    const newTags = isSelected ? tags.filter((t: string) => t !== tag) : [...tags, tag];
                                    if (activeTab === 'typing') setTypingForms((prev) => ({ ...prev, [student.id]: { ...getTypingForm(student.id), improveTags: newTags } }));
                                    else if (activeTab === 'retry') setRetryForms((prev) => ({ ...prev, [student.id]: { ...getRetryForm(student.id), improveTags: newTags } }));
                                    else setHomeworkForms((prev) => ({ ...prev, [student.id]: { ...getHomeworkForm(student.id), improveTags: newTags } }));
                                  }}>
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                          {/* Growth suggestions (only for retry and homework) */}
                          {activeTab !== 'typing' && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] text-blue-500 shrink-0 w-8">建议</span>
                              {GROWTH_SUGGESTION_PRESETS.map((sug) => {
                                const form = activeTab === 'retry' ? getRetryForm(student.id) : getHomeworkForm(student.id);
                                const sugs = form.growthSuggestions;
                                const isSelected = sugs.includes(sug);
                                return (
                                  <button key={sug} type="button"
                                    className={`px-1.5 py-0 rounded text-[10px] leading-tight transition-colors ${
                                      isSelected ? 'bg-blue-600 text-white' : 'bg-blue-900/20 text-blue-600 hover:bg-blue-900/40 border border-blue-800/30'
                                    }`}
                                    onClick={() => {
                                      const newSugs = isSelected ? sugs.filter((s: string) => s !== sug) : [...sugs, sug];
                                      if (activeTab === 'retry') setRetryForms((prev) => ({ ...prev, [student.id]: { ...getRetryForm(student.id), growthSuggestions: newSugs } }));
                                      else setHomeworkForms((prev) => ({ ...prev, [student.id]: { ...getHomeworkForm(student.id), growthSuggestions: newSugs } }));
                                    }}>
                                    {sug}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-xianjin/10"
                          onClick={() => loadHistory(student.id)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className={`h-8 ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'xian-btn-gold'}`}
                          onClick={() => handleSaveStudent(student.id)}>
                          {isSaved ? <Check className="h-3.5 w-3.5 mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                          {isSaved ? '已保存' : XIAN.save}
                        </Button>
                      </div>
                    </div>

                    {/* History panel */}
                    {isHistoryOpen && (
                      <div className="mt-3 pt-3 border-t border-xianjin/10">
                        <h4 className="text-xs font-medium text-amber-400 mb-2">{XIAN.history}</h4>
                        <div className="space-y-1.5">
                          {historyRecords.typing.length === 0 && historyRecords.retry.length === 0 && historyRecords.homework.length === 0 ? (
                            <p className="text-xs text-amber-700">暂无修炼记录</p>
                          ) : (
                            <>
                              {historyRecords.typing.map((r) => (
                                <div key={r.id} className="text-xs text-amber-500 flex items-center gap-2">
                                  <span className="xian-tag-xianjin px-1 rounded text-[10px]">速度</span>
                                  <span>{r.date}</span>
                                  <span>{r.speed}字/分</span>
                                  <span>{r.accuracy}%</span>
                                </div>
                              ))}
                              {historyRecords.retry.map((r) => (
                                <div key={r.id} className="text-xs text-amber-500 flex items-center gap-2">
                                  <span className="xian-tag-liuli px-1 rounded text-[10px]">三刷</span>
                                  <span>{r.date}</span>
                                  <span>{r.problemName}</span>
                                  <span>第{r.attempt}次 {r.timeSpent}分</span>
                                </div>
                              ))}
                              {historyRecords.homework.map((r) => (
                                <div key={r.id} className="text-xs text-amber-500 flex items-center gap-2">
                                  <span className="xian-tag-zixia px-1 rounded text-[10px]">日志</span>
                                  <span>{r.date}</span>
                                  <span>{r.title}{r.score ? ` (${r.score}分)` : ''}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="bg-anye border-xianjin/20">
          <DialogHeader>
            <DialogTitle className="xian-text-gold font-serif">{XIAN.addStudent}</DialogTitle>
            <DialogDescription className="text-amber-600">收入新{XIAN.student}入门下</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-amber-300">{XIAN.student}姓名</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="输入姓名" className="xian-input mt-1" /></div>
            <div><Label className="text-amber-300">班级/门派</Label><Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="如：入门班" className="xian-input mt-1" /></div>
            <div><Label className="text-amber-300">备注</Label><Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="备注信息" className="xian-input mt-1" /></div>
            <Button className="w-full xian-btn-gold" onClick={handleAddStudent} disabled={!newName.trim()}>确认收入门下</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-anye border-xianjin/20">
          <DialogHeader>
            <DialogTitle className="xian-text-gold font-serif">{XIAN.importCSV}</DialogTitle>
            <DialogDescription className="text-amber-600">每行一名{XIAN.student}，格式：姓名,班级,备注</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'张三,入门班\n李四,进阶班\n王五'} className="xian-input min-h-[120px]" />
            <Button className="w-full xian-btn-gold" onClick={handleImport} disabled={!importText.trim()}>确认收入</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
