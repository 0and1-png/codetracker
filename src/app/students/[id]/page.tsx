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
  TrendingDown,
  Star,
  AlertTriangle,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  updateKnowledgeScore,
} from '@/lib/store';
import { KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_STATUS_COLORS } from '@/lib/constants';
import {
  type PeriodType,
  type AutoTag,
  type KnowledgeMastery,
  getMonthRange,
  getPreviousMonthRange,
  getRecordsInPeriod,
  calcTypingSummary,
  calcTypingImprovement,
  calcRetrySummary,
  calcHomeworkSummary,
  calcKnowledgeMastery,
  getWeakKnowledgePoints,
  generateAutoTags,
  getTypingWeeklyData,
} from '@/lib/analytics';

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
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

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

  // ===== Period Filtering =====
  const currentRange = getMonthRange(selectedMonth);
  const prevRange = getPreviousMonthRange(selectedMonth);

  const monthTyping = getRecordsInPeriod(typingRecords, currentRange.start, currentRange.end);
  const monthRetry = getRecordsInPeriod(retryRecords, currentRange.start, currentRange.end);
  const monthHomework = getRecordsInPeriod(homeworkRecords, currentRange.start, currentRange.end);

  const prevTyping = getRecordsInPeriod(typingRecords, prevRange.start, prevRange.end);
  const prevRetry = getRecordsInPeriod(retryRecords, prevRange.start, prevRange.end);

  // ===== Computed Analytics =====
  const curTypingSummary = calcTypingSummary(monthTyping);
  const prevTypingSummary = calcTypingSummary(prevTyping);
  const curRetrySummary = calcRetrySummary(monthRetry, course || undefined);
  const prevRetrySummary = calcRetrySummary(prevRetry, course || undefined);
  const curHomeworkSummary = calcHomeworkSummary(monthHomework);

  const speedImprove = calcTypingImprovement(curTypingSummary, prevTypingSummary);
  const mastery = calcKnowledgeMastery(knowledge, retryRecords, course || undefined);
  const weakKPs = getWeakKnowledgePoints(mastery);
  const autoTags = generateAutoTags(
    curTypingSummary,
    prevTypingSummary,
    curRetrySummary,
    prevRetrySummary,
    curHomeworkSummary,
    mastery
  );

  // Available months
  const allDates = [
    ...typingRecords.map((r) => r.date),
    ...retryRecords.map((r) => r.date),
    ...homeworkRecords.map((r) => r.date),
  ];
  const availableMonths = [...new Set(allDates.map((d) => d.substring(0, 7)))].sort().reverse();
  if (availableMonths.length === 0) {
    availableMonths.push(format(new Date(), 'yyyy-MM'));
  }

  const handleKnowledgeStatusChange = (kp: KnowledgeProgress, status: KnowledgeStatus) => {
    updateKnowledgeStatus(kp.studentId, kp.knowledgePointId, status);
    loadData();
  };

  const handleKnowledgeScoreChange = (kp: KnowledgeProgress, score: number, description?: string) => {
    updateKnowledgeScore(kp.studentId, kp.knowledgePointId, score, description);
    loadData();
  };

  // Chart data: typing speed over time (filtered by selected month)
  const typingChartData = monthTyping
    .filter((r) => r.speed > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(new Date(r.date), 'M/d'),
      speed: r.speed,
      accuracy: r.accuracy,
    }));

  // Weekly typing data
  const weeklyTypingData = getTypingWeeklyData(typingRecords, selectedMonth);

  // Problem trend data
  const problemNames = [...new Set(monthRetry.map((r) => r.problemName))];
  const problemTrendData = problemNames.map((name) => {
    const attempts = monthRetry
      .filter((r) => r.problemName === name)
      .sort((a, b) => a.attempt - b.attempt);
    return { problemName: name, attempts };
  });

  // Combined timeline (filtered by selected month)
  type TimelineItem =
    | { type: 'typing'; data: TypingRecord }
    | { type: 'retry'; data: ProblemRetryRecord }
    | { type: 'homework'; data: HomeworkRecord };

  const timelineItems: TimelineItem[] = [
    ...monthTyping.map((r) => ({ type: 'typing' as const, data: r })),
    ...monthRetry.map((r) => ({ type: 'retry' as const, data: r })),
    ...monthHomework.map((r) => ({ type: 'homework' as const, data: r })),
  ].sort((a, b) => b.data.date.localeCompare(a.data.date));

  const monthLabel = format(new Date(selectedMonth + '-01'), 'M月', { locale: zhCN });

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
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m + '-01'), 'yyyy年M月', { locale: zhCN })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600"
              onClick={() => router.push(`/reports/${student.id}?month=${selectedMonth}`)}
            >
              <FileText className="h-4 w-4 mr-1" />
              生成报告
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== Auto Tags ===== */}
        {autoTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {autoTags.map((tag, i) => (
              <Badge
                key={i}
                className={`text-xs px-3 py-1 border-0 ${
                  tag.type === 'highlight'
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {tag.type === 'highlight' ? (
                  <Star className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* ===== Summary Cards with Comparison ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Keyboard className="h-4 w-4" />}
            label="平均打字速度"
            value={`${curTypingSummary.avgSpeed}`}
            unit="字/分"
            improvement={speedImprove}
            color="violet"
          />
          <SummaryCard
            icon={<Zap className="h-4 w-4" />}
            label="平均正确率"
            value={`${curTypingSummary.avgAccuracy}`}
            unit="%"
            improvement={
              prevTypingSummary.avgAccuracy > 0
                ? curTypingSummary.avgAccuracy - prevTypingSummary.avgAccuracy
                : 0
            }
            color="emerald"
          />
          <SummaryCard
            icon={<RotateCcw className="h-4 w-4" />}
            label="三刷记录"
            value={`${curRetrySummary.count}`}
            unit="次"
            improvement={curRetrySummary.avgImprovement}
            color="amber"
          />
          <SummaryCard
            icon={<BookOpen className="h-4 w-4" />}
            label="作业完成"
            value={`${curHomeworkSummary.count}`}
            unit="次"
            color="blue"
          />
        </div>

        {/* ===== Knowledge Mastery Bar ===== */}
        {mastery.length > 0 && (
          <Card className="border-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">知识点掌握总览</h3>
                <span className="text-xs text-muted-foreground">
                  {mastery.filter((m) => m.masteryPercent >= 80).length}/{mastery.length} 达标
                  {weakKPs.length > 0 && (
                    <span className="text-amber-600 ml-2">
                      {weakKPs.length}个薄弱
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-1 h-6 items-end">
                {mastery
                  .sort((a, b) => b.masteryPercent - a.masteryPercent)
                  .map((m) => (
                    <div
                      key={m.knowledgePointId}
                      className="flex-1 rounded-t relative group cursor-default"
                      style={{
                        height: `${Math.max(m.masteryPercent, 5)}%`,
                        backgroundColor:
                          m.masteryPercent >= 80
                            ? '#10b981'
                            : m.masteryPercent >= 40
                            ? '#f59e0b'
                            : m.masteryPercent > 0
                            ? '#ef4444'
                            : '#e5e7eb',
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                        {m.knowledgePointName} {m.masteryPercent}%
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  {monthLabel}暂无学习记录
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
                                <AlertDialogDescription>确定要删除该条记录吗？</AlertDialogDescription>
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
                            {item.data.attempt > 1 &&
                              (() => {
                                const prevAttempt = retryRecords.find(
                                  (r) =>
                                    r.problemId === item.data.problemId &&
                                    r.attempt === item.data.attempt - 1
                                );
                                if (prevAttempt) {
                                  const imp = Math.round(
                                    ((prevAttempt.timeSpent - item.data.timeSpent) /
                                      prevAttempt.timeSpent) *
                                      100
                                  );
                                  return (
                                    <div className="flex items-center gap-1 text-sm">
                                      <TrendingUp className="h-4 w-4" />
                                      <span className={imp > 0 ? 'text-emerald-600' : 'text-red-500'}>
                                        比上次{imp > 0 ? '快' : '慢'}了{Math.abs(imp)}%
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
                  {monthLabel}打字速度进步曲线
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

            {/* Weekly Typing Summary */}
            {weeklyTypingData.some((w) => w.count > 0) && (
              <Card className="border-purple-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-violet-500" />
                    {monthLabel}打字周报
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-violet-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-violet-50/60">
                          <th className="px-4 py-2 text-left text-violet-800 font-medium">周次</th>
                          <th className="px-4 py-2 text-center text-violet-800 font-medium">平均速度</th>
                          <th className="px-4 py-2 text-center text-violet-800 font-medium">平均正确率</th>
                          <th className="px-4 py-2 text-center text-violet-800 font-medium">测试次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTypingData.map((w) =>
                          w.count > 0 ? (
                            <tr key={w.week} className="border-t border-violet-50">
                              <td className="px-4 py-2 font-medium">{w.week}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-violet-600">{w.avgSpeed}</span>
                                <span className="text-muted-foreground text-xs ml-1">字/分</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-emerald-600">{w.avgAccuracy}%</span>
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground">{w.count}次</td>
                            </tr>
                          ) : null
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problem Trend Chart */}
            <Card className="border-purple-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  {monthLabel}三刷时间趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {problemTrendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {monthLabel}暂无三刷记录
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
            {weakKPs.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  薄弱知识点（{weakKPs.length}个）
                </h4>
                <div className="flex flex-wrap gap-2">
                  {weakKPs.map((kp) => (
                    <Badge key={kp.knowledgePointId} className="bg-white text-amber-700 border border-amber-200 text-xs">
                      {kp.knowledgePointName} {kp.masteryPercent}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
              {knowledge.map((point) => {
                const masteryItem = mastery.find(
                  (m) => m.knowledgePointId === point.knowledgePointId
                );
                const masteryPercent = masteryItem?.masteryPercent ?? 0;
                return (
                  <Card
                    key={point.id}
                    className={`border-purple-50 ${
                      masteryItem?.isWeak ? 'ring-1 ring-amber-200' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{point.knowledgePointName}</h4>
                        <span
                          className={`text-xs font-bold ${
                            masteryPercent >= 80
                              ? 'text-emerald-600'
                              : masteryPercent >= 40
                              ? 'text-amber-600'
                              : masteryPercent > 0
                              ? 'text-red-500'
                              : 'text-gray-400'
                          }`}
                        >
                          {masteryPercent}%
                        </span>
                      </div>

                      {/* Mastery progress bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${masteryPercent}%`,
                            backgroundColor:
                              masteryPercent >= 80
                                ? '#10b981'
                                : masteryPercent >= 40
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        />
                      </div>

                      <div className="flex gap-1 mb-2">
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
                      {point.status !== 'not_started' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-8">评分</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <button
                                  key={n}
                                  className={`w-4 h-4 rounded-sm text-[8px] font-bold transition-colors ${
                                    point.score && n <= point.score
                                      ? 'bg-violet-500 text-white'
                                      : 'bg-gray-100 text-gray-300 hover:bg-violet-100'
                                  }`}
                                  onClick={() =>
                                    handleKnowledgeScoreChange(point, n, point.description)
                                  }
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            className="w-full text-xs border rounded p-1.5 min-h-[40px] resize-y bg-gray-50 border-gray-200 focus:border-violet-300 focus:bg-white"
                            placeholder="掌握情况描述（会显示在报告中）"
                            value={point.description || ''}
                            onChange={(e) =>
                              handleKnowledgeScoreChange(
                                point,
                                point.score || 0,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ===== Sub-components =====

function SummaryCard({
  icon,
  label,
  value,
  unit,
  improvement,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  improvement?: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  };
  return (
    <Card className="border-purple-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={colorMap[color] || 'text-gray-600'}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${colorMap[color] || 'text-gray-600'}`}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
          {improvement !== undefined && improvement !== 0 && (
            <span
              className={`ml-2 text-xs font-medium flex items-center gap-0.5 ${
                improvement > 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {improvement > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {improvement > 0 ? '+' : ''}
              {improvement}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
