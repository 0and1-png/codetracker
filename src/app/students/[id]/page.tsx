'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ScrollText,
  Trash2,
  Hourglass,
  Flame,
  Crosshair,
  Sword,
  RefreshCw,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Calendar,
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
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <p className="text-[#8b949e]">学生档案未找到...</p>
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

  // Chart data
  const typingChartData = monthTyping
    .filter((r) => r.speed > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(new Date(r.date), 'M/d'),
      speed: r.speed,
      accuracy: r.accuracy,
    }));

  const weeklyTypingData = getTypingWeeklyData(typingRecords, selectedMonth);

  const problemNames = [...new Set(monthRetry.map((r) => r.problemName))];
  const problemTrendData = problemNames.map((name) => {
    const attempts = monthRetry
      .filter((r) => r.problemName === name)
      .sort((a, b) => a.attempt - b.attempt);
    return { problemName: name, attempts };
  });

  // Timeline
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
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#161b22]/90 backdrop-blur-md border-b border-[#d4a853]/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-9 w-9 text-[#8b949e] hover:text-[#d4a853] hover:bg-[#d4a853]/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8860b] flex items-center justify-center text-[#0d1117] font-bold shadow-lg shadow-[#d4a853]/20">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#e6edf3]">{student.name}</h1>
              <div className="flex gap-2 text-xs text-[#8b949e]">
                {student.className && <span>{student.className}</span>}
                {course && (
                  <span className="bg-[#d4a853]/10 text-[#d4a853] px-2 py-0.5 rounded-full border border-[#d4a853]/20">
                    {course.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32 h-9 text-sm bg-[#1c2128] border-[#d4a853]/20 text-[#e6edf3]">
                <Calendar className="h-4 w-4 mr-1 text-[#d4a853]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1c2128] border-[#d4a853]/20">
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m} className="text-[#e6edf3] focus:bg-[#d4a853]/10 focus:text-[#d4a853]">
                    {format(new Date(m + '-01'), 'yyyy年M月', { locale: zhCN })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0d1117] hover:from-[#e0b96a] hover:to-[#c9971f] shadow-lg shadow-[#d4a853]/20"
              onClick={() => router.push(`/reports/${student.id}?month=${selectedMonth}`)}
            >
              <ScrollText className="h-4 w-4 mr-1" />
              月度报告
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== Auto Tags ===== */}
        {autoTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {autoTags.map((tag: AutoTag, i: number) => (
              <Badge
                key={i}
                className={`text-xs px-3 py-1 border ${
                  tag.type === 'highlight'
                    ? 'bg-[#d4a853]/10 text-[#d4a853] border-[#d4a853]/20 hover:bg-[#d4a853]/20'
                    : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20 hover:bg-[#ef4444]/20'
                }`}
              >
                {tag.type === 'highlight' ? (
                  <Sparkles className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* ===== Summary Cards ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <XianxiaCard
            icon={<Sword className="h-4 w-4" />}
            label="打字速度"
            value={`${curTypingSummary.avgSpeed}`}
            unit="字/分"
            improvement={speedImprove}
            color="gold"
          />
          <XianxiaCard
            icon={<Sparkles className="h-4 w-4" />}
            label="正确率均值"
            value={`${curTypingSummary.avgAccuracy}`}
            unit="%"
            improvement={
              prevTypingSummary.avgAccuracy > 0
                ? curTypingSummary.avgAccuracy - prevTypingSummary.avgAccuracy
                : 0
            }
            color="jade"
          />
          <XianxiaCard
            icon={<RefreshCw className="h-4 w-4" />}
            label="三刷记录"
            value={`${curRetrySummary.count}`}
            unit="次"
            improvement={curRetrySummary.avgImprovement}
            color="fire"
          />
          <XianxiaCard
            icon={<BookOpen className="h-4 w-4" />}
            label="作业记录"
            value={`${curHomeworkSummary.count}`}
            unit="篇"
            color="sky"
          />
        </div>

        {/* ===== Knowledge Mastery Bar ===== */}
        {mastery.length > 0 && (
          <Card className="bg-[#161b22] border-[#d4a853]/15">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#d4a853] flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  知识点掌握总览
                </h3>
                <span className="text-xs text-[#8b949e]">
                  <span className="text-[#4ade80]">{mastery.filter((m) => m.masteryPercent >= 80).length}</span>/{mastery.length} 圆满
                  {weakKPs.length > 0 && (
                    <span className="text-[#ef4444] ml-2">
                      {weakKPs.length}个待突破
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-1 h-8 items-end">
                {mastery
                  .sort((a, b) => b.masteryPercent - a.masteryPercent)
                  .map((m: KnowledgeMastery) => (
                    <div
                      key={m.knowledgePointId}
                      className="flex-1 rounded-t relative group cursor-default transition-all duration-200 hover:opacity-80"
                      style={{
                        height: `${Math.max(m.masteryPercent, 5)}%`,
                        backgroundColor:
                          m.masteryPercent >= 80
                            ? '#4ade80'
                            : m.masteryPercent >= 40
                            ? '#d4a853'
                            : m.masteryPercent > 0
                            ? '#ef4444'
                            : '#30363d',
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0d1117] text-[#e6edf3] text-[10px] px-2 py-1 rounded border border-[#d4a853]/30 whitespace-nowrap z-10">
                        {m.knowledgePointName} {m.masteryPercent}%
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-[#161b22] border border-[#30363d]">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-[#d4a853]/15 data-[state=active]:text-[#d4a853] text-[#8b949e]">
              学习记录
            </TabsTrigger>
            <TabsTrigger value="charts" className="data-[state=active]:bg-[#d4a853]/15 data-[state=active]:text-[#d4a853] text-[#8b949e]">
              境界图谱
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="data-[state=active]:bg-[#d4a853]/15 data-[state=active]:text-[#d4a853] text-[#8b949e]">
              知识点进度
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {timelineItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-[#d4a853]/10 flex items-center justify-center mx-auto mb-4 border border-[#d4a853]/20">
                  <Hourglass className="h-8 w-8 text-[#d4a853]/40" />
                </div>
                <h3 className="text-lg font-medium text-[#8b949e] mb-2">
                  {monthLabel}尚无学习记录
                </h3>
                <p className="text-sm text-[#484f58]">
                  返回工作台录入学习记录
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#d4a853]/15" />
                {timelineItems.map((item, idx) => (
                  <div key={`${item.type}-${item.data.id}-${idx}`} className="relative pl-12 pb-6">
                    <div
                      className={`absolute left-3 top-1 w-5 h-5 rounded-full border-4 ${
                        item.type === 'typing'
                          ? 'bg-[#d4a853] border-[#d4a853]/20'
                          : item.type === 'retry'
                          ? 'bg-[#ef4444] border-[#ef4444]/20'
                          : 'bg-[#4ade80] border-[#4ade80]/20'
                      }`}
                    />
                    <Card className="bg-[#161b22] border-[#30363d] hover:border-[#d4a853]/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#e6edf3]">
                              {item.data.date}
                            </span>
                            {item.type === 'typing' && (
                              <Badge className="bg-[#d4a853]/10 text-[#d4a853] border-[#d4a853]/20 text-xs">
                                <Sword className="h-3 w-3 mr-1" />
                                速度
                              </Badge>
                            )}
                            {item.type === 'retry' && (
                              <Badge className="bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20 text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                三刷
                              </Badge>
                            )}
                            {item.type === 'homework' && (
                              <Badge className="bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20 text-xs">
                                <BookOpen className="h-3 w-3 mr-1" />
                                作业
                              </Badge>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#484f58] hover:text-[#ef4444]">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#161b22] border-[#30363d]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-[#e6edf3]">确认删除</AlertDialogTitle>
                                <AlertDialogDescription className="text-[#8b949e]">确定要删除该条学习记录吗？此操作不可逆。</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-[#21262d] text-[#e6edf3] border-[#30363d]">取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (item.type === 'typing') deleteTypingRecord(item.data.id);
                                    else if (item.type === 'retry') deleteRetryRecord(item.data.id);
                                    else deleteHomeworkRecord(item.data.id);
                                    loadData();
                                  }}
                                  className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {item.type === 'typing' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#d4a853]/5 rounded-lg p-2 text-center border border-[#d4a853]/10">
                              <p className="text-lg font-bold text-[#d4a853]">{item.data.speed}</p>
                              <p className="text-xs text-[#8b949e]">字/分钟</p>
                            </div>
                            <div className="bg-[#4ade80]/5 rounded-lg p-2 text-center border border-[#4ade80]/10">
                              <p className="text-lg font-bold text-[#4ade80]">{item.data.accuracy}%</p>
                              <p className="text-xs text-[#8b949e]">正确率</p>
                            </div>
                          </div>
                        )}

                        {item.type === 'retry' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Crosshair className="h-4 w-4 text-[#ef4444]" />
                              <span className="font-medium text-[#e6edf3]">{item.data.problemName}</span>
                              <span className="text-[#8b949e]">第{item.data.attempt}次炼化</span>
                              <span className="font-medium text-[#d4a853]">{item.data.timeSpent}分钟</span>
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
                                      <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                                      <span className={imp > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}>
                                        比上次{imp > 0 ? '快' : '慢'}了{Math.abs(imp)}%
                                      </span>
                                      <span className="text-[#484f58]">
                                        （上次{prevAttempt.timeSpent}分钟）
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            {item.data.notes && (
                              <p className="text-sm text-[#8b949e] bg-[#0d1117] rounded p-2 border border-[#30363d]">
                                {item.data.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {item.type === 'homework' && (
                          <div className="space-y-2">
                            <p className="font-medium text-sm text-[#e6edf3]">{item.data.title}</p>
                            {item.data.content && (
                              <p className="text-sm text-[#8b949e]">{item.data.content}</p>
                            )}
                            <div className="flex gap-3">
                              {item.data.score != null && (
                                <Badge className="bg-[#60a5fa]/10 text-[#60a5fa] border-[#60a5fa]/20">
                                  评分：{item.data.score}
                                </Badge>
                              )}
                              {item.data.comment && (
                                <span className="text-sm text-[#8b949e] italic">
                                  &ldquo;{item.data.comment}&rdquo;
                                </span>
                              )}
                            </div>
                            {item.data.imageUrl && (
                              <img
                                src={item.data.imageUrl}
                                alt="学习成果"
                                className="max-w-full max-h-40 rounded-lg border border-[#30363d] mt-2"
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
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-[#d4a853]">
                  <Flame className="h-4 w-4" />
                  {monthLabel}打字速度趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {typingChartData.length < 2 ? (
                  <p className="text-sm text-[#484f58] text-center py-8">
                    至少需要2条速度记录方可绘制趋势图
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={typingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8b949e' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#8b949e' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                      <Line
                        type="monotone"
                        dataKey="speed"
                        stroke="#d4a853"
                        strokeWidth={2}
                        dot={{ fill: '#d4a853', r: 4 }}
                        name="速度(字/分)"
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#4ade80"
                        strokeWidth={2}
                        dot={{ fill: '#4ade80', r: 4 }}
                        name="正确率(%)"
                      />
                      <Legend wrapperStyle={{ color: '#8b949e' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Weekly Typing Summary */}
            {weeklyTypingData.some((w) => w.count > 0) && (
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-[#d4a853]">
                    <Calendar className="h-4 w-4" />
                    {monthLabel}速度周报
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-[#30363d]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#d4a853]/5">
                          <th className="px-4 py-2 text-left text-[#d4a853] font-medium">周次</th>
                          <th className="px-4 py-2 text-center text-[#d4a853] font-medium">平均速度</th>
                          <th className="px-4 py-2 text-center text-[#d4a853] font-medium">平均正确率</th>
                          <th className="px-4 py-2 text-center text-[#d4a853] font-medium">学习次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTypingData.map((w) =>
                          w.count > 0 ? (
                            <tr key={w.week} className="border-t border-[#21262d]">
                              <td className="px-4 py-2 font-medium text-[#e6edf3]">{w.week}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-[#d4a853]">{w.avgSpeed}</span>
                                <span className="text-[#484f58] text-xs ml-1">字/分</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-[#4ade80]">{w.avgAccuracy}%</span>
                              </td>
                              <td className="px-4 py-2 text-center text-[#8b949e]">{w.count}次</td>
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
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-[#ef4444]">
                  <Crosshair className="h-4 w-4" />
                  {monthLabel}三刷时间趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {problemTrendData.length === 0 ? (
                  <p className="text-sm text-[#484f58] text-center py-8">
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
                          <h4 className="text-sm font-medium mb-2 text-[#e6edf3]">{pt.problemName}</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8b949e' }} />
                              <YAxis tick={{ fontSize: 12, fill: '#8b949e' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                              <Bar dataKey="耗时" fill="#d4a853" radius={[4, 4, 0, 0]} name="耗时(分钟)" />
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
              <div className="bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-[#ef4444] mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  待加强知识点（{weakKPs.length}个）
                </h4>
                <div className="flex flex-wrap gap-2">
                  {weakKPs.map((kp: KnowledgeMastery) => (
                    <Badge key={kp.knowledgePointId} className="bg-[#161b22] text-[#ef4444] border border-[#ef4444]/20 text-xs">
                      {kp.knowledgePointName} {kp.masteryPercent}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#30363d]" />
                <span className="text-[#484f58]">未开始</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#d4a853]" />
                <span className="text-[#484f58]">学习中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                <span className="text-[#484f58]">已圆满</span>
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
                    className={`bg-[#161b22] border-[#30363d] ${
                      masteryItem?.isWeak ? 'ring-1 ring-[#ef4444]/30' : ''
                    } hover:border-[#d4a853]/20 transition-colors`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-[#e6edf3]">{point.knowledgePointName}</h4>
                        <span
                          className={`text-xs font-bold ${
                            masteryPercent >= 80
                              ? 'text-[#4ade80]'
                              : masteryPercent >= 40
                              ? 'text-[#d4a853]'
                              : masteryPercent > 0
                              ? 'text-[#ef4444]'
                              : 'text-[#484f58]'
                          }`}
                        >
                          {masteryPercent}%
                        </span>
                      </div>

                      {/* Mastery progress bar */}
                      <div className="h-1.5 bg-[#21262d] rounded-full mb-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${masteryPercent}%`,
                            backgroundColor:
                              masteryPercent >= 80
                                ? '#4ade80'
                                : masteryPercent >= 40
                                ? '#d4a853'
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
                                  : 'bg-[#0d1117] text-[#484f58] border-[#30363d]'
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
                            <span className="text-xs text-[#484f58] w-8">评分</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <button
                                  key={n}
                                  className={`w-4 h-4 rounded-sm text-[8px] font-bold transition-colors ${
                                    point.score && n <= point.score
                                      ? 'bg-[#d4a853] text-[#0d1117]'
                                      : 'bg-[#21262d] text-[#484f58] hover:bg-[#d4a853]/20'
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
                            className="w-full text-xs border rounded p-1.5 min-h-[40px] resize-y bg-[#0d1117] border-[#30363d] text-[#e6edf3] focus:border-[#d4a853]/40 focus:bg-[#161b22] placeholder:text-[#484f58]"
                            placeholder="掌握情况描述（将呈于传书之中）"
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

// ===== Sub-component: Xianxia Summary Card =====

function XianxiaCard({
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
  const colorMap: Record<string, { text: string; bg: string; glow: string }> = {
    gold: { text: 'text-[#d4a853]', bg: 'bg-[#d4a853]/5', glow: 'shadow-[#d4a853]/5' },
    jade: { text: 'text-[#4ade80]', bg: 'bg-[#4ade80]/5', glow: 'shadow-[#4ade80]/5' },
    fire: { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/5', glow: 'shadow-[#ef4444]/5' },
    sky: { text: 'text-[#60a5fa]', bg: 'bg-[#60a5fa]/5', glow: 'shadow-[#60a5fa]/5' },
  };
  const c = colorMap[color] || colorMap.gold;
  return (
    <Card className={`bg-[#161b22] border-[#30363d] hover:border-[#d4a853]/20 transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={c.text}>{icon}</span>
          <span className="text-xs text-[#8b949e]">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${c.text}`}>
            {value}
          </span>
          <span className="text-xs text-[#484f58]">{unit}</span>
          {improvement !== undefined && improvement !== 0 && (
            <span
              className={`ml-2 text-xs font-medium flex items-center gap-0.5 ${
                improvement > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'
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
