'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft, Calendar, Download, Users, Star, AlertTriangle,
  BookOpen, Zap, Keyboard, RotateCcw, TrendingUp, MessageSquare, Target,
  CheckCircle, Scroll, Flame, Shield, Sparkles, Swords
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  getStudents, getCourse, getTypingByStudent, getRetryByStudent,
  getHomeworkByStudent, getKnowledgeByStudent,
} from '@/lib/store';
import {
  calcTypingSummary, calcRetrySummary, calcHomeworkSummary,
  calcKnowledgeMastery, getWeakKnowledgePoints, getStrongKnowledgePoints,
  generateAutoTags, calcTypingImprovement, getTypingWeeklyData,
  generateGrowthDescription, generateStudySuggestions, recommendCommentTemplate,
  getMonthRange, getPreviousMonthRange, getRecordsInPeriod,
} from '@/lib/analytics';
import { COMMENT_TEMPLATES, KNOWLEDGE_STATUS_LABELS } from '@/lib/constants';
import type {
  Student, Course, TypingRecord, ProblemRetryRecord, HomeworkRecord, KnowledgeProgress,
} from '@/lib/types';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [teacherComment, setTeacherComment] = useState('');
  const [nextMonthGoal, setNextMonthGoal] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchStudentIds, setBatchStudentIds] = useState<string[]>([]);
  const [batchCurrentIdx, setBatchCurrentIdx] = useState(0);

  // Report data
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
  const autoTags = generateAutoTags(curTyping, prevTyping, curRetry, prevRetry, curHomework, mastery);
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
  const retryProblems = curRetry.problems;
  const bestHomework =
    monthHomework.length > 0
      ? monthHomework.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b))
      : null;

  const growthDesc = student
    ? generateGrowthDescription(student.name, curTyping, prevTyping, curRetry, mastery, monthLabel)
    : '';

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
        backgroundColor: '#0f0f1a',
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

      pdf.save(`${student?.name || '学生'}_${fullMonthLabel}学习月报.pdf`);
    } catch (err) {
      console.error('导出PDF失败:', err);
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
        <p className="text-amber-300/60">未找到该学生信息...</p>
      </div>
    );
  }

  const highlightTags = autoTags.filter((t) => t.type === 'highlight');
  const weaknessTags = autoTags.filter((t) => t.type === 'weakness');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-amber-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9 text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-amber-300">
              {batchMode
                ? `批量传书 (${batchCurrentIdx + 1}/${batchStudentIds.length})`
                : '学习月报'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-9 text-sm bg-[#1a1a2e] border-amber-900/40 text-amber-300">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-amber-900/40">
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m} className="text-amber-300 focus:bg-amber-900/30 focus:text-amber-200">
                    {format(new Date(m + '-01'), 'yyyy年M月', { locale: zhCN })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!batchMode && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-900/40 text-amber-400 hover:bg-amber-900/20 hover:text-amber-300"
                onClick={handleBatchMode}
              >
                <Users className="h-4 w-4 mr-1" />
                批量传书
              </Button>
            )}
            {batchMode && batchCurrentIdx < batchStudentIds.length - 1 && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-900/40 text-amber-400 hover:bg-amber-900/20"
                onClick={handleBatchNext}
              >
                下一位学生
              </Button>
            )}
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-[#0f0f1a] font-bold hover:from-amber-500 hover:to-yellow-400"
              onClick={exportPDF}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {isExporting ? '生成中...' : '导出PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== Edit Panel ===== */}
        <div className="bg-[#1a1a2e]/80 border border-amber-900/30 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-300">
            <Scroll className="h-4 w-4" />
            老师批注
          </h3>

          {/* Comment Templates */}
          <div>
            <label className="text-xs text-amber-400/60 mb-1.5 block">
              老师寄语（系统推荐评语，可修改）
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMENT_TEMPLATES.map((tmpl) => (
                <Button
                  key={tmpl.id}
                  size="sm"
                  variant="outline"
                  className={`text-xs h-7 ${
                    teacherComment === tmpl.content
                      ? 'bg-amber-900/30 border-amber-500/50 text-amber-300'
                      : 'border-amber-900/30 text-amber-400/50 hover:text-amber-300 hover:bg-amber-900/20'
                  }`}
                  onClick={() => setTeacherComment(tmpl.content)}
                >
                  {tmpl.name}
                </Button>
              ))}
            </div>
            <Textarea
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              className="min-h-[80px] text-sm bg-[#0f0f1a]/60 border-amber-900/30 text-amber-200 placeholder:text-amber-400/30 focus:border-amber-500/50"
              placeholder="输入老师寄语..."
            />
          </div>

          <div>
            <label className="text-xs text-amber-400/60 mb-1.5 block">
              下月学习目标
            </label>
            <Textarea
              value={nextMonthGoal}
              onChange={(e) => setNextMonthGoal(e.target.value)}
              className="min-h-[60px] text-sm bg-[#0f0f1a]/60 border-amber-900/30 text-amber-200 placeholder:text-amber-400/30 focus:border-amber-500/50"
              placeholder="输入下月学习目标..."
            />
          </div>
        </div>

        {/* ===== Report Preview ===== */}
        <div ref={reportRef} className="bg-[#0f0f1a] rounded-2xl border border-amber-900/30 overflow-hidden">
          {/* Report Header - Scroll/Book Style */}
          <div className="relative bg-gradient-to-b from-[#2a1810] via-[#1a1a2e] to-[#0f0f1a] text-amber-200 px-8 py-8 overflow-hidden">
            {/* Decorative border pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            </div>

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <span className="text-xs text-amber-400/60 tracking-widest">修 炼 月 报</span>
                </div>
                <h2 className="text-2xl font-bold text-amber-300 mb-1" style={{ textShadow: '0 0 20px rgba(212,168,83,0.3)' }}>
                  {student.name} · {fullMonthLabel}学习纪要
                </h2>
                <p className="text-amber-400/50 text-sm">
                  {course?.name || '编程课程'} | 月度学习反馈
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-400/40">传书日期</p>
                <p className="text-lg font-semibold text-amber-300">{format(new Date(), 'yyyy.M.d')}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-8">
            {/* 1. Knowledge Mastery - 知识点掌握 */}
            <section>
              <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="一、知识点掌握" />
              <div className="overflow-hidden rounded-lg border border-amber-900/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-900/20">
                      <th className="px-4 py-2.5 text-left text-amber-400 font-medium w-1/4">知识点</th>
                      <th className="px-4 py-2.5 text-left text-amber-400 font-medium w-2/5">学习心得</th>
                      <th className="px-4 py-2.5 text-center text-amber-400 font-medium w-1/4">掌握度</th>
                      <th className="px-4 py-2.5 text-center text-amber-400 font-medium w-1/6">评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mastery.map((m, idx) => (
                      <tr
                        key={m.knowledgePointId}
                        className={`${idx % 2 === 0 ? 'bg-[#0f0f1a]' : 'bg-[#1a1a2e]/50'} ${
                          m.isWeak ? 'bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-amber-200">{m.knowledgePointName}</td>
                        <td className="px-4 py-2.5 text-amber-400/50 text-xs">
                          {knowledge.find((k) => k.knowledgePointId === m.knowledgePointId)?.description || KNOWLEDGE_STATUS_LABELS[m.status as keyof typeof KNOWLEDGE_STATUS_LABELS] || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-amber-900/20 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${m.masteryPercent}%`,
                                  backgroundColor:
                                    m.masteryPercent >= 80
                                      ? '#4ade80'
                                      : m.masteryPercent >= 40
                                      ? '#d4a853'
                                      : '#ef4444',
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                m.masteryPercent >= 80
                                  ? 'text-green-400'
                                  : m.masteryPercent >= 40
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {m.masteryPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-300">{m.score || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. Ability Testing - 功力测试 */}
            <section>
              <SectionTitle icon={<Zap className="h-5 w-5" />} title="二、能力测试 · 学习成果" />

              {/* Typing Test - 速度练习 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-amber-200 mb-3 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-amber-400" />
                  速度练习（打字）
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-amber-900/15 border border-amber-900/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-300">{curTyping.avgSpeed}</p>
                    <p className="text-xs text-amber-400/50 mt-1">平均速度(字/分)</p>
                    {speedImprove !== 0 && (
                      <p
                        className={`text-xs font-medium mt-1 ${
                          speedImprove > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {speedImprove > 0 ? '↑' : '↓'} 较上月{speedImprove > 0 ? '精进' : '退步'}
                        {Math.abs(speedImprove)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-green-900/15 border border-green-900/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{curTyping.avgAccuracy}%</p>
                    <p className="text-xs text-green-400/50 mt-1">心神专注（正确率）</p>
                  </div>
                </div>

                {/* Weekly Summary Table */}
                {weeklyTypingData.some((w) => w.count > 0) && (
                  <div className="overflow-hidden rounded-lg border border-amber-900/30 mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-900/15">
                          <th className="px-3 py-2 text-left font-medium text-amber-400">周次</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">平均速度</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">心神专注</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">练习次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTypingData.map((w) =>
                          w.count > 0 ? (
                            <tr key={w.week} className="border-t border-amber-900/15">
                              <td className="px-3 py-2 font-medium text-amber-200">{w.week}</td>
                              <td className="px-3 py-2 text-center font-bold text-amber-300">
                                {w.avgSpeed}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-green-400">
                                {w.avgAccuracy}%
                              </td>
                              <td className="px-3 py-2 text-center text-amber-400/50">{w.count}次</td>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#3a2a1a" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#d4a853' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#d4a853' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid #8b6914',
                          borderRadius: '8px',
                          color: '#d4a853',
                        }}
                      />
                      <Line type="monotone" dataKey="speed" stroke="#d4a853" strokeWidth={2} name="速度" />
                      <Line type="monotone" dataKey="accuracy" stroke="#4ade80" strokeWidth={2} name="心神专注" />
                      <Legend wrapperStyle={{ color: '#d4a853' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Retry Test - 三刷 */}
              <div>
                <h4 className="text-sm font-semibold text-amber-200 mb-3 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  三刷练习
                </h4>
                {retryProblems.length === 0 ? (
                  <p className="text-sm text-amber-400/40">{monthLabel}暂无三刷记录</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-amber-900/30">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-900/15">
                          <th className="px-3 py-2 text-left font-medium text-amber-400">题目</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">首次耗时</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">最新耗时</th>
                          <th className="px-3 py-2 text-center font-medium text-amber-400">精进</th>
                          <th className="px-3 py-2 text-left font-medium text-amber-400">关联知识点</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retryProblems.map((p, idx) => (
                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-[#0f0f1a]' : 'bg-[#1a1a2e]/30'}`}>
                            <td className="px-3 py-2 font-medium text-amber-200">{p.problemName}</td>
                            <td className="px-3 py-2 text-center text-amber-400/50">{p.firstTime}分钟</td>
                            <td className="px-3 py-2 text-center font-bold text-amber-300">{p.lastTime}分钟</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`font-bold ${
                                  p.improvement > 0 ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {p.improvement > 0 ? '+' : ''}
                                {p.improvement}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-amber-400/50">{p.knowledgePoint || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Growth Trajectory - 修炼蜕变 */}
            <section>
              <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="三、成长蜕变 · 进步轨迹" />

              {/* Key Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-amber-900/15 border border-amber-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-300">{curTyping.count}</p>
                  <p className="text-xs text-amber-400/50">速度练习次数</p>
                </div>
                <div className="bg-green-900/15 border border-green-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-400">{curRetry.count}</p>
                  <p className="text-xs text-green-400/50">三刷次数</p>
                </div>
                <div className="bg-purple-900/15 border border-purple-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-purple-400">{curHomework.count}</p>
                  <p className="text-xs text-purple-400/50">作业</p>
                </div>
                <div className="bg-blue-900/15 border border-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-400">
                    {strongKPs.length}/{mastery.length}
                  </p>
                  <p className="text-xs text-blue-400/50">知识点掌握</p>
                </div>
              </div>

              {/* Auto-generated description */}
              <div className="bg-gradient-to-r from-amber-900/10 to-purple-900/10 border border-amber-900/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-200/80 leading-relaxed">{growthDesc}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {highlightTags.map((tag, i) => (
                  <Badge key={i} className="bg-green-900/30 text-green-400 border-green-800/30 text-xs px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    {tag.label}
                  </Badge>
                ))}
                {weaknessTags.map((tag, i) => (
                  <Badge key={i} className="bg-amber-900/30 text-amber-400 border-amber-800/30 text-xs px-3 py-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </section>

            {/* 4. Home-School Co-education - 家宗共育 */}
            <section>
              <SectionTitle icon={<Shield className="h-5 w-5" />} title="四、家宗共育 · 携手修行" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-900/10 border border-amber-900/20 rounded-xl p-4">
                  <h5 className="font-semibold text-amber-300 text-sm mb-2 flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    陪伴学习
                  </h5>
                  <p className="text-xs text-amber-400/50 leading-relaxed">
                    鼓励家长陪伴孩子探索编程世界，在创意实践中培养逻辑思维与创新能力
                  </p>
                </div>
                <div className="bg-green-900/10 border border-green-900/20 rounded-xl p-4">
                  <h5 className="font-semibold text-green-400 text-sm mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    学习跟进
                  </h5>
                  <p className="text-xs text-green-400/50 leading-relaxed">
                    关注孩子每周的打字速度和三刷进步，及时给予肯定和鼓励
                  </p>
                </div>
                <div className="bg-purple-900/10 border border-purple-900/20 rounded-xl p-4">
                  <h5 className="font-semibold text-purple-400 text-sm mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    成果切磋
                  </h5>
                  <p className="text-xs text-purple-400/50 leading-relaxed">
                    与孩子一起回顾学习成果，让孩子讲解实现思路，巩固学习效果
                  </p>
                </div>
                <div className="bg-blue-900/10 border border-blue-900/20 rounded-xl p-4">
                  <h5 className="font-semibold text-blue-400 text-sm mb-2 flex items-center gap-1.5">
                    <Swords className="h-4 w-4" />
                    引导论道
                  </h5>
                  <p className="text-xs text-blue-400/50 leading-relaxed">
                    引导孩子用语言描述编程思路，将抽象代码化为可表达的想法，提升理解深度
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Best Work - 本月佳作 */}
            {bestHomework && (
              <section>
                <SectionTitle icon={<Star className="h-5 w-5" />} title="五、本月佳作 · 学习成果" />
                <div className="bg-gradient-to-r from-amber-900/10 to-purple-900/10 border border-amber-900/20 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {bestHomework.imageUrl && (
                      <img
                        src={bestHomework.imageUrl}
                        alt="作品"
                        className="w-32 h-32 object-cover rounded-lg border border-amber-900/30"
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="font-semibold text-amber-200 mb-1">
                        {bestHomework.title}
                        {bestHomework.score != null && (
                          <span className="ml-2 text-sm text-amber-400 font-normal">
                            评分：{bestHomework.score}
                          </span>
                        )}
                      </h5>
                      {bestHomework.content && (
                        <p className="text-sm text-amber-400/50 mb-2">{bestHomework.content}</p>
                      )}
                      {bestHomework.comment && (
                        <p className="text-sm text-amber-200/70 italic bg-amber-900/10 rounded-lg px-3 py-2 border border-amber-900/15">
                          老师点评：&ldquo;{bestHomework.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Teacher Comment - 老师寄语 */}
            <section>
              <SectionTitle icon={<MessageSquare className="h-5 w-5" />} title="六、老师寄语" />
              <div className="bg-gradient-to-br from-amber-900/10 via-[#1a1a2e]/50 to-purple-900/10 rounded-xl p-5 border border-amber-900/20">
                <p className="text-amber-200/80 leading-relaxed whitespace-pre-wrap">{teacherComment}</p>
                <p className="text-right text-sm text-amber-400/40 mt-4">—— 修行导师</p>
              </div>
            </section>

            {/* 7. Next Month Goals - 下月修炼 */}
            <section>
              <SectionTitle icon={<Target className="h-5 w-5" />} title="七、下月目标 · 方向指引" />
              <div className="bg-[#1a1a2e]/50 border border-amber-900/20 rounded-xl p-5 space-y-2">
                {nextMonthGoal.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-amber-200/70 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    {line}
                  </p>
                ))}
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-amber-900/20">
              <p className="text-xs text-amber-400/30">
                仙码录 · 少儿编程学习追踪系统 | 报告生成时间：{format(new Date(), 'yyyy年M月d日')}
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
    <h3 className="text-base font-bold text-amber-200 mb-4 flex items-center gap-2">
      <span className="text-amber-400">{icon}</span>
      {title}
    </h3>
  );
}
