'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Calendar, TrendingUp, Award, BookOpen, Users, MessageCircle, Target, FileText, User, Upload, Star, Camera, ThumbsUp, AlertCircle } from 'lucide-react';
import {
  getStudents,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
  getCourses,
} from '@/lib/store';
import type { Student, TypingRecord, ProblemRetryRecord, HomeworkRecord, KnowledgeProgress, Course } from '@/lib/types';
import { calcTypingSummary, calcRetrySummary, calcTypingImprovement, calcKnowledgeMastery, getStrongKnowledgePoints, getWeakKnowledgePoints, calcLearnedKnowledgeMastery, collectTeacherTags, getNextChapterContent } from '@/lib/analytics';
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
  
  // 新增：学生信息和图片
  const [studentAge, setStudentAge] = useState('');
  const [studentSchool, setStudentSchool] = useState('');
  const [programmingTime, setProgrammingTime] = useState('');
  const [learningContent, setLearningContent] = useState('');
  const [interests, setInterests] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<string>('');
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [classroomPhotos, setClassroomPhotos] = useState<string[]>([]);
  
  // 新增：战码少年有话说
  const [studentWords, setStudentWords] = useState('');
  const MAX_WORDS = 200;
  
  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const students = await getStudents();
    const s = students.find(st => st.id === studentId);
    if (!s) return;
    setStudent(s);
    setStudentSchool(s.notes || '');

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
      if (!customStart || !customEnd) {
        return { start: '', end: '' };
      }
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

  const filterByPeriod = <T extends { date: string }>(records: T[], start: string, end: string) => {
    if (!start || !end) return records;
    return records.filter(r => r.date >= start && r.date <= end);
  };

  const monthTyping = filterByPeriod(allTyping, periodStart, periodEnd);
  const monthRetry = filterByPeriod(allRetry, periodStart, periodEnd);
  const monthHomework = filterByPeriod(allHomework, periodStart, periodEnd);

  const prevPeriodStart = (() => {
    if (!periodStart || !periodEnd) return '';
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return prevStart.toISOString().split('T')[0];
  })();
  const prevPeriodEnd = (() => {
    if (!periodStart) return '';
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

  // New: Learned knowledge mastery (based on actual problem completion)
  const learnedKnowledge = calcLearnedKnowledgeMastery(monthRetry, course || undefined);
  // New: Teacher tags collected from records
  const teacherTags = collectTeacherTags(monthTyping, monthRetry, monthHomework);
  // New: Auto sprint goal from next chapter
  const autoSprintGoal = getNextChapterContent(knowledge, course || undefined);

  // Initialize nextGoal with auto-generated content if empty
  useEffect(() => {
    if (!nextGoal && autoSprintGoal) {
      setNextGoal(autoSprintGoal);
    }
  }, [autoSprintGoal, nextGoal]);

  const periodLabel = period === 'week' ? '本周' : period === 'month' ? `${selectedMonth.replace('-', '年')}月` : '自定义周期';

  // 图片上传处理
  const handleImageUpload = (setter: (value: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setter(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleClassroomPhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && classroomPhotos.length < 6) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setClassroomPhotos([...classroomPhotos, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const exportPDF = async () => {
    if (!reportRef.current || !student) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (_doc: Document, element: HTMLElement) => {
          // Fix: html2canvas doesn't support lab() color function from Tailwind CSS 4
          // Replace all gradient backgrounds with solid colors in the cloned DOM
          const allElements = element.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            const computed = window.getComputedStyle(htmlEl);
            const bg = computed.backgroundImage;
            if (bg && (bg.includes('lab(') || bg.includes('oklab('))) {
              htmlEl.style.backgroundImage = 'none';
              htmlEl.style.backgroundColor = computed.backgroundColor || '#ffffff';
            }
            // Also fix border colors that might use lab()
            const borderColor = computed.borderColor;
            if (borderColor && borderColor.includes('lab(')) {
              htmlEl.style.borderColor = '#d1d5db';
            }
            const color = computed.color;
            if (color && color.includes('lab(')) {
              htmlEl.style.color = '#1f2937';
            }
          });
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Multi-page support
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      if (scaledHeight <= pdfHeight) {
        const x = (pdfWidth - imgWidth * ratio) / 2;
        pdf.addImage(imgData, 'PNG', x, 0, imgWidth * ratio, scaledHeight);
      } else {
        // Split into multiple pages
        let yOffset = 0;
        let pageNum = 0;
        while (yOffset < scaledHeight) {
          if (pageNum > 0) pdf.addPage();
          const x = (pdfWidth - imgWidth * ratio) / 2;
          pdf.addImage(imgData, 'PNG', x, -yOffset, imgWidth * ratio, scaledHeight);
          yOffset += pdfHeight;
          pageNum++;
        }
      }
      
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              <Button onClick={exportPDF} disabled={exporting} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
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
            
            {/* 第一页：封面 */}
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white p-12 min-h-[800px] flex flex-col justify-between relative">
              <div className="absolute top-6 right-6 text-right">
                <div className="text-sm opacity-80">战码编程</div>
              </div>
              
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold tracking-wider">战码少年</h1>
                  <h2 className="text-3xl font-semibold opacity-90">修炼手册</h2>
                  <div className="w-32 h-1 bg-white/50 mx-auto"></div>
                </div>
                
                {/* 学生大头贴 */}
                <div className="relative inline-block">
                  <div 
                    className="w-40 h-40 bg-white/20 rounded-full mx-auto flex items-center justify-center border-4 border-white/30 cursor-pointer hover:bg-white/30 transition-colors overflow-hidden"
                    onClick={() => handleImageUpload(setCoverPhoto)}
                  >
                    {coverPhoto ? (
                      <img src={coverPhoto} alt="学生照片" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-white/60 mx-auto mb-2" />
                        <span className="text-xs opacity-60">点击上传照片</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 战码少年有话说 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
                  <p className="text-sm opacity-80 mb-2">战码少年有话说：</p>
                  <Textarea
                    value={studentWords}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_WORDS) {
                        setStudentWords(e.target.value);
                      }
                    }}
                    placeholder="写下你想说的话..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[80px] resize-none"
                  />
                  <p className="text-xs opacity-60 mt-2 text-right">{studentWords.length}/{MAX_WORDS}</p>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg opacity-90">快乐学习 · 收获成长</p>
                <p className="text-sm opacity-70">爱心施教 · 娃娃为王</p>
              </div>
            </div>

            {/* 第二页：学生基本信息 */}
            <div className="p-12 min-h-[700px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-blue-200">
                <User className="h-8 w-8 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-800">学生基本信息</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* 左侧：学生照片 */}
                <div className="flex flex-col items-center justify-center">
                  <div 
                    className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden"
                    onClick={() => handleImageUpload(setStudentPhoto)}
                  >
                    {studentPhoto ? (
                      <img src={studentPhoto} alt="学生照片" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Upload className="h-12 w-12 mx-auto mb-2" />
                        <span className="text-sm">点击上传照片</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 右侧：基本信息 */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">学生姓名</Label>
                    <Input value={student.name} disabled className="mt-1 bg-gray-50" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">年龄</Label>
                    <Input 
                      value={studentAge} 
                      onChange={(e) => setStudentAge(e.target.value)}
                      placeholder="请输入年龄"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">学校</Label>
                    <Input 
                      value={studentSchool} 
                      onChange={(e) => setStudentSchool(e.target.value)}
                      placeholder="请输入学校"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">编程时间</Label>
                    <Input 
                      value={programmingTime} 
                      onChange={(e) => setProgrammingTime(e.target.value)}
                      placeholder="例如：1年"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">学习内容</Label>
                    <Input 
                      value={learningContent} 
                      onChange={(e) => setLearningContent(e.target.value)}
                      placeholder="例如：Scratch图形化编程"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">兴趣爱好</Label>
                    <Input 
                      value={interests} 
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder="例如：画画、游戏、音乐"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 第三页：本月课程内容+知识点 */}
            <div className="p-12 min-h-[700px] bg-gray-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-purple-200">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <h2 className="text-3xl font-bold text-gray-800">本月课程内容</h2>
              </div>
              
              <div className="space-y-6">
                {/* 知识点掌握情况 */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">知识点掌握情况</h3>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    {learnedKnowledge.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold">知识点</th>
                            <th className="text-center py-3 px-4 text-gray-600 font-semibold">完成度</th>
                            <th className="text-center py-3 px-4 text-gray-600 font-semibold">掌握星级</th>
                          </tr>
                        </thead>
                        <tbody>
                          {learnedKnowledge.map((kp) => (
                            <tr key={kp.knowledgePointId} className="border-b border-gray-100">
                              <td className="py-3 px-4 font-medium text-gray-800">{kp.knowledgePointName}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm text-gray-600">{kp.completedProblems}/{kp.totalProblems}题</span>
                                <span className="ml-2 text-xs text-gray-500">({kp.completionPercent}%)</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center">
                                  {renderStars(kp.stars)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无知识点学习记录</p>
                    )}
                  </div>
                </div>

                {/* 本月完成题目 */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">本月完成题目</h3>
                  {(() => {
                    // Group retry records by problemId
                    const problemGroups = monthRetry.reduce((acc, r) => {
                      if (!acc[r.problemId]) acc[r.problemId] = [];
                      acc[r.problemId].push(r);
                      return acc;
                    }, {} as Record<string, typeof monthRetry>);

                    const problems = Object.entries(problemGroups).map(([problemId, records]) => {
                      const hasRetry = records.length > 1;
                      const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
                      const first = sorted[0];
                      // Get knowledge points for this problem from course.problems
                      const problemDef = course?.problems?.find(p => p.id === problemId);
                      const kpIds = problemDef
                        ? [...(problemDef.knowledgePointIds || []), ...(problemDef.knowledgePointId ? [problemDef.knowledgePointId] : [])]
                        : [];
                      const kpNames: string[] = kpIds
                        .map((id: string) => course!.knowledgePoints.find(k => k.id === id)?.name || '')
                        .filter(Boolean);

                      return { problemId, records: sorted, hasRetry, first, kpNames, problemName: first.problemName || problemId };
                    }).sort((a, b) => a.first.date.localeCompare(b.first.date));

                    const keyProblems = problems.filter(p => p.hasRetry);
                    const normalProblems = problems.filter(p => !p.hasRetry);

                    if (problems.length === 0) {
                      return <p className="text-gray-500 text-center py-8 bg-white rounded-lg">暂无完成题目记录</p>;
                    }

                    return (
                      <div className="space-y-4">
                        {/* 重点题型（有三刷的） */}
                        {keyProblems.length > 0 && (
                          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-orange-400">
                            <h4 className="text-lg font-semibold text-orange-700 mb-4 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5" /> 重点题型（多次练习）
                            </h4>
                            <div className="space-y-4">
                              {keyProblems.map((p) => (
                                <div key={p.problemId} className="border border-orange-100 rounded-lg p-4 bg-orange-50/50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-800">{p.problemName}</span>
                                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                      练习 {p.records.length} 次
                                    </span>
                                  </div>
                                  {p.kpNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                      {p.kpNames.map(name => (
                                        <span key={name} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-gray-500 border-b border-orange-100">
                                        <th className="text-left py-1.5 px-2">次数</th>
                                        <th className="text-left py-1.5 px-2">日期</th>
                                        <th className="text-left py-1.5 px-2">用时</th>
                                        <th className="text-left py-1.5 px-2">备注</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.records.map((r, idx) => (
                                          <tr key={idx} className="border-b border-orange-50">
                                            <td className="py-1.5 px-2 text-gray-600">第{r.attempt || idx + 1}次</td>
                                            <td className="py-1.5 px-2 text-gray-600">{r.date}</td>
                                            <td className="py-1.5 px-2 text-gray-600">{r.timeSpent ? `${r.timeSpent}秒` : '-'}</td>
                                            <td className="py-1.5 px-2 text-gray-500 text-xs">{r.notes || '-'}</td>
                                          </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 普通题目（无三刷的） */}
                        {normalProblems.length > 0 && (
                          <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h4 className="text-lg font-semibold text-gray-700 mb-4">已完成题目</h4>
                            <div className="space-y-2">
                              {normalProblems.map((p) => (
                                <div key={p.problemId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span className="text-gray-800 font-medium">{p.problemName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.kpNames.map(name => (
                                      <span key={name} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                                        {name}
                                      </span>
                                    ))}
                                    <span className="text-xs text-gray-400 ml-2">{p.first.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="text-3xl font-bold text-purple-600">{learnedKnowledge.length}</div>
                    <div className="text-sm text-gray-600 mt-1">已学习知识点</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{new Set(monthRetry.map(r => r.problemId)).size}</div>
                    <div className="text-sm text-gray-600 mt-1">本月完成编程题</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="text-3xl font-bold text-orange-600">
                      {(() => {
                        const problemIds = [...new Set(monthRetry.map(r => r.problemId))];
                        return problemIds.filter(pid => monthRetry.filter(r => r.problemId === pid).length > 1).length;
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">重点题型（多次练习）</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 第四页：能力反馈 */}
            <div className="p-12 min-h-[700px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-green-200">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <h2 className="text-3xl font-bold text-gray-800">能力反馈</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 点赞 */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" /> 点赞
                  </h3>
                  {teacherTags.praiseTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacherTags.praiseTags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : strongPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {strongPoints.slice(0, 5).map((kp, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <span className="text-green-600">✓</span>
                          {kp.knowledgePointName}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">暂无数据</p>
                  )}
                </div>

                {/* 待提升 */}
                <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" /> 待提升
                  </h3>
                  {teacherTags.improveTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacherTags.improveTags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm border border-orange-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : weakPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {weakPoints.slice(0, 5).map((kp, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <span className="text-orange-600">→</span>
                          {kp.knowledgePointName}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">暂无数据</p>
                  )}
                </div>
              </div>

              {/* 打字测试 - 时间趋势图 */}
              {monthTyping.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">打字测试趋势</h3>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold">日期</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">速度(字/分钟)</th>
                          <th className="text-center py-3 px-4 text-gray-600 font-semibold">正确率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthTyping.sort((a, b) => a.date.localeCompare(b.date)).map((t, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-800">{t.date}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{t.speed}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{t.accuracy}%</td>
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
                </div>
              )}
            </div>

            {/* 第五页：成长建议 */}
            <div className="p-12 min-h-[700px] bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-yellow-200">
                <Target className="h-8 w-8 text-yellow-600" />
                <h2 className="text-3xl font-bold text-gray-800">成长建议</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">💡 提升Tip</h3>
                  {teacherTags.growthSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {teacherTags.growthSuggestions.map((sug, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">●</span>
                          <p className="text-gray-600">{sug}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 leading-relaxed">
                      {weakPoints.length > 0 
                        ? `建议重点复习${weakPoints.slice(0, 3).map(kp => kp.knowledgePointName).join('、')}等知识点，多做相关练习题巩固理解。`
                        : '继续保持当前的学习节奏，可以尝试一些进阶题目挑战自我。'}
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">🏠 家校Tip</h3>
                  <p className="text-gray-600 leading-relaxed">
                    鼓励孩子尝试不同的解题方法，培养创新思维。当孩子遇到困难时，引导他们思考而不是直接给出答案。
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">🎯 冲刺Goal</h3>
                  <Textarea
                    value={nextGoal}
                    onChange={(e) => setNextGoal(e.target.value)}
                    placeholder="写下下月学习目标..."
                    className="min-h-[100px] resize-none"
                  />
                  {autoSprintGoal && (
                    <p className="text-xs text-gray-400 mt-2">自动推荐：{autoSprintGoal}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 第六页：课堂风采 */}
            <div className="p-12 min-h-[700px]">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-pink-200">
                <Camera className="h-8 w-8 text-pink-600" />
                <h2 className="text-3xl font-bold text-gray-800">课堂风采</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {classroomPhotos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={photo} alt={`课堂照片${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {classroomPhotos.length < 6 && (
                  <div 
                    className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={handleClassroomPhotoUpload}
                  >
                    <div className="text-center text-gray-400">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm">添加照片</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 第七页：家校共育和下月计划 */}
            <div className="p-12 min-h-[700px] bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-purple-200">
                <Users className="h-8 w-8 text-purple-600" />
                <h2 className="text-3xl font-bold text-gray-800">家校共育</h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
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
              </div>

              {/* 老师寄语 */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-indigo-200">
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
                    className="min-h-[150px] resize-none"
                  />
                </div>
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
