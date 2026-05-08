'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Trash2,
  Clock,
  Zap,
  Target,
  Keyboard,
  RotateCcw,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type {
  Student,
  Course,
  TypingRecord,
  ProblemRetryRecord,
  HomeworkRecord,
  KnowledgeProgress,
  KnowledgeStatus,
} from '@/lib/types';
import {
  getStudents,
  getCourse,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
  deleteTypingRecord,
  deleteRetryRecord,
  deleteHomeworkRecord,
  updateKnowledgeStatus,
} from '@/lib/store';
import { KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_STATUS_COLORS } from '@/lib/constants';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [typingRecords, setTypingRecords] = useState<TypingRecord[]>([]);
  const [retryRecords, setRetryRecords] = useState<ProblemRetryRecord[]>([]);
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeProgress[]>([]);

  const loadData = useCallback(() => {
    const s = getStudents().find((s) => s.id === studentId);
    setStudent(s || null);
    if (s) {
      const c = getCourse(s.courseId);
      setCourse(c || null);
    }
    setTypingRecords(
      getTypingByStudent(studentId).sort((a, b) => b.date.localeCompare(a.date))
    );
    setRetryRecords(
      getRetryByStudent(studentId).sort((a, b) => b.date.localeCompare(a.date))
    );
    setHomeworkRecords(
      getHomeworkByStudent(studentId).sort((a, b) => b.date.localeCompare(a.date))
    );
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

  const handleKnowledgeStatusChange = (kp: KnowledgeProgress, status: KnowledgeStatus) => {
    updateKnowledgeStatus(kp.studentId, kp.knowledgePointId, status);
    loadData();
  };

  // Chart data: typing speed over time
  const typingChartData = typingRecords
    .filter((r) => r.speed > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      speed: r.speed,
      accuracy: r.accuracy,
    }));

  // Problem trend data
  const problemNames = [...new Set(retryRecords.map((r) => r.problemName))];
  const problemTrendData = problemNames.map((name) => {
    const attempts = retryRecords
      .filter((r) => r.problemName === name)
      .sort((a, b) => a.attempt - b.attempt);
    return { problemName: name, attempts };
  });

  // Stats
  const avgTypingSpeed =
    typingRecords.length > 0
      ? Math.round(typingRecords.reduce((sum, r) => sum + r.speed, 0) / typingRecords.length)
      : 0;
  const masteredCount = knowledge.filter((k) => k.status === 'mastered').length;

  // Combined timeline
  type TimelineItem =
    | { type: 'typing'; data: TypingRecord }
    | { type: 'retry'; data: ProblemRetryRecord }
    | { type: 'homework'; data: HomeworkRecord };

  const timelineItems: TimelineItem[] = [
    ...typingRecords.map((r) => ({ type: 'typing' as const, data: r })),
    ...retryRecords.map((r) => ({ type: 'retry' as const, data: r })),
    ...homeworkRecords.map((r) => ({ type: 'homework' as const, data: r })),
  ].sort((a, b) => b.data.date.localeCompare(a.data.date));

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
                {course && (
                  <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                    {course.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-violet-200 text-violet-600"
            onClick={() => router.push(`/reports/${student.id}`)}
          >
            <FileText className="h-4 w-4 mr-1" />
            生成报告
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{typingRecords.length}</p>
              <p className="text-xs text-muted-foreground">打字记录</p>
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
              <p className="text-2xl font-bold text-amber-600">{retryRecords.length}</p>
              <p className="text-xs text-muted-foreground">三刷记录</p>
            </CardContent>
          </Card>
          <Card className="border-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{masteredCount}</p>
              <p className="text-xs text-muted-foreground">已掌握知识点</p>
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
            {timelineItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-violet-300" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  还没有学习记录
                </h3>
                <p className="text-sm text-muted-foreground">
                  返回首页工作台添加学习记录
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-violet-100" />
                {timelineItems.map((item, idx) => (
                  <div key={`${item.type}-${item.data.id}-${idx}`} className="relative pl-12 pb-6">
                    <div
                      className={`absolute left-3 top-1 w-5 h-5 rounded-full border-4 ${
                        item.type === 'typing'
                          ? 'bg-violet-500 border-violet-100'
                          : item.type === 'retry'
                          ? 'bg-amber-500 border-amber-100'
                          : 'bg-emerald-500 border-emerald-100'
                      }`}
                    />
                    <Card className="border-purple-50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {item.data.date}
                            </span>
                            {item.type === 'typing' && (
                              <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">
                                <Keyboard className="h-3 w-3 mr-1" />
                                打字
                              </Badge>
                            )}
                            {item.type === 'retry' && (
                              <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                三刷
                              </Badge>
                            )}
                            {item.type === 'homework' && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                                <BookOpen className="h-3 w-3 mr-1" />
                                作业
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
                                  确定要删除该条记录吗？
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (item.type === 'typing') deleteTypingRecord(item.data.id);
                                    else if (item.type === 'retry') deleteRetryRecord(item.data.id);
                                    else deleteHomeworkRecord(item.data.id);
                                    loadData();
                                  }}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {item.type === 'typing' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-violet-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-violet-600">{item.data.speed}</p>
                              <p className="text-xs text-muted-foreground">字/分钟</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-emerald-600">{item.data.accuracy}%</p>
                              <p className="text-xs text-muted-foreground">正确率</p>
                            </div>
                          </div>
                        )}

                        {item.type === 'retry' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="h-4 w-4 text-amber-500" />
                              <span className="font-medium">{item.data.problemName}</span>
                              <span className="text-muted-foreground">第{item.data.attempt}次</span>
                              <span className="font-medium">{item.data.timeSpent}分钟</span>
                            </div>
                            {item.data.attempt > 1 && (() => {
                              const prevAttempt = retryRecords.find(
                                (r) =>
                                  r.problemId === item.data.problemId &&
                                  r.attempt === item.data.attempt - 1
                              );
                              if (prevAttempt) {
                                const improvement = Math.round(
                                  ((prevAttempt.timeSpent - item.data.timeSpent) /
                                    prevAttempt.timeSpent) *
                                    100
                                );
                                return (
                                  <div className="flex items-center gap-1 text-sm">
                                    <TrendingUp className="h-4 w-4" />
                                    <span
                                      className={
                                        improvement > 0 ? 'text-emerald-600' : 'text-red-500'
                                      }
                                    >
                                      比上次{improvement > 0 ? '快' : '慢'}了{Math.abs(improvement)}%
                                    </span>
                                    <span className="text-muted-foreground">
                                      （上次{prevAttempt.timeSpent}分钟）
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {item.data.notes && (
                              <p className="text-sm text-muted-foreground bg-gray-50 rounded p-2">
                                {item.data.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {item.type === 'homework' && (
                          <div className="space-y-2">
                            <p className="font-medium text-sm">{item.data.title}</p>
                            {item.data.content && (
                              <p className="text-sm text-muted-foreground">{item.data.content}</p>
                            )}
                            <div className="flex gap-3">
                              {item.data.score != null && (
                                <Badge className="bg-blue-50 text-blue-700 border-0">
                                  评分：{item.data.score}
                                </Badge>
                              )}
                              {item.data.comment && (
                                <span className="text-sm text-muted-foreground italic">
                                  &ldquo;{item.data.comment}&rdquo;
                                </span>
                              )}
                            </div>
                            {item.data.imageUrl && (
                              <img
                                src={item.data.imageUrl}
                                alt="作业"
                                className="max-w-full max-h-40 rounded-lg shadow-sm mt-2"
                              />
                            )}
                          </div>
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
                    至少需要2条打字记录才能生成曲线图
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
                  <Target className="h-4 w-4 text-amber-500" />
                  三刷时间趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {problemTrendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    还没有三刷记录
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
                    <h4 className="font-medium text-sm mb-3">{point.knowledgePointName}</h4>
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
    </div>
  );
}
