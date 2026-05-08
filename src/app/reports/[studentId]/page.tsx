'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
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
  BarChart,
  Bar,
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

  // Typing chart data
  const typingChartData = monthTyping
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(new Date(r.date), 'M/d'),
      speed: r.speed,
      accuracy: r.accuracy,
    }));

  // Problem trend for the month
  const allProblemRetries = monthRetry;
  const problemNames = [...new Set(allProblemRetries.map((r) => r.problemName))];
  const problemTrendData = problemNames.map((name) => {
    const attempts = allProblemRetries
      .filter((r) => r.problemName === name)
      .sort((a, b) => a.attempt - b.attempt);
    return { problemName: name, attempts };
  });

  // Improvement cards
  const improvementCards = problemTrendData.map((pt) => {
    if (pt.attempts.length < 2) return null;
    const first = pt.attempts[0].timeSpent;
    const last = pt.attempts[pt.attempts.length - 1].timeSpent;
    const pct = Math.round(((first - last) / first) * 100);
    return {
      problemName: pt.problemName,
      firstTime: first,
      lastTime: last,
      improvement: pct,
    };
  }).filter(Boolean);

  // Knowledge status summary
  const knowledgeSummary = knowledge.map((k) => ({
    name: k.knowledgePointName,
    status: k.status,
  }));

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

  const monthLabel = format(new Date(selectedMonth + '-01'), 'yyyy年M月', { locale: zhCN });
  const totalSessions = monthTyping.length + monthRetry.length + monthHomework.length;

  return (
    <div className="min-h-screen">
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
              <SelectTrigger className="w-40">
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
        {/* Editable fields */}
        <div className="no-print mb-6 space-y-4">
          <Card className="border-purple-50">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label>教师暖心寄语</Label>
                <Textarea
                  value={teacherMessage}
                  onChange={(e) => setTeacherMessage(e.target.value)}
                  placeholder="写一段鼓励的话给家长和孩子..."
                  rows={3}
                />
              </div>
              <div>
                <Label>下月目标建议</Label>
                <Textarea
                  value={nextGoals}
                  onChange={(e) => setNextGoals(e.target.value)}
                  placeholder="建议下个月的学习目标和方向..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <div ref={reportRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white px-8 py-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-sm mb-1">
                  {course?.name || '少儿编程'}学习月度报告
                </p>
                <h2 className="text-3xl font-bold">{student.name}</h2>
                <p className="text-violet-200 mt-1">{monthLabel}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span className="text-2xl font-bold">{totalSessions}</span>
                  <span className="text-sm text-violet-200">次练习</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Typing Speed Progress */}
            {typingChartData.length >= 2 && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-violet-500 rounded-full" />
                  打字速度进步趋势
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={typingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Problem Improvement Cards */}
            {improvementCards.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-amber-500 rounded-full" />
                  题目三刷进步
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {improvementCards.map((card) => (
                    <div
                      key={card!.problemName}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100"
                    >
                      <h4 className="font-medium text-foreground mb-2">
                        {card!.problemName}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">
                            {card!.firstTime}
                          </p>
                          <p className="text-xs text-muted-foreground">首次(分钟)</p>
                        </div>
                        <div className="text-3xl text-amber-400">&rarr;</div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">
                            {card!.lastTime}
                          </p>
                          <p className="text-xs text-muted-foreground">最新(分钟)</p>
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-2xl font-bold ${
                              card!.improvement > 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {card!.improvement > 0 ? '+' : ''}
                            {card!.improvement}%
                          </p>
                          <p className="text-xs text-muted-foreground">提升</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Homework Summary */}
            {monthHomework.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-emerald-500 rounded-full" />
                  作业完成情况
                </h3>
                <div className="space-y-3">
                  {monthHomework.map((hw) => (
                    <div
                      key={hw.id}
                      className="bg-emerald-50 rounded-xl p-4 border border-emerald-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-foreground">{hw.title}</h4>
                        {hw.score != null && (
                          <span className="text-lg font-bold text-emerald-600">{hw.score}分</span>
                        )}
                      </div>
                      {hw.content && (
                        <p className="text-sm text-muted-foreground">{hw.content}</p>
                      )}
                      {hw.comment && (
                        <p className="text-sm text-emerald-700 mt-1 italic">
                          &ldquo;{hw.comment}&rdquo;
                        </p>
                      )}
                      {hw.imageUrl && (
                        <img
                          src={hw.imageUrl}
                          alt="作业"
                          className="max-w-full max-h-40 rounded-lg shadow-sm mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Knowledge Progress */}
            {knowledgeSummary.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full" />
                  知识点掌握情况
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {knowledgeSummary.map((k) => (
                    <div
                      key={k.name}
                      className={`rounded-lg p-3 text-center ${
                        k.status === 'mastered'
                          ? 'bg-emerald-50 border border-emerald-200'
                          : k.status === 'learning'
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <p
                        className={`text-xs mt-1 ${
                          k.status === 'mastered'
                            ? 'text-emerald-600'
                            : k.status === 'learning'
                            ? 'text-amber-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {KNOWLEDGE_STATUS_LABELS[k.status]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Best Work */}
            {bestHomework && bestHomework.imageUrl && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-pink-500 rounded-full" />
                  本月最佳作品
                </h3>
                <div className="bg-gradient-to-br from-pink-50 to-violet-50 rounded-xl p-4 border border-pink-100">
                  <img
                    src={bestHomework.imageUrl}
                    alt="最佳作品"
                    className="max-w-full max-h-64 rounded-lg mx-auto shadow-md"
                  />
                  {bestHomework.comment && (
                    <p className="text-center text-sm text-muted-foreground mt-3 italic">
                      &ldquo;{bestHomework.comment}&rdquo;
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Teacher Message */}
            {teacherMessage && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-violet-500 rounded-full" />
                  老师寄语
                </h3>
                <div className="bg-violet-50 rounded-xl p-6 border border-violet-100">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {teacherMessage}
                  </p>
                </div>
              </section>
            )}

            {/* Next Month Goals */}
            {nextGoals && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-indigo-500 rounded-full" />
                  下月目标
                </h3>
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {nextGoals}
                  </p>
                </div>
              </section>
            )}

            {/* Empty state */}
            {totalSessions === 0 && (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-2">
                  {monthLabel} 暂无学习记录
                </p>
                <p className="text-sm text-muted-foreground">
                  请先在工作台添加学习记录
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 text-center text-xs text-muted-foreground">
            CodeTracker 少儿编程学习追踪系统 | 报告生成时间：{format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
        </div>
      </main>
    </div>
  );
}
