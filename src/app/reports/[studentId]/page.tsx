'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Heart, BookOpen, Sparkles, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  Student,
  Course,
  TypingRecord,
  ProblemRetryRecord,
  HomeworkRecord,
  KnowledgeProgress,
  ProblemDef,
} from '@/lib/types';
import {
  getStudents,
  getCourse,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
} from '@/lib/store';
import { KNOWLEDGE_STATUS_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const reportRef = useRef<HTMLDivElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [typingRecords, setTypingRecords] = useState<TypingRecord[]>([]);
  const [retryRecords, setRetryRecords] = useState<ProblemRetryRecord[]>([]);
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeProgress[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [teacherMessage, setTeacherMessage] = useState('');
  const [nextGoals, setNextGoals] = useState('');
  const [pdfExporting, setPdfExporting] = useState(false);

  const loadData = useCallback(() => {
    const s = getStudents().find((s) => s.id === studentId);
    setStudent(s || null);
    if (s) {
      const c = getCourse(s.courseId);
      setCourse(c || null);
    }
    setTypingRecords(getTypingByStudent(studentId));
    setRetryRecords(getRetryByStudent(studentId));
    setHomeworkRecords(getHomeworkByStudent(studentId));
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

  // Filter records for selected month
  const monthTyping = typingRecords.filter((r) => r.date.startsWith(selectedMonth));
  const monthRetry = retryRecords.filter((r) => r.date.startsWith(selectedMonth));
  const monthHomework = homeworkRecords.filter((r) => r.date.startsWith(selectedMonth));

  // ===== Knowledge table data (template: 知识点 + 掌握情况 + 评分) =====
  const courseKnowledge = knowledge.filter((k) => k.courseId === student.courseId);
  const knowledgeTableData = courseKnowledge.map((k) => {
    const kpDef = course?.knowledgePoints.find((kp) => kp.id === k.knowledgePointId);
    return {
      name: k.knowledgePointName,
      status: k.status,
      score: k.score,
      description: k.description || kpDef?.description || getStatusDefaultDesc(k.status, k.knowledgePointName),
    };
  });

  function getStatusDefaultDesc(status: string, name: string): string {
    if (status === 'mastered') return `${name}已经基本掌握，理解到位，后续继续巩固练习即可`;
    if (status === 'learning') return `${name}正在学习中，还需要加强练习和理解`;
    return `${name}尚未开始学习`;
  }

  // ===== Typing weekly data (template: 第一周/第二周/第三周/第四周) =====
  const typingByWeek: Record<string, TypingRecord[]> = {};
  monthTyping
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((r) => {
      const weekNum = Math.ceil(new Date(r.date).getDate() / 7);
      const weekKey = `第${['一', '二', '三', '四', '五'][weekNum - 1] || weekNum}周`;
      if (!typingByWeek[weekKey]) typingByWeek[weekKey] = [];
      typingByWeek[weekKey].push(r);
    });

  const weeklyTypingSummary = Object.entries(typingByWeek).map(([week, records]) => {
    const avgSpeed = Math.round(records.reduce((s, r) => s + r.speed, 0) / records.length);
    const avgAccuracy = Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length);
    return { week, avgSpeed, avgAccuracy, count: records.length };
  });

  // Typing chart data
  const typingChartData = monthTyping
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(new Date(r.date), 'M/d'),
      speed: r.speed,
      accuracy: r.accuracy,
    }));

  // ===== Problem retry table (template: 测试题 + 提升情况 + 测试知识点) =====
  const problemMap = new Map<string, ProblemDef>();
  course?.problems.forEach((p) => problemMap.set(p.id, p));

  const retryTableData = (() => {
    const grouped = new Map<string, ProblemRetryRecord[]>();
    monthRetry.forEach((r) => {
      const key = r.problemId || r.problemName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    return Array.from(grouped.entries()).map(([key, attempts]) => {
      const sorted = attempts.sort((a, b) => a.attempt - b.attempt);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const pct = first.timeSpent > 0
        ? Math.round(((first.timeSpent - last.timeSpent) / first.timeSpent) * 100)
        : 0;
      const problemDef = problemMap.get(key);
      const knowledgePointName = problemDef?.knowledgePointId
        ? course?.knowledgePoints.find((kp) => kp.id === problemDef.knowledgePointId)?.name || ''
        : '';

      return {
        problemName: first.problemName,
        firstTime: first.timeSpent,
        lastTime: last.timeSpent,
        firstAttempt: first.attempt,
        lastAttempt: last.attempt,
        improvement: pct,
        knowledgePoint: knowledgePointName,
      };
    });
  })();

  // Monthly speed trend (up or down) - needed before growthTrajectory
  const monthlySpeedTrend = (() => {
    if (monthTyping.length < 2) return 0;
    const sorted = [...monthTyping].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0].speed;
    const last = sorted[sorted.length - 1].speed;
    return first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  })();

  // ===== Growth trajectory (template: 差异化成长轨迹) =====
  const growthTrajectory = (() => {
    const traits: string[] = [];
    const mastered = knowledgeTableData.filter((k) => k.status === 'mastered');
    const learning = knowledgeTableData.filter((k) => k.status === 'learning');

    if (mastered.length > learning.length) {
      traits.push('基础知识掌握扎实');
    }
    if (retryTableData.some((r) => r.improvement > 30)) {
      traits.push('做题效率提升显著');
    }
    if (retryTableData.length > 0 && retryTableData.every((r) => r.improvement > 0)) {
      traits.push('各题型均有进步');
    }
    if (monthlySpeedTrend > 0) {
      traits.push('打字速度持续提升');
    }
    if (mastered.length >= 3) {
      traits.push('知识面覆盖广泛');
    }

    const strongPoints = retryTableData
      .filter((r) => r.improvement > 20)
      .map((r) => r.problemName);

    let summary = `${student.name}`;
    if (traits.length > 0) {
      summary += `本月表现${traits.slice(0, 3).join('，')}`;
    }
    if (strongPoints.length > 0) {
      summary += `，在${strongPoints.slice(0, 2).join('、')}等题型上进步突出`;
    }
    if (mastered.length > 0) {
      summary += `。已扎实掌握${mastered.map((k) => k.name).join('、')}等知识点`;
    }
    if (learning.length > 0) {
      summary += `，${learning.map((k) => k.name).join('、')}仍在学习中，需要继续加强`;
    }
    summary += '。';
    return summary;
  })();

  // Best homework
  const bestHomework = monthHomework.length > 0
    ? monthHomework.reduce((best, h) => ((h.score ?? 0) > (best.score ?? 0) ? h : best))
    : null;

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

  // PDF export
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setPdfExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      const pageHeight = 297;

      while (position < imgHeight) {
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          -position,
          imgWidth,
          imgHeight
        );
        position += pageHeight;
        if (position < imgHeight) {
          pdf.addPage();
        }
      }

      const monthLabel = format(new Date(selectedMonth + '-01'), 'yyyy年M月', { locale: zhCN });
      pdf.save(`${student.name}_${monthLabel}_学习报告.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  const monthLabel = format(new Date(selectedMonth + '-01'), 'M月', { locale: zhCN });
  const totalSessions = monthTyping.length + monthRetry.length + monthHomework.length;

  // Score color helper
  const scoreColor = (score: number) => {
    if (score >= 9) return 'text-emerald-600';
    if (score >= 7) return 'text-blue-600';
    if (score >= 5) return 'text-amber-600';
    return 'text-red-500';
  };

  const scoreBg = (score: number) => {
    if (score >= 9) return 'bg-emerald-50';
    if (score >= 7) return 'bg-blue-50';
    if (score >= 5) return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/students/${studentId}`)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              月度学习报告 - {student.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
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
              className="bg-violet-600 hover:bg-violet-700"
              onClick={handleExportPDF}
              disabled={pdfExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {pdfExporting ? '导出中...' : '导出PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Editable fields (not in PDF) */}
        <div className="no-print mb-6 space-y-4">
          <Card className="border-purple-100 bg-gradient-to-r from-violet-50 to-indigo-50">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-violet-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                编辑报告内容（仅编辑区可见，导出PDF时自动包含）
              </h3>
              <div>
                <Label className="text-violet-700">教师暖心寄语</Label>
                <Textarea
                  value={teacherMessage}
                  onChange={(e) => setTeacherMessage(e.target.value)}
                  placeholder="写一段鼓励的话给家长和孩子..."
                  rows={3}
                  className="bg-white border-violet-200"
                />
              </div>
              <div>
                <Label className="text-violet-700">下月目标建议</Label>
                <Textarea
                  value={nextGoals}
                  onChange={(e) => setNextGoals(e.target.value)}
                  placeholder="建议下个月的学习目标和方向..."
                  rows={2}
                  className="bg-white border-violet-200"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Report Preview (PDF content) ===== */}
        <div ref={reportRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Report Cover Header */}
          <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white px-10 py-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative">
              <p className="text-violet-200 text-sm tracking-wider mb-1">
                {course?.name || '少儿编程'} · 月度学习报告
              </p>
              <h2 className="text-3xl font-bold mb-4">{student.name}</h2>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-violet-200">
                  课&emsp;&emsp;程：{course?.name || '-'}
                </span>
                <span className="text-violet-200">
                  班&emsp;&emsp;级：{student.className || '-'}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm mt-1">
                <span className="text-violet-200">
                  报告月份：{format(new Date(selectedMonth + '-01'), 'yyyy年M月', { locale: zhCN })}
                </span>
                <span className="text-violet-200">
                  本月练习：{totalSessions}次
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10 space-y-10">
            {/* ===== Section 1: 知识点及掌握情况 ===== */}
            <section>
              <SectionTitle month={monthLabel} title="所学知识点及掌握情况" color="violet" />
              <div className="overflow-hidden rounded-xl border border-purple-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-50 to-purple-50">
                      <th className="text-left px-4 py-3 font-semibold text-violet-800 w-1/5">知识点</th>
                      <th className="text-left px-4 py-3 font-semibold text-violet-800">掌握情况</th>
                      <th className="text-center px-4 py-3 font-semibold text-violet-800 w-16">评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {knowledgeTableData.length > 0 ? knowledgeTableData.map((k, i) => (
                      <tr
                        key={k.name}
                        className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-t border-purple-50`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                        <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                          {k.description}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {k.score ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${scoreColor(k.score)} ${scoreBg(k.score)}`}>
                              {k.score}
                            </span>
                          ) : (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                              k.status === 'mastered' ? 'bg-emerald-50 text-emerald-600' :
                              k.status === 'learning' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {KNOWLEDGE_STATUS_LABELS[k.status]}
                            </span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr className="border-t border-purple-50">
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          暂无知识点记录，请在学生详情页标记知识点状态
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Section 2: 能力测试情况 ===== */}
            <section>
              <SectionTitle month={monthLabel} title="能力测试情况" color="blue" />

              {/* 2a: 打字测试 */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-0.5 h-4 bg-blue-400 rounded-full" />
                  打字测试
                </h4>

                {weeklyTypingSummary.length > 0 ? (
                  <div className="space-y-3">
                    {/* Weekly summary table */}
                    <div className="overflow-hidden rounded-lg border border-blue-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-blue-50/60">
                            <th className="px-4 py-2 text-left text-blue-800 font-medium">周次</th>
                            <th className="px-4 py-2 text-center text-blue-800 font-medium">平均速度</th>
                            <th className="px-4 py-2 text-center text-blue-800 font-medium">平均正确率</th>
                            <th className="px-4 py-2 text-center text-blue-800 font-medium">测试次数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyTypingSummary.map((w) => (
                            <tr key={w.week} className="border-t border-blue-50">
                              <td className="px-4 py-2 font-medium">{w.week}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-violet-600">{w.avgSpeed}</span>
                                <span className="text-muted-foreground text-xs ml-1">字/分</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-bold text-emerald-600">{w.avgAccuracy}</span>
                                <span className="text-muted-foreground text-xs ml-1">%</span>
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground">{w.count}次</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Typing chart */}
                    {typingChartData.length >= 2 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={typingChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="speed"
                              stroke="#7c3aed"
                              strokeWidth={2}
                              dot={{ fill: '#7c3aed', r: 3 }}
                              name="打字速度(字/分)"
                            />
                            <Line
                              type="monotone"
                              dataKey="accuracy"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={{ fill: '#10b981', r: 3 }}
                              name="正确率(%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">本月暂无打字测试记录</p>
                )}
              </div>

              {/* 2b: 三刷测试 */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-0.5 h-4 bg-amber-400 rounded-full" />
                  三刷测试
                </h4>

                {retryTableData.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-amber-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50/60">
                          <th className="px-4 py-2 text-left text-amber-800 font-medium">测试题</th>
                          <th className="px-4 py-2 text-center text-amber-800 font-medium">提升情况</th>
                          <th className="px-4 py-2 text-center text-amber-800 font-medium">测试知识点</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retryTableData.map((r) => (
                          <tr key={r.problemName} className="border-t border-amber-50">
                            <td className="px-4 py-2.5 font-medium text-foreground">{r.problemName}</td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-amber-600 font-bold">{r.firstTime}分</span>
                                <span className="text-gray-300">&rarr;</span>
                                <span className="text-emerald-600 font-bold">{r.lastTime}分</span>
                                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                  r.improvement > 0
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-red-500'
                                }`}>
                                  {r.improvement > 0 ? '+' : ''}{r.improvement}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">
                              {r.knowledgePoint || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">本月暂无三刷测试记录</p>
                )}
              </div>
            </section>

            {/* ===== Section 3: 差异化成长轨迹 ===== */}
            <section>
              <SectionTitle month={monthLabel} title="差异化成长轨迹" color="emerald" />
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                {totalSessions > 0 ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-foreground leading-relaxed text-sm">{growthTrajectory}</p>
                    </div>
                    {/* Key metrics summary */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {monthlySpeedTrend !== 0 && (
                        <MetricCard
                          label="打字速度趋势"
                          value={`${monthlySpeedTrend > 0 ? '+' : ''}${monthlySpeedTrend}%`}
                          positive={monthlySpeedTrend > 0}
                        />
                      )}
                      {retryTableData.length > 0 && (
                        <MetricCard
                          label="平均提升幅度"
                          value={`${Math.round(retryTableData.reduce((s, r) => s + r.improvement, 0) / retryTableData.length)}%`}
                          positive
                        />
                      )}
                      {knowledgeTableData.filter((k) => k.status === 'mastered').length > 0 && (
                        <MetricCard
                          label="已掌握知识点"
                          value={`${knowledgeTableData.filter((k) => k.status === 'mastered').length}/${knowledgeTableData.length}`}
                          positive
                        />
                      )}
                      {monthHomework.length > 0 && (
                        <MetricCard
                          label="作业完成"
                          value={`${monthHomework.length}次`}
                          positive
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">本月暂无学习数据</p>
                )}
              </div>
            </section>

            {/* ===== Section 4: 家校共育 ===== */}
            <section>
              <SectionTitle month={monthLabel} title="家校共育" color="pink" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <h4 className="font-semibold text-pink-800 text-sm">陪伴创新</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    建议预留专属亲子陪伴时间，支持孩子在家开展自主创新实践项目，以项目式学习深化知识点的理解与内化，在实践中巩固课堂所学，培养创新思维与问题解决能力。
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <h4 className="font-semibold text-blue-800 text-sm">学业跟进</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    陪伴并引导孩子每周高效完成课后巩固练习，通过有规划的复习夯实课堂所学知识点，帮助孩子建立稳定的学习节奏，逐步提升知识掌握的扎实度。
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold text-amber-800 text-sm">成果互动</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    邀请孩子在家中分享月度学习成果，并共同体验作品功能，在沉浸式互动中感受孩子的创意成长，强化孩子的成就感与表达欲。
                  </p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-violet-500" />
                    <h4 className="font-semibold text-violet-800 text-sm">引导表达</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    多问孩子&ldquo;你最喜欢这个作品里的哪个功能？&rdquo;或者&ldquo;你是如何实现让怪兽跑出来的？&rdquo;，引导孩子用语言表达编程思路，加深理解。
                  </p>
                </div>
              </div>
            </section>

            {/* ===== Section 5: 本月最佳作品 ===== */}
            {bestHomework && (
              <section>
                <SectionTitle month={monthLabel} title="本月最佳作品" color="amber" />
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                  <h4 className="font-medium text-foreground mb-3">{bestHomework.title}</h4>
                  {bestHomework.imageUrl && (
                    <img
                      src={bestHomework.imageUrl}
                      alt="最佳作品"
                      className="max-w-full max-h-64 rounded-lg mx-auto shadow-md mb-3"
                    />
                  )}
                  {bestHomework.content && (
                    <p className="text-sm text-muted-foreground mb-2">{bestHomework.content}</p>
                  )}
                  {bestHomework.comment && (
                    <p className="text-sm text-amber-700 italic bg-white/60 rounded-lg px-4 py-2">
                      &ldquo;{bestHomework.comment}&rdquo;
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ===== Section 6: 教师寄语 ===== */}
            {teacherMessage && (
              <section>
                <SectionTitle month={monthLabel} title="老师寄语" color="violet" />
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-100">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                    {teacherMessage}
                  </p>
                </div>
              </section>
            )}

            {/* ===== Section 7: 下月目标 ===== */}
            {nextGoals && (
              <section>
                <SectionTitle month={monthLabel} title="下月目标" color="indigo" />
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                    {nextGoals}
                  </p>
                </div>
              </section>
            )}

            {/* Empty state */}
            {totalSessions === 0 && (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-2">
                  {format(new Date(selectedMonth + '-01'), 'yyyy年M月', { locale: zhCN })} 暂无学习记录
                </p>
                <p className="text-sm text-muted-foreground">
                  请先在工作台添加学习记录
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-10 py-4 text-center text-xs text-muted-foreground border-t border-purple-50">
            CodeTracker 少儿编程学习追踪系统 | 报告生成时间：{format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
        </div>
      </main>
    </div>
  );
}

// ===== Sub-components =====

function SectionTitle({ month, title, color }: { month: string; title: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500 to-purple-500',
    blue: 'from-blue-500 to-indigo-500',
    emerald: 'from-emerald-500 to-teal-500',
    pink: 'from-pink-500 to-rose-500',
    amber: 'from-amber-500 to-orange-500',
    indigo: 'from-indigo-500 to-blue-500',
  };
  const gradient = colorMap[color] || colorMap.violet;

  return (
    <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
      <span className={`w-1 h-6 rounded-full bg-gradient-to-b ${gradient}`} />
      <span className="text-muted-foreground font-normal text-sm mr-1">{month}</span>
      {title}
    </h3>
  );
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
      <p className={`text-lg font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
