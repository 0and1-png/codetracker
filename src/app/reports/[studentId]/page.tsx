'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Calendar, TrendingUp, Award, BookOpen, Users, MessageCircle, Target, FileText, User } from 'lucide-react';
import {
  getStudents,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
  getCourses,
} from '@/lib/store';
import type { Student, TypingRecord, ProblemRetryRecord, HomeworkRecord, KnowledgeProgress, Course } from '@/lib/types';
import { calcTypingSummary, calcRetrySummary, calcTypingImprovement, calcKnowledgeMastery, getStrongKnowledgePoints, getWeakKnowledgePoints } from '@/lib/analytics';
import { COMMENT_TEMPLATES, KNOWLEDGE_STATUS_LABELS } from '@/lib/constants';

type PeriodType = 'week' | 'month' | 'custom';

export default function ReportPage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allTyping, setAllTyping] = useState<TypingRecord[]>([]);
  const [allRetry, setAllRetry] = useState<ProblemRetryRecord[]>([]);
  const [allHomework, setAllHomework] = useState<HomeworkRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeProgress[]>([]);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const students = await getStudents();
    const s = students.find(st => st.id === studentId);
    if (!s) return;
    setStudent(s);

    const courses = await getCourses();
    const c = courses.find(co => co.id === s.courseId);
    setCourse(c || null);

    const typing = await getTypingByStudent(studentId);
    const retry = await getRetryByStudent(studentId);
    const homework = await getHomeworkByStudent(studentId);
    const know = await getKnowledgeByStudent(studentId);

    setAllTyping(typing);
    setAllRetry(retry);
    setAllHomework(homework);
    setKnowledge(know);
  }, [studentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getPeriodDates = () => {
    if (period === 'custom') {
      return { start: customStart, end: customEnd };
    }
    const now = new Date();
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const filterByPeriod = <T extends { date: string }>(records: T[]) =>
    records.filter(r => r.date >= periodStart && r.date <= periodEnd);

  const monthTyping = filterByPeriod(allTyping);
  const monthRetry = filterByPeriod(allRetry);
  const monthHomework = filterByPeriod(allHomework);

  const prevPeriodStart = (() => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return prevStart.toISOString().split('T')[0];
  })();
  const prevPeriodEnd = (() => {
    const start = new Date(periodStart);
    return new Date(start.getTime() - 86400000).toISOString().split('T')[0];
  })();

  const prevTyping = allTyping.filter(r => r.date >= prevPeriodStart && r.date <= prevPeriodEnd);
  const prevRetry = allRetry.filter(r => r.date >= prevPeriodStart && r.date <= prevPeriodEnd);

  const curTyping = calcTypingSummary(monthTyping);
  const prevTypingSummary = calcTypingSummary(prevTyping);
  const curRetry = calcRetrySummary(monthRetry, course || undefined);
  const typingImprovement = calcTypingImprovement(prevTypingSummary, curTyping);
  const knowledgeMastery = calcKnowledgeMastery(knowledge, allRetry, course || undefined);
  const strongPoints = getStrongKnowledgePoints(knowledgeMastery);
  const weakPoints = getWeakKnowledgePoints(knowledgeMastery);

  const periodLabel = period === 'week' ? '本周' : period === 'month' ? `${selectedMonth.replace('-', '年')}月` : '自定义周期';

  const exportPDF = async () => {
    if (!reportRef.current || !student) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;
      const x = (pdfWidth - width) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, width, height);
      const fileName = `${student.name}_${selectedMonth.replace('-', '年')}月_成长档案.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('导出PDF失败:', err);
      alert('导出PDF失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  if (!student) {
    return <div className="flex h-screen items-center justify-center"><div className="text-muted-foreground">加载中...</div></div>;
  }

  const getWeeklyTyping = () => {
    const weeks: { [key: string]: { speeds: number[]; accuracies: number[] } } = {};
    monthTyping.forEach(t => {
      const date = new Date(t.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekKey = `第${weekNum}周`;
      if (!weeks[weekKey]) weeks[weekKey] = { speeds: [], accuracies: [] };
      weeks[weekKey].speeds.push(t.speed);
      weeks[weekKey].accuracies.push(t.accuracy);
    });
    return Object.entries(weeks).map(([week, data]) => ({
      week,
      avgSpeed: Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length),
      avgAccuracy: Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length),
    }));
  };

  const getRetryComparison = () => {
    const problemStats: { [key: string]: { attempts: ProblemRetryRecord[] } } = {};
    monthRetry.forEach(r => {
      if (!problemStats[r.problemName]) problemStats[r.problemName] = { attempts: [] };
      problemStats[r.problemName].attempts.push(r);
    });
    return Object.entries(problemStats).map(([name, data]) => {
      const sorted = data.attempts.sort((a, b) => a.attempt - b.attempt);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const improvement = first && last && first.attempt !== last.attempt
        ? Math.round(((first.timeSpent - last.timeSpent) / first.timeSpent) * 100)
        : 0;
      return { name, firstTime: first?.timeSpent || 0, lastTime: last?.timeSpent || 0, improvement };
    });
  };

  const weeklyTyping = getWeeklyTyping();
  const retryComparison = getRetryComparison();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 控制栏 */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{student.name}的成长档案</h1>
                <p className="text-sm text-muted-foreground">{course?.name || '未分配课程'} · {periodLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodType)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="week">按周</option>
                  <option value="month">按月</option>
                  <option value="custom">自定义</option>
                </select>
                {period === 'month' && (
                  <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-36 h-9" />
                )}
                {period === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36 h-9" />
                    <span className="text-muted-foreground">至</span>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36 h-9" />
                  </div>
                )}
              </div>
              <Button onClick={exportPDF} disabled={exporting} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Download className="mr-2 h-4 w-4" />
                {exporting ? '导出中...' : '导出PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 报告预览区域 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div ref={reportRef} className="bg-white shadow-2xl rounded-lg overflow-hidden">
            
            {/* 封面页 */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-16 min-h-[800px] flex flex-col justify-center items-center relative">
              <div className="absolute top-8 right-8 text-right">
                <div className="text-sm opacity-80">战码编程</div>
                <div className="text-xs opacity-60">战码编程</div>
              </div>
              
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-6xl font-bold tracking-wider">战码少年</h1>
                  <div className="w-32 h-1 bg-white/50 mx-auto"></div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 space-y-6">
                  <div className="w-48 h-48 bg-white/20 rounded-full mx-auto flex items-center justify-center border-4 border-white/30">
                    <User className="h-24 w-24 text-white/60" />
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm opacity-80">姓名：</span>
                      <span className="text-xl font-semibold">{student.name}</span>
                    </div>
                    {student.notes && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm opacity-80">学校：</span>
                        <span className="text-lg">{student.notes}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-sm opacity-80">课程：</span>
                      <span className="text-lg">{course?.name || '编程'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm opacity-80">报告周期：</span>
                      <span className="text-lg">{periodLabel}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-8 space-y-2">
                  <p className="text-lg opacity-90">快乐学习 · 收获成长</p>
                  <p className="text-sm opacity-70">爱心施教 · 娃娃为王</p>
                </div>
              </div>
            </div>

            {/* 本月课程内容 */}
            <div className="p-12 min-h-[600px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-indigo-200">
                <BookOpen className="h-8 w-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-800">本月课程内容</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">知识点掌握情况</h3>
                  <div className="space-y-3">
                    {knowledge.length > 0 ? knowledge.map((kp) => {
                      const kpDef = course?.knowledgePoints.find(k => k.id === kp.knowledgePointId);
                      return (
                        <div key={kp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${kp.status === 'mastered' ? 'bg-green-500' : kp.status === 'learning' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                            <span className="font-medium text-gray-800">{kp.knowledgePointName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={kp.status === 'mastered' ? 'default' : kp.status === 'learning' ? 'secondary' : 'outline'}>
                              {KNOWLEDGE_STATUS_LABELS[kp.status]}
                            </Badge>
                            {kp.score && <span className="text-sm text-gray-600">评分: {kp.score}/10</span>}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-gray-500 text-center py-8">暂无知识点记录</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 能力反馈 */}
            <div className="p-12 min-h-[600px] bg-gray-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-purple-200">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <h2 className="text-3xl font-bold text-gray-800">能力反馈</h2>
              </div>

              {/* 打字测试 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-2xl">⌨️</span> 打字测试
                </h3>
                {weeklyTyping.length > 0 ? (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold">周次</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">平均速度</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">平均正确率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTyping.map((w, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-800">{w.week}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{w.avgSpeed} 字/分钟</td>
                            <td className="py-3 px-4 text-center text-gray-700">{w.avgAccuracy}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {typingImprovement !== 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className={`text-sm font-medium ${typingImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          相比上期{typingImprovement > 0 ? '提升' : '下降'} {Math.abs(typingImprovement)}%
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 bg-white rounded-lg">暂无打字测试记录</p>
                )}
              </div>

              {/* 三刷测试 */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔄</span> 三刷测试
                </h3>
                {retryComparison.length > 0 ? (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold">测试题</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">首次用时</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">最近用时</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">提升情况</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retryComparison.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-800">{r.name}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{r.firstTime}分钟</td>
                            <td className="py-3 px-4 text-center text-gray-700">{r.lastTime}分钟</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-semibold ${r.improvement > 0 ? 'text-green-600' : r.improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {r.improvement > 0 ? '+' : ''}{r.improvement}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 bg-white rounded-lg">暂无三刷测试记录</p>
                )}
              </div>
            </div>

            {/* 提升建议 */}
            <div className="p-12 min-h-[500px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-green-200">
                <Target className="h-8 w-8 text-green-600" />
                <h2 className="text-3xl font-bold text-gray-800">提升建议</h2>
              </div>

              <div className="space-y-6">
                {weakPoints.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">需要加强的知识点</h3>
                    <div className="space-y-2">
                      {weakPoints.map((kp, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-red-600">●</span>
                          <span className="text-gray-800">{kp.knowledgePointName}</span>
                          <Badge variant="destructive" className="ml-auto text-xs">{KNOWLEDGE_STATUS_LABELS[kp.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {strongPoints.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">已掌握的知识点</h3>
                    <div className="space-y-2">
                      {strongPoints.map((kp, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-green-600">●</span>
                          <span className="text-gray-800">{kp.knowledgePointName}</span>
                          <Badge className="ml-auto bg-green-600 text-xs">{KNOWLEDGE_STATUS_LABELS[kp.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">学习建议</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-gray-700 leading-relaxed">
                      {weakPoints.length > 0 
                        ? `建议重点复习${weakPoints.slice(0, 3).map(kp => kp.knowledgePointName).join('、')}等知识点，多做相关练习题巩固理解。同时保持对已掌握知识点的熟练度。`
                        : '继续保持当前的学习节奏，可以尝试一些进阶题目挑战自我。'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 家校共育 */}
            <div className="p-12 min-h-[500px] bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-pink-200">
                <Users className="h-8 w-8 text-pink-600" />
                <h2 className="text-3xl font-bold text-gray-800">家校共育</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">💡</span> 陪伴创新
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    鼓励孩子尝试不同的解题方法，培养创新思维。当孩子遇到困难时，引导他们思考而不是直接给出答案。
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">📚</span> 学业跟进
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    关注孩子的学习进度，定期检查作业完成情况。建议每天安排固定的编程练习时间，保持学习连贯性。
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎉</span> 成果互动
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    当孩子完成项目或取得进步时，及时给予肯定和鼓励。可以让孩子向您展示他们的作品，增强成就感。
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">🗣️</span> 引导表达
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    鼓励孩子用语言描述自己的解题思路，培养逻辑表达能力。可以问"你是怎么想到这个方法的？"
                  </p>
                </div>
              </div>
            </div>

            {/* 下月计划 */}
            <div className="p-12 min-h-[400px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-indigo-200">
                <Calendar className="h-8 w-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-800">下月计划</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">下月学习目标</Label>
                  <Textarea
                    value={nextGoal}
                    onChange={(e) => setNextGoal(e.target.value)}
                    placeholder="例如：掌握循环结构、完成3个综合项目、打字速度达到50字/分钟..."
                    className="min-h-[120px] resize-none border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* 老师寄语 */}
            <div className="p-12 min-h-[400px] bg-gradient-to-br from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-indigo-200">
                <MessageCircle className="h-8 w-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-800">老师寄语</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">寄语内容</Label>
                  <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                    <Award className="mr-2 h-4 w-4" />
                    选择模板
                  </Button>
                </div>

                {showTemplates && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">推荐模板：</p>
                    {COMMENT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => { setTeacherComment(template.content); setShowTemplates(false); }}
                        className="w-full text-left p-3 rounded-md hover:bg-indigo-50 transition-colors border border-gray-100 hover:border-indigo-200"
                      >
                        <div className="font-medium text-sm text-gray-800">{template.name}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">{template.content}</div>
                      </button>
                    ))}
                  </div>
                )}

                <Textarea
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="写下您对学生的寄语和鼓励..."
                  className="min-h-[150px] resize-none border-gray-300"
                />
              </div>
            </div>

            {/* 页脚 */}
            <div className="bg-gray-800 text-white p-8 text-center">
              <p className="text-lg font-semibold mb-2">战码编程</p>
              <p className="text-sm opacity-80">快乐学习 · 收获成长</p>
              <p className="text-xs opacity-60 mt-2">爱心施教 · 娃娃为王</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
