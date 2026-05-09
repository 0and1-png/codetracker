'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Upload,
  Search,
  Trash2,
  FileText,
  Code2,
  Settings,
  Users,
  Check,
  Keyboard,
  RotateCcw,
  BookOpen,
  Save,
  X,
  TrendingUp,
  ChevronDown,
  History,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Student, Course, TypingRecord, ProblemRetryRecord, HomeworkRecord } from '@/lib/types';
import {
  getCourses,
  getStudentsByCourse,
  addStudent,
  deleteStudent,
  addTypingRecord,
  addRetryRecord,
  addHomeworkRecord,
  getRetryRecords,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
} from '@/lib/store';

type RecordTab = 'typing' | 'retry' | 'homework';

interface TypingForm { speed: string; accuracy: string }
interface RetryForm { problemId: string; attempt: string; timeSpent: string; notes: string }
interface HomeworkForm { title: string; content: string; score: string; comment: string; imageUrl: string }

export default function HomePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Dialogs
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Add student form
  const [newName, setNewName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  // Record tab
  const [activeTab, setActiveTab] = useState<RecordTab>('typing');
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Per-student form data
  const [typingForms, setTypingForms] = useState<Record<string, TypingForm>>({});
  const [retryForms, setRetryForms] = useState<Record<string, RetryForm>>({});
  const [homeworkForms, setHomeworkForms] = useState<Record<string, HomeworkForm>>({});

  // Save states per student
  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());

  // History view
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<{ typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] }>({ typing: [], retry: [], homework: [] });

  const loadData = useCallback(() => {
    const courseList = getCourses();
    setCourses(courseList);
    if (courseList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courseList[0].id);
    }
  }, [selectedCourseId]);

  const loadStudents = useCallback(() => {
    if (!selectedCourseId) return;
    setCourseStudents(getStudentsByCourse(selectedCourseId));
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

  // Student selection
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
      // Clean up form data for removed students
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

  // Form helpers
  const getTypingForm = (id: string): TypingForm => typingForms[id] || { speed: '', accuracy: '' };
  const getRetryForm = (id: string): RetryForm => retryForms[id] || { problemId: '', attempt: '1', timeSpent: '', notes: '' };
  const getHomeworkForm = (id: string): HomeworkForm => homeworkForms[id] || { title: '', content: '', score: '', comment: '', imageUrl: '' };

  const updateTypingForm = (id: string, field: keyof TypingForm, value: string) => {
    setTypingForms((prev) => ({ ...prev, [id]: { ...getTypingForm(id), [field]: value } }));
  };
  const updateRetryForm = (id: string, field: keyof RetryForm, value: string) => {
    setRetryForms((prev) => ({ ...prev, [id]: { ...getRetryForm(id), [field]: value } }));
  };
  const updateHomeworkForm = (id: string, field: keyof HomeworkForm, value: string) => {
    setHomeworkForms((prev) => ({ ...prev, [id]: { ...getHomeworkForm(id), [field]: value } }));
  };

  // Add student
  const handleAddStudent = () => {
    if (!newName.trim() || !selectedCourseId) return;
    addStudent({
      id: uuidv4(),
      name: newName.trim(),
      courseId: selectedCourseId,
      className: newClassName.trim() || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewName('');
    setNewClassName('');
    setNewNotes('');
    setAddStudentOpen(false);
    loadStudents();
  };

  // Import students
  const handleImport = () => {
    if (!importText.trim() || !selectedCourseId) return;
    const result = Papa.parse(importText.trim(), { header: false, skipEmptyLines: true });
    const rows = result.data as string[][];
    for (const row of rows) {
      const name = (row[0] || '').trim();
      if (!name) continue;
      addStudent({
        id: uuidv4(),
        name,
        courseId: selectedCourseId,
        className: (row[1] || '').trim() || undefined,
        notes: (row[2] || '').trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }
    setImportText('');
    setImportOpen(false);
    loadStudents();
  };

  // Delete student
  const handleDelete = (id: string) => {
    deleteStudent(id);
    setSelectedStudentIds((prev) => prev.filter((sid) => sid !== id));
    loadStudents();
  };

  // Save record for a single student
  const handleSaveStudent = (studentId: string) => {
    if (activeTab === 'typing') {
      const form = getTypingForm(studentId);
      if (!form.speed) return;
      const record: TypingRecord = {
        id: uuidv4(),
        studentId,
        courseId: selectedCourseId,
        date: recordDate,
        speed: Number(form.speed),
        accuracy: Number(form.accuracy) || 0,
      };
      addTypingRecord(record);
    } else if (activeTab === 'retry') {
      const form = getRetryForm(studentId);
      if (!form.problemId || !form.timeSpent) return;
      const problem = activeCourse?.problems.find((p) => p.id === form.problemId);
      const record: ProblemRetryRecord = {
        id: uuidv4(),
        studentId,
        courseId: selectedCourseId,
        date: recordDate,
        problemId: form.problemId,
        problemName: problem?.name || '',
        attempt: Number(form.attempt) || 1,
        timeSpent: Number(form.timeSpent),
        notes: form.notes.trim() || undefined,
      };
      addRetryRecord(record);
    } else if (activeTab === 'homework') {
      const form = getHomeworkForm(studentId);
      if (!form.title.trim()) return;
      const record: HomeworkRecord = {
        id: uuidv4(),
        studentId,
        courseId: selectedCourseId,
        date: recordDate,
        title: form.title.trim(),
        content: form.content.trim(),
        score: form.score ? Number(form.score) : undefined,
        comment: form.comment.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };
      addHomeworkRecord(record);
    }

    setSavedStudents((prev) => new Set(prev).add(studentId));
    setTimeout(() => {
      setSavedStudents((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }, 2000);
  };

  // Save all students
  const handleSaveAll = () => {
    for (const studentId of selectedStudentIds) {
      handleSaveStudent(studentId);
    }
  };

  // Calculate retry improvement
  const getRetryImprovement = (problemId: string, attempt: number, currentTime: number): number | null => {
    const allRetries = getRetryRecords();
    const prev = allRetries.find(
      (r) => r.problemId === problemId && r.attempt === attempt - 1
    );
    if (prev) {
      return Math.round(((prev.timeSpent - currentTime) / prev.timeSpent) * 100);
    }
    return null;
  };

  // Load history for a student
  const loadHistory = (studentId: string) => {
    if (historyStudentId === studentId) {
      setHistoryStudentId(null);
      return;
    }
    setHistoryStudentId(studentId);
    setHistoryRecords({
      typing: getTypingByStudent(studentId).slice(-5).reverse(),
      retry: getRetryByStudent(studentId).slice(-5).reverse(),
      homework: getHomeworkByStudent(studentId).slice(-5).reverse(),
    });
  };

  const filteredStudents = courseStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudents = courseStudents.filter((s) => selectedStudentIds.includes(s.id));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                CodeTracker
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="选择课程" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/courses">
              <Button size="sm" variant="outline" className="border-violet-200 text-violet-600">
                <Settings className="h-4 w-4 mr-1" />课程管理
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="border-violet-200 text-violet-600" onClick={() => setAddStudentOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />添加学生
            </Button>
            <Button size="sm" variant="outline" className="border-violet-200 text-violet-600" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />批量导入
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar: Student selector + Date + Tab */}
      <div className="sticky top-[57px] z-40 bg-white border-b border-purple-100 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Student multi-select dropdown */}
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0 text-foreground font-medium">学生</Label>
            <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between h-9 border-violet-200">
                  <span className="truncate">
                    {selectedStudentIds.length === 0
                      ? '点击选择学生...'
                      : `已选 ${selectedStudentIds.length} 名学生`}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索学生..."
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="p-1 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-violet-600 justify-start"
                    onClick={selectAllStudents}
                  >
                    {selectedStudentIds.length === courseStudents.length ? '取消全选' : '全选'}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">暂无学生</div>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1 ${
                            isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleStudent(student.id)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{student.name}</p>
                            {student.className && (
                              <p className="text-xs text-muted-foreground truncate">{student.className}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => router.push(`/students/${student.id}`)}
                            >
                              <FileText className="h-3 w-3 text-violet-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除学生「{student.name}」吗？所有相关记录也将被删除。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-red-500 hover:bg-red-600">
                                    删除
                                  </AlertDialogAction>
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
                  <Badge key={s.id} className="bg-violet-100 text-violet-700 border-0 gap-1 pr-1">
                    {s.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => toggleStudent(s.id)}
                    />
                  </Badge>
                ))}
                {selectedStudents.length > 4 && (
                  <Badge className="bg-violet-50 text-violet-500 border-0">
                    +{selectedStudents.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Date */}
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0">日期</Label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-36 h-9"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Record type tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={activeTab === 'typing' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'typing' ? 'bg-violet-500 hover:bg-violet-600' : 'hover:bg-gray-200'}`}
              onClick={() => setActiveTab('typing')}
            >
              <Keyboard className="h-3.5 w-3.5" />
              打字记录
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'retry' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'retry' ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-gray-200'}`}
              onClick={() => setActiveTab('retry')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              三刷记录
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'homework' ? 'default' : 'ghost'}
              className={`h-8 text-xs gap-1 ${activeTab === 'homework' ? 'bg-emerald-500 hover:bg-emerald-600' : 'hover:bg-gray-200'}`}
              onClick={() => setActiveTab('homework')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              作业记录
            </Button>
          </div>

          {/* Save all */}
          {selectedStudentIds.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 h-8" onClick={handleSaveAll}>
                <Save className="h-3.5 w-3.5 mr-1" />
                全部保存
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content: Student rows */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {selectedStudentIds.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-violet-300" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">请先选择学生</h3>
              <p className="text-sm text-muted-foreground">点击上方「学生」下拉框选择一个或多个学生</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-3 max-w-5xl">
            {selectedStudents.map((student) => {
              const isSaved = savedStudents.has(student.id);
              const isHistoryOpen = historyStudentId === student.id;

              return (
                <Card key={student.id} className={`border transition-colors ${
                  activeTab === 'typing' ? 'border-purple-100' :
                  activeTab === 'retry' ? 'border-amber-100' :
                  'border-emerald-100'
                }`}>
                  <CardContent className="p-4">
                    {/* Student row: Name + Fields + Actions */}
                    <div className="flex items-start gap-4">
                      {/* Student name column */}
                      <div className="w-20 shrink-0 pt-1">
                        <button
                          className="text-sm font-semibold text-violet-700 hover:text-violet-900 hover:underline cursor-pointer text-left"
                          onClick={() => router.push(`/students/${student.id}`)}
                        >
                          {student.name}
                        </button>
                        {student.className && (
                          <p className="text-xs text-muted-foreground mt-0.5">{student.className}</p>
                        )}
                      </div>

                      <Separator orientation="vertical" className="h-12 shrink-0" />

                      {/* Form fields - based on active tab */}
                      <div className="flex-1 min-w-0">
                        {activeTab === 'typing' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">打字速度</Label>
                              <Input
                                type="number"
                                placeholder="字/分"
                                value={getTypingForm(student.id).speed}
                                onChange={(e) => updateTypingForm(student.id, 'speed', e.target.value)}
                                className="w-24 h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">正确率</Label>
                              <Input
                                type="number"
                                placeholder="%"
                                min={0}
                                max={100}
                                value={getTypingForm(student.id).accuracy}
                                onChange={(e) => updateTypingForm(student.id, 'accuracy', e.target.value)}
                                className="w-20 h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {activeTab === 'retry' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">题目</Label>
                              {activeCourse && activeCourse.problems.length > 0 ? (
                                <Select
                                  value={getRetryForm(student.id).problemId}
                                  onValueChange={(v) => updateRetryForm(student.id, 'problemId', v)}
                                >
                                  <SelectTrigger className="w-40 h-8 text-sm">
                                    <SelectValue placeholder="选择题目" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activeCourse.problems.map((p) => {
                                      const kp = activeCourse.knowledgePoints.find((k) => k.id === p.knowledgePointId);
                                      return (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}{kp ? ` (${kp.name})` : ''}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">请先添加题目</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">第几次</Label>
                              <Select
                                value={getRetryForm(student.id).attempt}
                                onValueChange={(v) => updateRetryForm(student.id, 'attempt', v)}
                              >
                                <SelectTrigger className="w-20 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">第1次</SelectItem>
                                  <SelectItem value="2">第2次</SelectItem>
                                  <SelectItem value="3">第3次</SelectItem>
                                  <SelectItem value="4">第4次</SelectItem>
                                  <SelectItem value="5">第5次</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">耗时</Label>
                              <Input
                                type="number"
                                placeholder="分钟"
                                value={getRetryForm(student.id).timeSpent}
                                onChange={(e) => updateRetryForm(student.id, 'timeSpent', e.target.value)}
                                className="w-20 h-8 text-sm"
                              />
                            </div>
                            {/* Improvement indicator */}
                            {(() => {
                              const form = getRetryForm(student.id);
                              if (form.problemId && form.timeSpent && Number(form.attempt) > 1) {
                                const improvement = getRetryImprovement(form.problemId, Number(form.attempt), Number(form.timeSpent));
                                if (improvement !== null) {
                                  return (
                                    <Badge className={`text-xs ${improvement > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} border-0`}>
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      {improvement > 0 ? '快' : '慢'} {Math.abs(improvement)}%
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
                              <Label className="text-xs text-muted-foreground shrink-0">标题</Label>
                              <Input
                                value={getHomeworkForm(student.id).title}
                                onChange={(e) => updateHomeworkForm(student.id, 'title', e.target.value)}
                                placeholder="作业标题"
                                className="w-32 h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">内容</Label>
                              <Input
                                value={getHomeworkForm(student.id).content}
                                onChange={(e) => updateHomeworkForm(student.id, 'content', e.target.value)}
                                placeholder="完成情况"
                                className="w-36 h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">评分</Label>
                              <Input
                                type="number"
                                placeholder="分"
                                value={getHomeworkForm(student.id).score}
                                onChange={(e) => updateHomeworkForm(student.id, 'score', e.target.value)}
                                className="w-16 h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0">点评</Label>
                              <Input
                                value={getHomeworkForm(student.id).comment}
                                onChange={(e) => updateHomeworkForm(student.id, 'comment', e.target.value)}
                                placeholder="教师点评"
                                className="w-36 h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions column */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => loadHistory(student.id)}
                          title="查看历史"
                        >
                          <History className={`h-4 w-4 ${isHistoryOpen ? 'text-violet-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          size="sm"
                          className={`h-8 text-xs ${
                            isSaved
                              ? 'bg-emerald-500 hover:bg-emerald-500'
                              : activeTab === 'typing' ? 'bg-violet-600 hover:bg-violet-700' :
                                activeTab === 'retry' ? 'bg-amber-500 hover:bg-amber-600' :
                                'bg-emerald-500 hover:bg-emerald-600'
                          }`}
                          onClick={() => handleSaveStudent(student.id)}
                          disabled={isSaved}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* History section (expandable) */}
                    {isHistoryOpen && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-muted-foreground mb-2">最近记录</p>
                        {historyRecords.typing.length === 0 && historyRecords.retry.length === 0 && historyRecords.homework.length === 0 ? (
                          <p className="text-xs text-muted-foreground">暂无记录</p>
                        ) : (
                          <div className="space-y-2">
                            {historyRecords.typing.map((r) => (
                              <div key={r.id} className="flex items-center gap-3 text-xs bg-violet-50 rounded-lg px-3 py-2">
                                <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">打字</Badge>
                                <span>{r.date}</span>
                                <span>速度 {r.speed}字/分</span>
                                <span>正确率 {r.accuracy}%</span>
                              </div>
                            ))}
                            {historyRecords.retry.map((r) => (
                              <div key={r.id} className="flex items-center gap-3 text-xs bg-amber-50 rounded-lg px-3 py-2">
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">三刷</Badge>
                                <span>{r.date}</span>
                                <span>{r.problemName}</span>
                                <span>第{r.attempt}次</span>
                                <span>{r.timeSpent}分钟</span>
                                {r.attempt > 1 && (() => {
                                  const imp = getRetryImprovement(r.problemId, r.attempt, r.timeSpent);
                                  if (imp === null) return null;
                                  return (
                                    <span className={imp > 0 ? 'text-emerald-600' : 'text-red-500'}>
                                      {imp > 0 ? '↑' : '↓'}{Math.abs(imp)}%
                                    </span>
                                  );
                                })()}
                              </div>
                            ))}
                            {historyRecords.homework.map((r) => (
                              <div key={r.id} className="flex items-center gap-3 text-xs bg-emerald-50 rounded-lg px-3 py-2">
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">作业</Badge>
                                <span>{r.date}</span>
                                <span>{r.title}</span>
                                {r.score !== undefined && <span>{r.score}分</span>}
                                {r.comment && <span className="text-muted-foreground truncate max-w-32">{r.comment}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加学生</DialogTitle>
            <DialogDescription>添加学生到当前课程「{activeCourse?.name}」</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>姓名 *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="学生姓名" />
            </div>
            <div>
              <Label>班级</Label>
              <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="如：三年级A班" />
            </div>
            <div>
              <Label>备注</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="其他备注信息" rows={2} />
            </div>
            <Button onClick={handleAddStudent} className="w-full bg-violet-600 hover:bg-violet-700">确认添加</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量导入学生</DialogTitle>
            <DialogDescription>导入学生到当前课程「{activeCourse?.name}」</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>粘贴学生名单</Label>
              <p className="text-xs text-muted-foreground mb-2">
                每行一个学生，格式：姓名,班级,备注（逗号分隔，班级/备注可选）
              </p>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`张小明,三年级A班\n李小红,三年级B班\n王大伟,,转学新生`}
                rows={8}
              />
            </div>
            <Button onClick={handleImport} className="w-full bg-violet-600 hover:bg-violet-700">导入</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
