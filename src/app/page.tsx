'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronUp,
  Keyboard,
  RotateCcw,
  BookOpen,
  Save,
  X,
  TrendingUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CourseManager } from '@/components/course-manager';
import { StarRating } from '@/components/star-rating';
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
} from '@/lib/store';

type RecordTab = 'typing' | 'retry' | 'homework';

export default function HomePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Dialogs
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [courseManagerOpen, setCourseManagerOpen] = useState(false);

  // Add student form
  const [newName, setNewName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  // Record tabs
  const [activeTab, setActiveTab] = useState<RecordTab>('typing');
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Typing form
  const [typingSpeed, setTypingSpeed] = useState('');
  const [typingAccuracy, setTypingAccuracy] = useState('');

  // Retry form
  const [retryProblemId, setRetryProblemId] = useState('');
  const [retryAttempt, setRetryAttempt] = useState('1');
  const [retryTimeSpent, setRetryTimeSpent] = useState('');
  const [retryNotes, setRetryNotes] = useState('');

  // Homework form
  const [hwTitle, setHwTitle] = useState('');
  const [hwContent, setHwContent] = useState('');
  const [hwScore, setHwScore] = useState('');
  const [hwComment, setHwComment] = useState('');
  const [hwImageUrl, setHwImageUrl] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents, selectedCourseId]);

  // When course changes, clear selected students
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]);
  };

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

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

  // Toggle student selection
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === courseStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(courseStudents.map((s) => s.id));
    }
  };

  // Save records for all selected students
  const handleSave = () => {
    if (selectedStudentIds.length === 0) return;

    for (const studentId of selectedStudentIds) {
      if (activeTab === 'typing') {
        if (!typingSpeed) continue;
        const record: TypingRecord = {
          id: uuidv4(),
          studentId,
          courseId: selectedCourseId,
          date: recordDate,
          speed: Number(typingSpeed),
          accuracy: Number(typingAccuracy) || 0,
        };
        addTypingRecord(record);
      } else if (activeTab === 'retry') {
        if (!retryProblemId || !retryTimeSpent) continue;
        const problem = activeCourse?.problems.find((p) => p.id === retryProblemId);
        const record: ProblemRetryRecord = {
          id: uuidv4(),
          studentId,
          courseId: selectedCourseId,
          date: recordDate,
          problemId: retryProblemId,
          problemName: problem?.name || '',
          attempt: Number(retryAttempt) || 1,
          timeSpent: Number(retryTimeSpent),
          notes: retryNotes.trim() || undefined,
        };
        addRetryRecord(record);
      } else if (activeTab === 'homework') {
        if (!hwTitle.trim()) continue;
        const record: HomeworkRecord = {
          id: uuidv4(),
          studentId,
          courseId: selectedCourseId,
          date: recordDate,
          title: hwTitle.trim(),
          content: hwContent.trim(),
          score: hwScore ? Number(hwScore) : undefined,
          comment: hwComment.trim() || undefined,
          imageUrl: hwImageUrl.trim() || undefined,
        };
        addHomeworkRecord(record);
      }
    }

    // Show success
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    // Reset forms
    resetForm();
  };

  const resetForm = () => {
    setTypingSpeed('');
    setTypingAccuracy('');
    setRetryProblemId('');
    setRetryAttempt('1');
    setRetryTimeSpent('');
    setRetryNotes('');
    setHwTitle('');
    setHwContent('');
    setHwScore('');
    setHwComment('');
    setHwImageUrl('');
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
            {/* Course selector */}
            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="选择课程" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600"
              onClick={() => setCourseManagerOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              课程管理
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600"
              onClick={() => setAddStudentOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加学生
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              批量导入
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workbench */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Students */}
        <div className="w-72 border-r border-purple-100 bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-purple-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet-500" />
                学生列表
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-violet-600"
                onClick={selectAllStudents}
              >
                {selectedStudentIds.length === courseStudents.length ? '取消全选' : '全选'}
              </Button>
            </div>
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

          {/* Student list */}
          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {courseStudents.length === 0 ? '暂无学生，请先添加' : '没有匹配的学生'}
              </div>
            ) : (
              <div className="py-1">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-violet-50 border-l-2 border-violet-500'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-violet-500 text-white'
                            : 'bg-gradient-to-br from-violet-300 to-indigo-400 text-white'
                        }`}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {student.name}
                        </p>
                        {student.className && (
                          <p className="text-xs text-muted-foreground truncate">
                            {student.className}
                          </p>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/students/${student.id}`);
                          }}
                        >
                          <FileText className="h-3 w-3 text-violet-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                              <AlertDialogAction
                                onClick={() => handleDelete(student.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected summary */}
          {selectedStudentIds.length > 0 && (
            <div className="p-3 border-t border-purple-50 bg-violet-50/50">
              <p className="text-xs text-violet-600 font-medium">
                已选择 {selectedStudentIds.length} 名学生
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedStudents.slice(0, 5).map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 bg-white rounded-full px-2 py-0.5 text-xs border border-violet-100"
                  >
                    {s.name}
                    <X
                      className="h-2.5 w-2.5 text-gray-400 hover:text-red-400 cursor-pointer"
                      onClick={() => toggleStudent(s.id)}
                    />
                  </span>
                ))}
                {selectedStudents.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedStudents.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Record Forms */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {selectedStudentIds.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-violet-300" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  请先选择学生
                </h3>
                <p className="text-sm text-muted-foreground">
                  从左侧列表中选择一个或多个学生开始记录
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl">
              {/* Selected students bar */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">正在为以下学生记录：</span>
                {selectedStudents.map((s) => (
                  <Badge
                    key={s.id}
                    className="bg-violet-100 text-violet-700 border-0"
                  >
                    {s.name}
                  </Badge>
                ))}
              </div>

              {/* Date */}
              <div className="mb-4 flex items-center gap-3">
                <Label className="text-sm shrink-0">日期</Label>
                <Input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-44 h-9"
                />
              </div>

              {/* Record Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RecordTab)}>
                <TabsList className="bg-white border border-purple-100">
                  <TabsTrigger value="typing" className="gap-1.5 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
                    <Keyboard className="h-4 w-4" />
                    打字记录
                  </TabsTrigger>
                  <TabsTrigger value="retry" className="gap-1.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                    <RotateCcw className="h-4 w-4" />
                    三刷记录
                  </TabsTrigger>
                  <TabsTrigger value="homework" className="gap-1.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                    <BookOpen className="h-4 w-4" />
                    作业记录
                  </TabsTrigger>
                </TabsList>

                {/* Typing Tab */}
                <TabsContent value="typing" className="mt-4">
                  <Card className="border-purple-50">
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <Keyboard className="h-5 w-5 text-violet-500" />
                        打字练习记录
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>打字速度（字/分钟）</Label>
                          <Input
                            type="number"
                            placeholder="如：25"
                            value={typingSpeed}
                            onChange={(e) => setTypingSpeed(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>正确率（%）</Label>
                          <Input
                            type="number"
                            placeholder="如：95"
                            min={0}
                            max={100}
                            value={typingAccuracy}
                            onChange={(e) => setTypingAccuracy(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        记录将同时保存给已选的 {selectedStudentIds.length} 名学生
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Retry Tab */}
                <TabsContent value="retry" className="mt-4">
                  <Card className="border-amber-50">
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-amber-500" />
                        三刷练习记录
                      </h3>

                      {/* Problem selector */}
                      <div>
                        <Label>选择题目</Label>
                        {activeCourse && activeCourse.problems.length > 0 ? (
                          <Select value={retryProblemId} onValueChange={setRetryProblemId}>
                            <SelectTrigger>
                              <SelectValue placeholder="下拉选择课程题目" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCourse.problems.map((p) => {
                                const kp = activeCourse.knowledgePoints.find(
                                  (k) => k.id === p.knowledgePointId
                                );
                                return (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                    {kp ? ` (${kp.name})` : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-muted-foreground bg-amber-50 rounded-lg p-3">
                            当前课程暂无自定义题目，请先在「课程管理」中添加题目
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>第几次做</Label>
                          <Select value={retryAttempt} onValueChange={setRetryAttempt}>
                            <SelectTrigger>
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
                        <div>
                          <Label>本次耗时（分钟）</Label>
                          <Input
                            type="number"
                            placeholder="如：15"
                            value={retryTimeSpent}
                            onChange={(e) => setRetryTimeSpent(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Improvement preview */}
                      {retryProblemId && retryTimeSpent && Number(retryAttempt) > 1 && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            进步对比
                          </p>
                          {(() => {
                            const improvement = getRetryImprovement(
                              retryProblemId,
                              Number(retryAttempt),
                              Number(retryTimeSpent)
                            );
                            if (improvement !== null) {
                              return (
                                <p className={`text-lg font-bold mt-1 ${improvement > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  比上次{improvement > 0 ? '快' : '慢'}了 {Math.abs(improvement)}%
                                </p>
                              );
                            }
                            return (
                              <p className="text-sm text-muted-foreground mt-1">
                                暂无上次记录，无法对比
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      <div>
                        <Label>备注</Label>
                        <Textarea
                          value={retryNotes}
                          onChange={(e) => setRetryNotes(e.target.value)}
                          placeholder="补充说明..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Homework Tab */}
                <TabsContent value="homework" className="mt-4">
                  <Card className="border-emerald-50">
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-emerald-500" />
                        作业记录
                      </h3>
                      <div>
                        <Label>作业标题</Label>
                        <Input
                          value={hwTitle}
                          onChange={(e) => setHwTitle(e.target.value)}
                          placeholder="如：循环结构练习"
                        />
                      </div>
                      <div>
                        <Label>作业内容</Label>
                        <Textarea
                          value={hwContent}
                          onChange={(e) => setHwContent(e.target.value)}
                          placeholder="描述作业完成情况..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>评分（可选）</Label>
                          <Input
                            type="number"
                            placeholder="如：90"
                            min={0}
                            max={100}
                            value={hwScore}
                            onChange={(e) => setHwScore(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>作品图片URL（可选）</Label>
                          <Input
                            value={hwImageUrl}
                            onChange={(e) => setHwImageUrl(e.target.value)}
                            placeholder="粘贴图片链接"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>教师点评</Label>
                        <Textarea
                          value={hwComment}
                          onChange={(e) => setHwComment(e.target.value)}
                          placeholder="对作业的点评..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save button */}
              <div className="mt-6 flex items-center gap-3">
                <Button
                  className="bg-violet-600 hover:bg-violet-700 flex-1"
                  size="lg"
                  onClick={handleSave}
                  disabled={saveSuccess}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      保存成功
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      保存记录（{selectedStudentIds.length}名学生）
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  清空表单
                </Button>
              </div>
            </div>
          )}
        </div>
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
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="学生姓名"
              />
            </div>
            <div>
              <Label>班级</Label>
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="如：三年级A班"
              />
            </div>
            <div>
              <Label>备注</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="其他备注信息"
                rows={2}
              />
            </div>
            <Button
              onClick={handleAddStudent}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              确认添加
            </Button>
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
            <Button
              onClick={handleImport}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Manager */}
      <CourseManager
        open={courseManagerOpen}
        onOpenChange={setCourseManagerOpen}
        onCoursesChange={() => {
          loadData();
        }}
      />
    </div>
  );
}
