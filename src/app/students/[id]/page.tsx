'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Clock,
  Zap,
  Target,
  Image as ImageIcon,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { StarRating } from '@/components/star-rating';
import { TagSelector } from '@/components/tag-selector';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import type { Student, LearningRecord, KnowledgePoint, KnowledgeStatus } from '@/lib/types';
import {
  getStudents,
  getRecordsByStudent,
  addRecord,
  deleteRecord,
  getKnowledgeByStudent,
  upsertKnowledge,
} from '@/lib/store';
import {
  PRESET_STRENGTHS,
  PRESET_IMPROVEMENTS,
  KNOWLEDGE_STATUS_LABELS,
  KNOWLEDGE_STATUS_COLORS,
} from '@/lib/constants';

const emptyRecord = (): Omit<LearningRecord, 'id' | 'studentId'> => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  strengths: [],
  improvements: [],
  customStrengths: [],
  customImprovements: [],
  typingSpeed: undefined,
  accuracy: undefined,
  problemRetries: [],
  works: [],
  behavior: { focus: 3, attendance: 5 },
  notes: '',
});

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgePoint[]>([]);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [form, setForm] = useState(emptyRecord());
  const [problemName, setProblemName] = useState('');
  const [problemAttempt, setProblemAttempt] = useState(1);
  const [problemTime, setProblemTime] = useState('');
  const [workImageUrl, setWorkImageUrl] = useState('');
  const [workComment, setWorkComment] = useState('');

  const loadData = useCallback(() => {
    const s = getStudents().find((s) => s.id === studentId);
    setStudent(s || null);
    setRecords(getRecordsByStudent(studentId).sort((a, b) => b.date.localeCompare(a.date)));
    setKnowledge(getKnowledgeByStudent(studentId));
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">学生不存在</p>
      </div>
    );
  }

  const handleSaveRecord = () => {
    const record: LearningRecord = {
      ...form,
      id: uuidv4(),
      studentId,
    };
    addRecord(record);
    setAddRecordOpen(false);
    setForm(emptyRecord());
    loadData();
  };

  const handleDeleteRecord = (id: string) => {
    deleteRecord(id);
    loadData();
  };

  const addProblemRetry = () => {
    if (!problemName.trim() || !problemTime) return;
    setForm((prev) => ({
      ...prev,
      problemRetries: [
        ...prev.problemRetries,
        {
          problemName: problemName.trim(),
          attempt: problemAttempt,
          timeSpent: Number(problemTime),
          date: form.date,
        },
      ],
    }));
    setProblemName('');
    setProblemAttempt(1);
    setProblemTime('');
  };

  const addWork = () => {
    if (!workImageUrl.trim()) return;
    setForm((prev) => ({
      ...prev,
      works: [
        ...prev.works,
        {
          imageUrl: workImageUrl.trim(),
          comment: workComment.trim() || undefined,
          date: form.date,
        },
      ],
    }));
    setWorkImageUrl('');
    setWorkComment('');
  };

  const handleKnowledgeStatusChange = (point: KnowledgePoint, status: KnowledgeStatus) => {
    const updated = { ...point, status, updatedAt: new Date().toISOString() };
    upsertKnowledge(updated);
    loadData();
  };

  // Calculate improvement for a problem
  const getProblemImprovement = (problemName: string, currentAttempt: number, currentTime: number) => {
    const allRetries = records.flatMap((r) => r.problemRetries);
    const prevAttempt = allRetries.find(
      (r) => r.problemName === problemName && r.attempt === currentAttempt - 1
    );
    if (prevAttempt) {
      const pct = Math.round(((prevAttempt.timeSpent - currentTime) / prevAttempt.timeSpent) * 100);
      return pct;
    }
    return null;
  };

  // Chart data: typing speed over time
  const typingChartData = records
    .filter((r) => r.typingSpeed != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      speed: r.typingSpeed!,
      accuracy: r.accuracy ?? 0,
    }));

  // Chart data: problem trends
  const allProblemRetries = records.flatMap((r) => r.problemRetries);
  const problemNames = [...new Set(allProblemRetries.map((r) => r.problemName))];
  const problemTrendData = problemNames.map((name) => {
    const attempts = allProblemRetries
      .filter((r) => r.problemName === name)
      .sort((a, b) => a.attempt - b.attempt);
    return { problemName: name, attempts };
  });

  // Stats
  const totalRecords = records.length;
  const avgTypingSpeed =
    records.filter((r) => r.typingSpeed).length > 0
      ? Math.round(
          records
            .filter((r) => r.typingSpeed)
            .reduce((sum, r) => sum + (r.typingSpeed || 0), 0) /
            records.filter((r) => r.typingSpeed).length
        )
      : 0;
  const allStrengths = records.flatMap((r) => [...r.strengths, ...r.customStrengths]);
  const topStrengths = Object.entries(
    allStrengths.reduce<Record<string, number>>((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{student.name}</h1>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {student.className && <span>{student.className}</span>}
                {student.course && (
                  <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                    {student.course}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600"
              onClick={() => router.push(`/reports/${student.id}`)}
            >
              <FileText className="h-4 w-4 mr-1" />
              生成报告
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                setForm(emptyRecord());
                setAddRecordOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加记录
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{totalRecords}</p>
              <p className="text-xs text-muted-foreground">学习记录</p>
            </CardContent>
          </Card>
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{avgTypingSpeed}</p>
              <p className="text-xs text-muted-foreground">平均打字速度</p>
            </CardContent>
          </Card>
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {knowledge.filter((k) => k.status === 'mastered').length}
              </p>
              <p className="text-xs text-muted-foreground">已掌握知识点</p>
            </CardContent>
          </Card>
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {topStrengths.length > 0 ? topStrengths[0][0] : '-'}
              </p>
              <p className="text-xs text-muted-foreground">最常出现优点</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-violet-50">
            <TabsTrigger value="timeline">学习时间线</TabsTrigger>
            <TabsTrigger value="charts">数据图表</TabsTrigger>
            <TabsTrigger value="knowledge">知识点进度</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-violet-300" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  还没有学习记录
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  点击右上角「添加记录」开始记录学习情况
                </p>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => setAddRecordOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加第一条记录
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-violet-100" />
                {records.map((record) => (
                  <div key={record.id} className="relative pl-12 pb-8">
                    <div className="absolute left-3 top-1 w-5 h-5 rounded-full bg-violet-500 border-4 border-violet-100" />
                    <Card className="border-purple-50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {record.date}
                            </span>
                            {record.typingSpeed != null && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {record.typingSpeed}字/分
                              </Badge>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除 {record.date} 的学习记录吗？
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {/* Tags */}
                        {(record.strengths.length > 0 || record.customStrengths.length > 0) && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground mr-2">优点</span>
                            {[...record.strengths, ...record.customStrengths].map((tag) => (
                              <Badge
                                key={tag}
                                className="bg-emerald-50 text-emerald-700 border-0 text-xs mr-1 mb-1"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {(record.improvements.length > 0 || record.customImprovements.length > 0) && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground mr-2">待改进</span>
                            {[...record.improvements, ...record.customImprovements].map((tag) => (
                              <Badge
                                key={tag}
                                className="bg-amber-50 text-amber-700 border-0 text-xs mr-1 mb-1"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Quantitative data */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                          {record.typingSpeed != null && (
                            <div className="bg-violet-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-violet-600">{record.typingSpeed}</p>
                              <p className="text-xs text-muted-foreground">字/分</p>
                            </div>
                          )}
                          {record.accuracy != null && (
                            <div className="bg-emerald-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-emerald-600">{record.accuracy}%</p>
                              <p className="text-xs text-muted-foreground">正确率</p>
                            </div>
                          )}
                          <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-amber-600">{record.behavior.focus}</p>
                            <p className="text-xs text-muted-foreground">专注度</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-blue-600">{record.behavior.attendance}</p>
                            <p className="text-xs text-muted-foreground">出勤</p>
                          </div>
                        </div>

                        {/* Problem retries */}
                        {record.problemRetries.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">题目重刷记录</p>
                            <div className="space-y-1">
                              {record.problemRetries.map((pr, idx) => {
                                const improvement = getProblemImprovement(pr.problemName, pr.attempt, pr.timeSpent);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1"
                                  >
                                    <Target className="h-3 w-3 text-violet-500" />
                                    <span className="font-medium">{pr.problemName}</span>
                                    <span className="text-muted-foreground">第{pr.attempt}次</span>
                                    <span>{pr.timeSpent}分钟</span>
                                    {improvement != null && (
                                      <span className={improvement > 0 ? 'text-emerald-600' : 'text-red-500'}>
                                        {improvement > 0 ? '+' : ''}{improvement}%
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Works */}
                        {record.works.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">作品展示</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {record.works.map((w, idx) => (
                                <div key={idx} className="rounded-lg overflow-hidden border bg-gray-50">
                                  <img
                                    src={w.imageUrl}
                                    alt="作品"
                                    className="w-full h-24 object-cover"
                                  />
                                  {w.comment && (
                                    <p className="text-xs text-muted-foreground p-1 truncate">
                                      {w.comment}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.notes && (
                          <p className="mt-3 text-sm text-muted-foreground bg-gray-50 rounded p-2">
                            {record.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {/* Typing Speed Chart */}
            <Card className="border-purple-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-500" />
                  打字速度进步曲线
                </CardTitle>
              </CardHeader>
              <CardContent>
                {typingChartData.length < 2 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    至少需要2条打字速度记录才能生成曲线图
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={typingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ff" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="speed"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ fill: '#7c3aed', r: 4 }}
                        name="打字速度(字/分)"
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="正确率(%)"
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Problem Trend Chart */}
            <Card className="border-purple-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  题目重刷时间趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {problemTrendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    还没有题目重刷记录
                  </p>
                ) : (
                  <div className="space-y-4">
                    {problemTrendData.map((pt) => {
                      const chartData = pt.attempts.map((a) => ({
                        name: `第${a.attempt}次`,
                        耗时: a.timeSpent,
                      }));
                      return (
                        <div key={pt.problemName}>
                          <h4 className="text-sm font-medium mb-2">{pt.problemName}</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ff" />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar dataKey="耗时" fill="#7c3aed" radius={[4, 4, 0, 0]} name="耗时(分钟)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Tab */}
          <TabsContent value="knowledge" className="space-y-4">
            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-200" />
                <span className="text-muted-foreground">未开始</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">学习中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">已掌握</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {knowledge.map((point) => (
                <Card key={point.id} className="border-purple-50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-3">{point.name}</h4>
                    <div className="flex gap-1">
                      {(['not_started', 'learning', 'mastered'] as KnowledgeStatus[]).map(
                        (status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={point.status === status ? 'default' : 'outline'}
                            className={`text-xs h-7 ${
                              point.status === status
                                ? KNOWLEDGE_STATUS_COLORS[status]
                                : 'bg-white text-gray-400 border-gray-200'
                            }`}
                            onClick={() => handleKnowledgeStatusChange(point, status)}
                          >
                            {KNOWLEDGE_STATUS_LABELS[status]}
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Record Dialog */}
      <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加学习记录 - {student.name}</DialogTitle>
            <DialogDescription>记录本次课程的学习表现和数据</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Date */}
            <div>
              <Label>日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <Separator />

            {/* Strengths & Improvements */}
            <TagSelector
              label="优点标签"
              options={PRESET_STRENGTHS}
              selected={form.strengths}
              onChange={(selected) => setForm((prev) => ({ ...prev, strengths: selected }))}
              customTags={form.customStrengths}
              onCustomTagsChange={(tags) => setForm((prev) => ({ ...prev, customStrengths: tags }))}
              colorClass="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            />

            <TagSelector
              label="待改进标签"
              options={PRESET_IMPROVEMENTS}
              selected={form.improvements}
              onChange={(selected) => setForm((prev) => ({ ...prev, improvements: selected }))}
              customTags={form.customImprovements}
              onCustomTagsChange={(tags) => setForm((prev) => ({ ...prev, customImprovements: tags }))}
              colorClass="bg-amber-100 text-amber-700 hover:bg-amber-200"
            />

            <Separator />

            {/* Quantitative data */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>打字速度（字/分钟）</Label>
                <Input
                  type="number"
                  placeholder="如：25"
                  value={form.typingSpeed ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      typingSpeed: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div>
                <Label>正确率（%）</Label>
                <Input
                  type="number"
                  placeholder="如：95"
                  min={0}
                  max={100}
                  value={form.accuracy ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accuracy: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Problem retries */}
            <div>
              <Label>题目重刷记录</Label>
              <div className="mt-2 space-y-2">
                {form.problemRetries.map((pr, idx) => {
                  const improvement = getProblemImprovement(pr.problemName, pr.attempt, pr.timeSpent);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{pr.problemName}</span>
                      <span className="text-muted-foreground">第{pr.attempt}次</span>
                      <span>{pr.timeSpent}分钟</span>
                      {improvement != null && (
                        <span className={improvement > 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {improvement > 0 ? '+' : ''}{improvement}%
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            problemRetries: prev.problemRetries.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="题目名称"
                  value={problemName}
                  onChange={(e) => setProblemName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="第几次"
                  value={problemAttempt || ''}
                  onChange={(e) => setProblemAttempt(Number(e.target.value) || 1)}
                  className="w-20"
                  min={1}
                />
                <Input
                  type="number"
                  placeholder="耗时(分钟)"
                  value={problemTime}
                  onChange={(e) => setProblemTime(e.target.value)}
                  className="w-28"
                />
                <Button type="button" variant="outline" onClick={addProblemRetry}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Work upload */}
            <div>
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                作品上传
              </Label>
              <div className="mt-2 space-y-2">
                {form.works.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm">
                    <img src={w.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    {w.comment && <span className="text-muted-foreground truncate">{w.comment}</span>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          works: prev.works.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="粘贴图片URL"
                    value={workImageUrl}
                    onChange={(e) => setWorkImageUrl(e.target.value)}
                  />
                  <Input
                    placeholder="点评（可选）"
                    value={workComment}
                    onChange={(e) => setWorkComment(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={addWork} className="self-start">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                支持粘贴图片URL或拖拽截图后粘贴
              </p>
            </div>

            <Separator />

            {/* Behavior */}
            <div className="space-y-3">
              <Label>行为习惯</Label>
              <StarRating
                value={form.behavior.focus}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    behavior: { ...prev.behavior, focus: v },
                  }))
                }
                label="专注度"
              />
              <StarRating
                value={form.behavior.attendance}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    behavior: { ...prev.behavior, attendance: v },
                  }))
                }
                label="出勤"
              />
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label>补充备注</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="补充说明..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleSaveRecord}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              保存学习记录
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
