'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
  Star,
  AlertTriangle,
  Zap,
  Target,
  BookOpen,
  Keyboard,
  TrendingUp,
  RotateCcw,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/lib/types';
import {
  getStudents,
  getCourse,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
} from '@/lib/store';
import {
  getMonthRange,
  getPreviousMonthRange,
  getRecordsInPeriod,
  calcTypingSummary,
  calcTypingImprovement,
  calcRetrySummary,
  calcHomeworkSummary,
  calcKnowledgeMastery,
  getWeakKnowledgePoints,
  getStrongKnowledgePoints,
  generateAutoTags,
  generateGrowthDescription,
  generateStudySuggestions,
  getTypingWeeklyData,
  recommendCommentTemplate,
  COMMENT_TEMPLATES,
  type AutoTag,
  type CommentTemplate,
} from '@/lib/analytics';
import { KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_STATUS_COLORS } from '@/lib/constants';

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const urlMonth = searchParams.get('month');

  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || format(new Date(), 'yyyy-MM'));
  const [teacherComment, setTeacherComment] = useState('');
  const [nextMonthGoal, setNextMonthGoal] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchStudentIds, setBatchStudentIds] = useState<string[]>([]);
  const [batchCurrentIdx, setBatchCurrentIdx] = useState(0);

  // Report data (computed per current student)
  const [typingRecords, setTypingRecords] = useState<TypingRecord[]>([]);
  const [retryRecords, setRetryRecords] = useState<ProblemRetryRecord[]>([]);
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeProgress[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);

  const loadStudentData = useCallback(
    (sid: string) => {
      const s = getStudents().find((st) => st.id === sid);
      setStudent(s || null);
      if (s) {
        setCourse(getCourse(s.courseId) || null);
      }
      setTypingRecords(getTypingByStudent(sid).sort((a, b) => a.date.localeCompare(b.date)));
      setRetryRecords(getRetryByStudent(sid).sort((a, b) => a.date.localeCompare(b.date)));
      setHomeworkRecords(getHomeworkByStudent(sid).sort((a, b) => a.date.localeCompare(b.date)));
      setKnowledge(getKnowledgeByStudent(sid));
    },
    []
  );

  useEffect(() => {
    loadStudentData(studentId);
  }, [studentId, loadStudentData]);

  // Available months
  const allDates = [
    ...typingRecords.map((r) => r.date),
    ...retryRecords.map((r) => r.date),
    ...homeworkRecords.map((r) => r.date),
  ];
  const availableMonths = [...new Set(allDates.map((d) => d.substring(0, 7)))].sort().reverse();
  if (availableMonths.length === 0) availableMonths.push(format(new Date(), 'yyyy-MM'));

  // Period filtering
  const currentRange = getMonthRange(selectedMonth);
  const prevRange = getPreviousMonthRange(selectedMonth);

  const monthTyping = getRecordsInPeriod(typingRecords, currentRange.start, currentRange.end);
  const monthRetry = getRecordsInPeriod(retryRecords, currentRange.start, currentRange.end);
  const monthHomework = getRecordsInPeriod(homeworkRecords, currentRange.start, currentRange.end);
  const prevTypingRecs = getRecordsInPeriod(typingRecords, prevRange.start, prevRange.end);
  const prevRetryRecs = getRecordsInPeriod(retryRecords, prevRange.start, prevRange.end);

  // Computed analytics
  const curTyping = calcTypingSummary(monthTyping);
  const prevTyping = calcTypingSummary(prevTypingRecs);
  const curRetry = calcRetrySummary(monthRetry, course || undefined);
  const prevRetry = calcRetrySummary(prevRetryRecs, course || undefined);
  const curHomework = calcHomeworkSummary(monthHomework);
  const mastery = calcKnowledgeMastery(knowledge, retryRecords, course || undefined);
  const weakKPs = getWeakKnowledgePoints(mastery);
  const strongKPs = getStrongKnowledgePoints(mastery);
  const autoTags = generateAutoTags(
    curTyping,
    prevTyping,
    curRetry,
    prevRetry,
    curHomework,
    mastery
  );
  const speedImprove = calcTypingImprovement(curTyping, prevTyping);

  // Auto-fill on first load
  useEffect(() => {
    if (student && !teacherComment) {
      const recommended = recommendCommentTemplate(autoTags);
      setTeacherComment(recommended.content);
    }
  }, [student, autoTags, teacherComment]);

  useEffect(() => {
    if (student && !nextMonthGoal) {
      const suggestions = generateStudySuggestions(weakKPs, curRetry, curTyping);
      setNextMonthGoal(suggestions.slice(0, 2).join('\n'));
    }
  }, [student, weakKPs, curRetry, curTyping, nextMonthGoal]);

  const monthLabel = format(new Date(selectedMonth + '-01'), 'M月', { locale: zhCN });
  const fullMonthLabel = format(new Date(selectedMonth + '-01'), 'yyyy年M月', { locale: zhCN });

  // Chart data
  const weeklyTypingData = getTypingWeeklyData(typingRecords, selectedMonth);

  // Problem retry comparison for report
  const retryProblems = curRetry.problems;

  // Best homework
  const bestHomework =
    monthHomework.length > 0
      ? monthHomework.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b))
      : null;

  // Growth description
  const growthDesc = student
    ? generateGrowthDescription(student.name, curTyping, prevTyping, curRetry, mastery, monthLabel)
    : '';

  // Study suggestions
  const suggestions = generateStudySuggestions(weakKPs, curRetry, curTyping);

  // ===== PDF Export =====
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(
        `${student?.name || '学员'}_${fullMonthLabel}学习报告.pdf`
      );
    } catch (err) {
      console.error('PDF导出失败:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // ===== Batch mode =====
  const handleBatchMode = () => {
    const allStudents = getStudents();
    setBatchStudentIds(allStudents.map((s) => s.id));
    setBatchCurrentIdx(0);
    setBatchMode(true);
    if (allStudents.length > 0) {
      loadStudentData(allStudents[0].id);
    }
  };

  const handleBatchNext = () => {
    const nextIdx = batchCurrentIdx + 1;
    if (nextIdx < batchStudentIds.length) {
      setBatchCurrentIdx(nextIdx);
      loadStudentData(batchStudentIds[nextIdx]);
      setTeacherComment('');
      setNextMonthGoal('');
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">学生不存在</p>
      </div>
    );
  }

  const highlightTags = autoTags.filter((t) => t.type === 'highlight');
  const weaknessTags = autoTags.filter((t) => t.type === 'weakness');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">
              {batchMode
                ? `批量报告 (${batchCurrentIdx + 1}/${batchStudentIds.length})`
                : '月度学习报告'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
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
            {!batchMode && (
              <Button
                size="sm"
                variant="outline"
                className="border-violet-200 text-violet-600"
                onClick={handleBatchMode}
              >
                <Users className="h-4 w-4 mr-1" />
                批量生成
              </Button>
            )}
            {batchMode && batchCurrentIdx < batchStudentIds.length - 1 && (
              <Button
                size="sm"
                variant="outline"
                className="border-violet-200 text-violet-600"
                onClick={handleBatchNext}
              >
                下一位
              </Button>
            )}
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-indigo-500"
              onClick={exportPDF}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {isExporting ? '导出中...' : '导出PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== Edit Panel (above report) ===== */}
        <Card className="border-violet-100">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-500" />
              报告内容编辑
            </h3>

            {/* Comment Templates */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                老师寄语（系统推荐模板，可修改）
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMENT_TEMPLATES.map((tmpl) => (
                  <Button
                    key={tmpl.id}
                    size="sm"
                    variant="outline"
                    className={`text-xs h-7 ${
                      teacherComment === tmpl.content
                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                        : 'text-gray-500'
                    }`}
                    onClick={() => setTeacherComment(tmpl.content)}
                  >
                    {tmpl.label}
                  </Button>
                ))}
              </div>
              <Textarea
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="输入老师寄语..."
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                下月目标建议
              </label>
              <Textarea
                value={nextMonthGoal}
                onChange={(e) => setNextMonthGoal(e.target.value)}
                className="min-h-[60px] text-sm"
                placeholder="输入下月目标..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ===== Report Preview ===== */}
        <div ref={reportRef} className="bg-white rounded-2xl shadow-sm border border-purple-50 overflow-hidden">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{student.name} · {fullMonthLabel}学习报告</h2>
                <p className="text-violet-100 text-sm">
                  {course?.name || '编程课程'} | 编程学习月度反馈
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-violet-100">报告日期</p>
                <p className="text-lg font-semibold">{format(new Date(), 'yyyy.M.d')}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-8">
            {/* 1. Knowledge Mastery Table */}
            <section>
              <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="一、知识点及掌握情况" />
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-violet-50/60">
                      <th className="px-4 py-2.5 text-left text-violet-800 font-medium w-1/4">知识点</th>
                      <th className="px-4 py-2.5 text-left text-violet-800 font-medium w-2/5">掌握情况</th>
                      <th className="px-4 py-2.5 text-center text-violet-800 font-medium w-1/4">掌握度</th>
                      <th className="px-4 py-2.5 text-center text-violet-800 font-medium w-1/6">评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mastery.map((m, idx) => (
                      <tr
                        key={m.knowledgePointId}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${
                          m.isWeak ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium">{m.knowledgePointName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {knowledge.find((k) => k.knowledgePointId === m.knowledgePointId)?.description || KNOWLEDGE_STATUS_LABELS[m.status as keyof typeof KNOWLEDGE_STATUS_LABELS] || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${m.masteryPercent}%`,
                                  backgroundColor:
                                    m.masteryPercent >= 80
                                      ? '#10b981'
                                      : m.masteryPercent >= 40
                                      ? '#f59e0b'
                                      : '#ef4444',
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                m.masteryPercent >= 80
                                  ? 'text-emerald-600'
                                  : m.masteryPercent >= 40
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {m.masteryPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">{m.score || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. Ability Testing */}
            <section>
              <SectionTitle icon={<Zap className="h-5 w-5" />} title="二、能力测试情况" />

              {/* Typing Test */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-violet-500" />
                  打字测试
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-violet-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-violet-600">{curTyping.avgSpeed}</p>
                    <p className="text-xs text-muted-foreground mt-1">平均速度(字/分)</p>
                    {speedImprove !== 0 && (
                      <p
                        className={`text-xs font-medium mt-1 ${
                          speedImprove > 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {speedImprove > 0 ? '↑' : '↓'} 较上月{speedImprove > 0 ? '提升' : '下降'}
                        {Math.abs(speedImprove)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{curTyping.avgAccuracy}%</p>
                    <p className="text-xs text-muted-foreground mt-1">平均正确率</p>
                  </div>
                </div>

                {/* Weekly Summary Table */}
                {weeklyTypingData.some((w) => w.count > 0) && (
                  <div className="overflow-hidden rounded-lg border border-gray-100 mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium">周次</th>
                          <th className="px-3 py-2 text-center font-medium">平均速度</th>
                          <th className="px-3 py-2 text-center font-medium">平均正确率</th>
                          <th className="px-3 py-2 text-center font-medium">测试次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTypingData.map((w) =>
                          w.count > 0 ? (
                            <tr key={w.week} className="border-t border-gray-50">
                              <td className="px-3 py-2 font-medium">{w.week}</td>
                              <td className="px-3 py-2 text-center font-bold text-violet-600">
                                {w.avgSpeed}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-emerald-600">
                                {w.avgAccuracy}%
                              </td>
                              <td className="px-3 py-2 text-center text-muted-foreground">{w.count}次</td>
                            </tr>
                          ) : null
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Typing Chart */}
                {monthTyping.length >= 2 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={monthTyping
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((r) => ({
                          date: format(new Date(r.date), 'M/d'),
                          speed: r.speed,
                          accuracy: r.accuracy,
                        }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ff" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="speed" stroke="#7c3aed" strokeWidth={2} name="速度" />
                      <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="正确率" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Retry Test */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-500" />
                  三刷测试
                </h4>
                {retryProblems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{monthLabel}暂无三刷记录</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50/60">
                          <th className="px-3 py-2 text-left font-medium">测试题</th>
                          <th className="px-3 py-2 text-center font-medium">首次用时</th>
                          <th className="px-3 py-2 text-center font-medium">最新用时</th>
                          <th className="px-3 py-2 text-center font-medium">提升</th>
                          <th className="px-3 py-2 text-left font-medium">关联知识点</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retryProblems.map((p, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                            <td className="px-3 py-2 font-medium">{p.problemName}</td>
                            <td className="px-3 py-2 text-center text-muted-foreground">{p.firstTime}分钟</td>
                            <td className="px-3 py-2 text-center font-bold">{p.lastTime}分钟</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`font-bold ${
                                  p.improvement > 0 ? 'text-emerald-600' : 'text-red-500'
                                }`}
                              >
                                {p.improvement > 0 ? '+' : ''}
                                {p.improvement}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{p.knowledgePoint || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Growth Trajectory */}
            <section>
              <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="三、差异化成长轨迹" />

              {/* Key Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-violet-600">{curTyping.count}</p>
                  <p className="text-xs text-muted-foreground">打字测试次数</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{curRetry.count}</p>
                  <p className="text-xs text-muted-foreground">三刷测试次数</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{curHomework.count}</p>
                  <p className="text-xs text-muted-foreground">作业完成次数</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">
                    {strongKPs.length}/{mastery.length}
                  </p>
                  <p className="text-xs text-muted-foreground">知识点达标</p>
                </div>
              </div>

              {/* Auto-generated description */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">{growthDesc}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {highlightTags.map((tag, i) => (
                  <Badge key={i} className="bg-emerald-50 text-emerald-700 border-0 text-xs px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    {tag.label}
                  </Badge>
                ))}
                {weaknessTags.map((tag, i) => (
                  <Badge key={i} className="bg-amber-50 text-amber-700 border-0 text-xs px-3 py-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </section>

            {/* 4. Home-School Co-education */}
            <section>
              <SectionTitle icon={<Users className="h-5 w-5" />} title="四、家校共育" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-violet-50 rounded-xl p-4">
                  <h5 className="font-semibold text-violet-800 text-sm mb-2">陪伴创新</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    鼓励家长陪伴孩子探索编程项目，在创意实现中培养逻辑思维和创新能力
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h5 className="font-semibold text-emerald-800 text-sm mb-2">学业跟进</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    关注孩子每周的打字速度和做题进步情况，及时给予肯定和鼓励
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <h5 className="font-semibold text-amber-800 text-sm mb-2">成果互动</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    与孩子一起回顾编程作品和作业成果，让孩子讲解实现思路，巩固学习效果
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h5 className="font-semibold text-blue-800 text-sm mb-2">引导表达</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    引导孩子用语言描述编程思路，把抽象代码转化为可表达的逻辑，提升理解深度
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Best Work */}
            {bestHomework && (
              <section>
                <SectionTitle icon={<Star className="h-5 w-5" />} title="五、本月最佳作品" />
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {bestHomework.imageUrl && (
                      <img
                        src={bestHomework.imageUrl}
                        alt="作品"
                        className="w-32 h-32 object-cover rounded-lg shadow-sm"
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-800 mb-1">
                        {bestHomework.title}
                        {bestHomework.score != null && (
                          <span className="ml-2 text-sm text-violet-600 font-normal">
                            评分：{bestHomework.score}
                          </span>
                        )}
                      </h5>
                      {bestHomework.content && (
                        <p className="text-sm text-muted-foreground mb-2">{bestHomework.content}</p>
                      )}
                      {bestHomework.comment && (
                        <p className="text-sm text-gray-600 italic bg-white/50 rounded-lg px-3 py-2">
                          老师点评：&ldquo;{bestHomework.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Teacher Comment */}
            <section>
              <SectionTitle icon={<MessageSquare className="h-5 w-5" />} title="六、老师寄语" />
              <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 rounded-xl p-5 border border-violet-100">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{teacherComment}</p>
                <p className="text-right text-sm text-muted-foreground mt-4">—— 编程老师</p>
              </div>
            </section>

            {/* 7. Next Month Goals */}
            <section>
              <SectionTitle icon={<Target className="h-5 w-5" />} title="七、下月目标" />
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
                {nextMonthGoal.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    {line}
                  </p>
                ))}
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-100">
              <p className="text-xs text-muted-foreground">
                CodeTracker · 少儿编程学习追踪系统 | 报告生成时间：{format(new Date(), 'yyyy年M月d日')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
      <span className="text-violet-500">{icon}</span>
      {title}
    </h3>
  );
}
