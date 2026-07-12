'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Calendar, TrendingUp, Award, BookOpen, Users, MessageCircle, Target, FileText, User, Upload, Camera, ThumbsUp, AlertCircle, Trophy, GraduationCap, Plus, X, Check, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import {
  getStudents,
  getTypingByStudent,
  getRetryByStudent,
  getHomeworkByStudent,
  getKnowledgeByStudent,
  getCourses,
  getAllCompetitions,
  getSprintGoal,
  saveSprintGoal,
  addCompetition,
  removeCompetition,
} from '@/lib/store';
import type { Student, TypingRecord, ProblemRetryRecord, HomeworkRecord, KnowledgeProgress, Course, CompetitionEvent, SprintGoalData, GESPLlevel } from '@/lib/types';
import { calcTypingSummary, calcRetrySummary, calcTypingImprovement, calcKnowledgeMastery, getStrongKnowledgePoints, getWeakKnowledgePoints, calcLearnedKnowledgeMastery, collectTeacherTags, getNextChapterContent } from '@/lib/analytics';
import { COMMENT_TEMPLATES, KNOWLEDGE_STATUS_LABELS, GESP_LEVELS, getGespLevelsByCourse } from '@/lib/constants';
import type { GESPLlevelDef } from '@/lib/constants';

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

  // 冲刺目标表格状态
  const [sprintCourseGoal, setSprintCourseGoal] = useState('');
  const [sprintGespLevels, setSprintGespLevels] = useState<GESPLlevel[]>([]);
  const [sprintCompetitionIds, setSprintCompetitionIds] = useState<string[]>([]);
  const [allCompetitions, setAllCompetitions] = useState<CompetitionEvent[]>([]);
  const [showAddCompetition, setShowAddCompetition] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompDate, setNewCompDate] = useState('');
  const [newCompCategory, setNewCompCategory] = useState('');

  // 月度侧重点
  type MonthFocus = 'regular' | 'exam' | 'competition' | 'typing';
  const [monthFocus, setMonthFocus] = useState<MonthFocus>('regular');

  // 老师寄语多选
  const TEACHER_COMMENT_PRESETS = [
    { id: 'encourage', label: '鼓励肯定', text: '本月表现优秀，继续保持！' },
    { id: 'practice', label: '加强练习', text: '建议增加课后练习时间，巩固所学知识。' },
    { id: 'thinking', label: '培养思维', text: '注重逻辑思维训练，多思考解题思路。' },
    { id: 'challenge', label: '挑战进阶', text: '可以尝试更有挑战性的题目，突破自我。' },
    { id: 'foundation', label: '夯实基础', text: '基础知识点需要进一步巩固，打好根基。' },
    { id: 'competition', label: '备赛建议', text: '建议针对近期赛事进行专项训练。' },
  ];
  const [selectedCommentPresets, setSelectedCommentPresets] = useState<string[]>([]);
  const [courseGespLevels, setCourseGespLevels] = useState<GESPLlevelDef[]>([]);
  const [showAllGesp, setShowAllGesp] = useState(false);
  const [showAllCompetitions, setShowAllCompetitions] = useState(false);
  
  // 新增：战码少年有话说
  const [studentWords, setStudentWords] = useState('');
  const MAX_WORDS = 200;

  // 第三页：月度横幅
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[now.getMonth()]}-${now.getFullYear()}`;
  });
  const [monthlyQuote, setMonthlyQuote] = useState('所有的运气和惊喜，都来自你去年的努力和今年的坚持。');
  
  // 时间轴模式：显示所有有数据的月份
  const [timelineMode, setTimelineMode] = useState(false);
  const [timelineQuotes, setTimelineQuotes] = useState<Record<string, string>>({});
  
  // 合并模式：将多个月份合并为一个报告
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedMergeMonths, setSelectedMergeMonths] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergedQuote, setMergedQuote] = useState('');
  
  // 获取某个月份的数据
  const getMonthData = useCallback((monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    const monthTyping = allTyping.filter(r => r.date >= startStr && r.date <= endStr);
    const monthRetry = allRetry.filter(r => r.date >= startStr && r.date <= endStr);
    const monthHomework = allHomework.filter(r => r.date >= startStr && r.date <= endStr);
    
    return {
      typing: monthTyping,
      retry: monthRetry,
      homework: monthHomework,
      typingSummary: calcTypingSummary(monthTyping),
      retrySummary: calcRetrySummary(monthRetry, course || undefined),
      learnedKnowledge: calcLearnedKnowledgeMastery(monthRetry, course || undefined),
      teacherTags: collectTeacherTags(monthTyping, monthRetry, monthHomework),
    };
  }, [allTyping, allRetry, allHomework, course]);
  
  // 合并后的数据
  const mergedData = useMemo(() => {
    if (!mergeMode || selectedMergeMonths.length === 0 || !course) return null;
    
    // 合并所有选中月份的记录
    const allRetryMerged: ProblemRetryRecord[] = [];
    const allHomeworkMerged: HomeworkRecord[] = [];
    const allTypingMerged: TypingRecord[] = [];
    
    selectedMergeMonths.forEach(monthKey => {
      const data = getMonthData(monthKey);
      allRetryMerged.push(...data.retry);
      allHomeworkMerged.push(...data.homework);
      allTypingMerged.push(...data.typing);
    });
    
    // 计算合并后的知识点掌握情况
    const kpMap = new Map<string, { name: string; total: number; completed: number }>();
    allRetryMerged.forEach(r => {
      const problem = course.problems.find(p => p.id === r.problemId);
      if (!problem) return;
      const kpIds = (problem.knowledgePointIds?.length ?? 0) > 0 
        ? problem.knowledgePointIds 
        : (problem.knowledgePointId ? [problem.knowledgePointId] : []);
      if (!kpIds) return;
      kpIds.forEach((kpId: string) => {
        const kp = course.knowledgePoints.find(k => k.id === kpId);
        if (!kp) return;
        if (!kpMap.has(kpId)) {
          kpMap.set(kpId, { name: kp.name, total: 0, completed: 0 });
        }
        const entry = kpMap.get(kpId)!;
        entry.total++;
        // 三刷完成判断：有记录即视为完成
        entry.completed++;
      });
    });
    
    const mergedKnowledgeMastery = Array.from(kpMap.values()).map((kp) => ({
      knowledgePointId: kp.name,
      knowledgePointName: kp.name,
      completion: kp.total > 0 ? Math.round((kp.completed / kp.total) * 100) : 0,
      stars: kp.total > 0 ? Math.min(5, Math.max(1, Math.ceil((kp.completed / kp.total) * 5))) : 0,
      status: 'learning' as const
    }));
    
    return {
      retryRecords: allRetryMerged,
      homeworkRecords: allHomeworkMerged,
      typingRecords: allTypingMerged,
      knowledgeMastery: mergedKnowledgeMastery
    };
  }, [mergeMode, selectedMergeMonths, getMonthData, course]);
  
  // 预设合并选项
  const mergePresets = [
    { label: '上半年', months: [1, 2, 3, 4, 5, 6] },
    { label: '下半年', months: [7, 8, 9, 10, 11, 12] },
    { label: '全年', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { label: 'Q1', months: [1, 2, 3] },
    { label: 'Q2', months: [4, 5, 6] },
    { label: 'Q3', months: [7, 8, 9] },
    { label: 'Q4', months: [10, 11, 12] },
  ];
  
  // 获取所有有数据的月份
  const getAvailableMonths = useCallback(() => {
    const months = new Set<string>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 从打字记录获取月份
    allTyping.forEach(r => {
      if (r.date) {
        const d = new Date(r.date);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    
    // 从三刷记录获取月份
    allRetry.forEach(r => {
      if (r.date) {
        const d = new Date(r.date);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    
    // 从作业记录获取月份
    allHomework.forEach(r => {
      if (r.date) {
        const d = new Date(r.date);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    
    // 排序并转换为显示格式
    return Array.from(months)
      .sort()
      .map(m => {
        const [year, month] = m.split('-');
        return {
          key: m,
          display: `${monthNames[parseInt(month) - 1]}-${year}`,
          year: parseInt(year),
          month: parseInt(month)
        };
      });
  }, [allTyping, allRetry, allHomework]);

  // 获取合并月份的数据
  const getMergedData = useCallback(() => {
    if (selectedMergeMonths.length === 0) return null;
    
    const allTypingMerged: TypingRecord[] = [];
    const allRetryMerged: ProblemRetryRecord[] = [];
    const allHomeworkMerged: HomeworkRecord[] = [];
    
    selectedMergeMonths.forEach(monthKey => {
      const data = getMonthData(monthKey);
      allTypingMerged.push(...data.typing);
      allRetryMerged.push(...data.retry);
      allHomeworkMerged.push(...data.homework);
    });
    
    return {
      typing: allTypingMerged,
      retry: allRetryMerged,
      homework: allHomeworkMerged,
      typingSummary: calcTypingSummary(allTypingMerged),
      retrySummary: calcRetrySummary(allRetryMerged, course || undefined),
      learnedKnowledge: calcLearnedKnowledgeMastery(allRetryMerged, course || undefined),
      teacherTags: collectTeacherTags(allTypingMerged, allRetryMerged, allHomeworkMerged),
      monthRange: selectedMergeMonths.length > 0 ? {
        start: selectedMergeMonths[0],
        end: selectedMergeMonths[selectedMergeMonths.length - 1]
      } : null
    };
  }, [selectedMergeMonths, getMonthData, course]);
  
  // 应用预设合并选项
  const applyMergePreset = useCallback((preset: typeof mergePresets[0]) => {
    const availableMonths = getAvailableMonths();
    const year = availableMonths.length > 0 ? availableMonths[0].year : new Date().getFullYear();
    
    const monthsToSelect = availableMonths
      .filter(m => preset.months.includes(m.month) && m.year === year)
      .map(m => m.key);
    
    setSelectedMergeMonths(monthsToSelect);
    setMergeTitle(`${year}年${preset.label}报告`);
  }, [getAvailableMonths]);
  
  // 切换月份选择
  const toggleMergeMonth = useCallback((monthKey: string) => {
    setSelectedMergeMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey].sort()
    );
  }, []);
  
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

  // Load sprint goal data and competitions
  useEffect(() => {
    if (!student) return;
    // Load competitions
    setAllCompetitions(getAllCompetitions());
    // Set course-specific GESP levels
    if (course) {
      setCourseGespLevels(getGespLevelsByCourse(course.id));
    }
    // Load existing sprint goal for current month
    const existing = getSprintGoal(student.id, selectedMonth);
    if (existing) {
      setSprintCourseGoal(existing.courseGoal);
      setSprintGespLevels(existing.gespLevels);
      setSprintCompetitionIds(existing.competitionIds);
    } else {
      // Auto-fill course goal from next chapter directly
      setSprintCourseGoal(autoSprintGoal || '');
      setSprintGespLevels([]);
      setSprintCompetitionIds([]);
    }
  }, [student, course, selectedMonth, autoSprintGoal]);

  // Save sprint goal when changed
  const handleSaveSprintGoal = useCallback(() => {
    if (!student) return;
    const data: SprintGoalData = {
      month: selectedMonth,
      studentId: student.id,
      courseGoal: sprintCourseGoal,
      gespLevels: sprintGespLevels,
      competitionIds: sprintCompetitionIds,
      updatedAt: new Date().toISOString(),
    };
    saveSprintGoal(data);
  }, [student, selectedMonth, sprintCourseGoal, sprintGespLevels, sprintCompetitionIds]);

  // Toggle GESP level
  const toggleGespLevel = useCallback((level: GESPLlevel) => {
    setSprintGespLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  }, []);

  // Toggle competition
  const toggleCompetition = useCallback((id: string) => {
    setSprintCompetitionIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  }, []);

  // Add custom competition
  const handleAddCompetition = useCallback(() => {
    if (!newCompName.trim()) return;
    const newEvent = addCompetition({
      name: newCompName.trim(),
      date: newCompDate || undefined,
      category: newCompCategory || '自定义',
    });
    setAllCompetitions(getAllCompetitions());
    setSprintCompetitionIds(prev => [...prev, newEvent.id]);
    setNewCompName('');
    setNewCompDate('');
    setNewCompCategory('');
    setShowAddCompetition(false);
  }, [newCompName, newCompDate, newCompCategory]);

  // Remove custom competition
  const handleRemoveCompetition = useCallback((id: string) => {
    removeCompetition(id);
    setAllCompetitions(getAllCompetitions());
    setSprintCompetitionIds(prev => prev.filter(cid => cid !== id));
  }, []);

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

  // Gold 3D star renderer
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className="relative inline-block mx-0.5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i < rating ? 'url(#goldGrad)' : '#e5e7eb'}
            stroke={i < rating ? '#d4a017' : '#d1d5db'}
            strokeWidth="0.5"
          />
          {i < rating && (
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="50%" stopColor="#ffb347" />
                <stop offset="100%" stopColor="#f0a500" />
              </linearGradient>
            </defs>
          )}
        </svg>
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-[#f5f0eb]">
      {/* 控制栏 - 毛玻璃质感 */}
      <div className="sticky top-0 z-20 border-b border-purple-100/40 bg-gradient-to-r from-white/80 via-purple-50/30 to-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#3066FF] to-[#9933FF] flex items-center justify-center shadow-lg shadow-purple-200/50">
                <FileText className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#333344] tracking-wide">{student.name}的成长档案</h1>
                <p className="text-xs text-[#888] mt-0.5">{course?.name || '未分配课程'} · {periodLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 shadow-sm border border-purple-100/50 backdrop-blur-sm">
                <Calendar className="h-4 w-4 text-[#9933FF]" strokeWidth={1.5} />
                <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodType)} className="bg-transparent text-sm text-[#333344] outline-none cursor-pointer font-medium">
                  <option value="week">按周</option>
                  <option value="month">按月</option>
                  <option value="custom">自定义</option>
                </select>
                {period === 'month' && (
                  <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-36 h-8 rounded-xl border-purple-100/50 text-sm bg-purple-50/30" />
                )}
                {period === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36 h-8 rounded-xl border-purple-100/50 text-sm bg-purple-50/30" />
                    <span className="text-[#888] text-sm">至</span>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36 h-8 rounded-xl border-purple-100/50 text-sm bg-purple-50/30" />
                  </div>
                )}
              </div>
              {/* 时间轴模式切换 */}
              <Button 
                variant={timelineMode ? "default" : "outline"} 
                onClick={() => { setTimelineMode(!timelineMode); setMergeMode(false); }} 
                className={`rounded-2xl transition-all duration-300 font-medium ${timelineMode ? 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-orange-200/50' : 'bg-white/90 border border-purple-100/50 text-[#333344] hover:bg-purple-50/50 hover:border-purple-200/50'}`}
              >
                <TrendingUp className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {timelineMode ? '时间轴' : '单月'}
              </Button>
              {/* 合并模式切换 */}
              <Button 
                variant={mergeMode ? "default" : "outline"} 
                onClick={() => { setMergeMode(!mergeMode); setTimelineMode(false); }} 
                className={`rounded-2xl transition-all duration-300 font-medium ${mergeMode ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-200/50' : 'bg-white/90 border border-purple-100/50 text-[#333344] hover:bg-purple-50/50 hover:border-purple-200/50'}`}
              >
                <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {mergeMode ? '合并报告' : '合并'}
              </Button>
              {/* 月度侧重点 */}
              <div className="relative group/focus">
                <Button 
                  variant="outline" 
                  className={`rounded-2xl transition-all duration-300 font-medium bg-white/90 border border-purple-100/50 text-[#333344] hover:bg-purple-50/50 hover:border-purple-200/50`}
                >
                  <Target className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {monthFocus === 'regular' ? '常规' : monthFocus === 'exam' ? '考级' : monthFocus === 'competition' ? '赛事' : '打字'}
                </Button>
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-purple-100/50 p-2 min-w-[140px] opacity-0 invisible group-hover/focus:opacity-100 group-hover/focus:visible transition-all duration-200 z-50">
                  {([
                    { value: 'regular', label: '常规学习', icon: BookOpen, color: 'text-blue-500' },
                    { value: 'exam', label: '考级冲刺', icon: GraduationCap, color: 'text-amber-500' },
                    { value: 'competition', label: '赛事备战', icon: Trophy, color: 'text-orange-500' },
                    { value: 'typing', label: '打字突破', icon: TrendingUp, color: 'text-emerald-500' },
                  ] as const).map(item => (
                    <button
                      key={item.value}
                      onClick={() => setMonthFocus(item.value)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${monthFocus === item.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-[#555] hover:bg-gray-50'}`}
                    >
                      <item.icon className={`h-4 w-4 ${monthFocus === item.value ? 'text-purple-500' : item.color}`} strokeWidth={1.5} />
                      {item.label}
                      {monthFocus === item.value && <Check className="h-3.5 w-3.5 ml-auto text-purple-500" />}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={exportPDF} disabled={exporting} className="rounded-2xl bg-gradient-to-r from-[#3066FF] to-[#9933FF] hover:from-[#2855dd] hover:to-[#7b29cc] shadow-lg shadow-purple-300/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-400/50 hover:-translate-y-0.5 font-medium">
                <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {exporting ? '导出中...' : '导出PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 报告预览区域 */}
      <div className="container mx-auto px-6 py-8">
        
        {/* 合并模式选择面板 */}
        {mergeMode && (
          <div className="max-w-4xl mx-auto mb-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-100/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#333344] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                合并报告设置
              </h3>
              <div className="flex items-center gap-2">
                {mergePresets.map(preset => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyMergePreset(preset)}
                    className="rounded-xl border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 报告标题 */}
            <div className="mb-4">
              <label className="text-sm text-[#666] mb-1 block">报告标题</label>
              <Input
                value={mergeTitle}
                onChange={(e) => setMergeTitle(e.target.value)}
                placeholder="例如：2024年上半年报告"
                className="rounded-xl border-gray-200"
              />
            </div>
            
            {/* 月份选择 */}
            <div>
              <label className="text-sm text-[#666] mb-2 block">选择要合并的月份（已选 {selectedMergeMonths.length} 个月）</label>
              <div className="grid grid-cols-6 gap-2">
                {getAvailableMonths().map(month => (
                  <div
                    key={month.key}
                    onClick={() => toggleMergeMonth(month.key)}
                    className={`p-3 rounded-xl cursor-pointer transition-all text-center ${
                      selectedMergeMonths.includes(month.key)
                        ? 'bg-gradient-to-br from-green-400 to-teal-500 text-white shadow-md'
                        : 'bg-gray-50 text-[#666] hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">{month.display}</div>
                  </div>
                ))}
              </div>
              {getAvailableMonths().length === 0 && (
                <div className="text-center py-8 text-[#999]">
                  暂无数据，请先添加学习记录
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={reportRef} className="max-w-4xl mx-auto space-y-8">
          
          {/* 月度侧重点标识 */}
          {monthFocus !== 'regular' && (
            <div className={`rounded-2xl p-4 flex items-center gap-4 ${
              monthFocus === 'exam' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50' :
              monthFocus === 'competition' ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50' :
              'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50'
            }`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                monthFocus === 'exam' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                monthFocus === 'competition' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                'bg-gradient-to-br from-emerald-400 to-teal-500'
              }`}>
                {monthFocus === 'exam' ? <GraduationCap className="h-5 w-5 text-white" /> :
                 monthFocus === 'competition' ? <Trophy className="h-5 w-5 text-white" /> :
                 <TrendingUp className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className={`font-bold text-sm ${
                  monthFocus === 'exam' ? 'text-amber-700' :
                  monthFocus === 'competition' ? 'text-orange-700' :
                  'text-emerald-700'
                }`}>
                  本月侧重：{monthFocus === 'exam' ? '考级冲刺' : monthFocus === 'competition' ? '赛事备战' : '打字突破'}
                </p>
                <p className="text-xs text-[#888] mt-0.5">
                  {monthFocus === 'exam' ? '本月重点准备GESP考级，加油！' :
                   monthFocus === 'competition' ? '本月重点备战编程赛事，冲刺佳绩！' :
                   '本月重点突破打字速度与正确率！'}
                </p>
              </div>
            </div>
          )}

          {/* ========== 第一页：封面 ========== */}
          <div 
            className="rounded-[20px] overflow-hidden relative"
            style={{ background: '#f5f0e6' }}
          >
            {/* 亚麻布料纹理背景 */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c8b898' fill-opacity='0.10'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180,160,130,0.03) 2px, rgba(180,160,130,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,160,130,0.03) 2px, rgba(180,160,130,0.03) 4px)`,
              }}
            />

            <div className="relative">
              {/* 顶部图片区域 */}
              <div className="relative w-full" style={{ height: '320px' }}>
                {coverPhoto ? (
                  <img src={coverPhoto} alt="封面图片" className="w-full h-full object-cover" />
                ) : (
                  <img src="/cover-photo.jpg" alt="战码编程" className="w-full h-full object-cover" />
                )}
                {/* 上传替换按钮 */}
                <div 
                  className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white transition-colors"
                  onClick={() => handleImageUpload(setCoverPhoto)}
                >
                  <span className="text-xs text-[#555] flex items-center gap-1"><Upload className="h-3 w-3" /> 替换图片</span>
                </div>
                {/* 金色波浪分割线 - 简化版 */}
                <div className="absolute bottom-0 left-0 w-full" style={{ height: '40px', marginBottom: '-1px' }}>
                  <svg 
                    className="w-full h-full" 
                    viewBox="0 0 800 40" 
                    preserveAspectRatio="none"
                  >
                    <path 
                      d="M0,20 Q200,40 400,20 Q600,0 800,20 L800,40 L0,40 Z" 
                      fill="#f5f0e6"
                    />
                    <path 
                      d="M0,20 Q200,40 400,20 Q600,0 800,20" 
                      fill="none" 
                      stroke="#d4a853" 
                      strokeWidth="3"
                    />
                  </svg>
                </div>
              </div>

              {/* 中部书法标题区域 - 左右布局 */}
              <div className="relative px-10 pt-6 pb-4 flex items-center justify-between">
                {/* 战码少年 - 黑色毛笔书法，左侧 */}
                <div>
                  <h1 
                    className="text-5xl font-black inline-block"
                    style={{ 
                      fontFamily: '"Ma Shan Zheng", "ZCOOL KuaiLe", "STKaiti", "KaiTi", serif',
                      color: '#1a1a1a',
                      letterSpacing: '0.15em',
                    }}
                  >
                    战码少年
                  </h1>
                  {/* 黄色下划线（短） */}
                  <div className="mt-1 ml-1 h-[3px] w-40 rounded-full" style={{ background: '#e8b820' }}></div>
                </div>
                {/* 修炼手册 - 红色毛笔书法，右侧 */}
                <div>
                  <h2 
                    className="text-4xl font-black inline-block"
                    style={{ 
                      fontFamily: '"Ma Shan Zheng", "ZCOOL KuaiLe", "STKaiti", "KaiTi", serif',
                      color: '#c0392b',
                      letterSpacing: '0.15em',
                    }}
                  >
                    修炼手册
                  </h2>
                  {/* 黄色下划线（长） */}
                  <div className="mt-1 ml-1 h-[3px] w-52 rounded-full" style={{ background: '#e8b820' }}></div>
                </div>
              </div>

                {/* 下方左右分栏：大头贴 + 少年留言 */}
                <div className="grid grid-cols-[200px_1fr] gap-6 mt-4">
                  {/* 左侧：大头贴粘贴框 - 蓝色虚线 */}
                  <div 
                    className="aspect-square flex items-center justify-center cursor-pointer relative"
                    style={{ 
                      border: '2.5px dashed #4a90d9',
                      borderRadius: '8px',
                      background: '#faf5e8',
                    }}
                    onClick={() => handleImageUpload(setStudentPhoto)}
                  >
                    {studentPhoto ? (
                      <img src={studentPhoto} alt="学生照片" className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <span 
                        className="text-sm text-[#999] text-center leading-relaxed"
                        style={{ fontFamily: '"STSong", "SimSun", serif' }}
                      >
                        (大头贴<br/>粘贴处)
                      </span>
                    )}
                  </div>

                  {/* 右侧：少年留言框 - 蓝色实线 */}
                  <div 
                    className="rounded-lg p-4 relative"
                    style={{ 
                      border: '2.5px solid #4a90d9',
                      background: '#faf5e8',
                      minHeight: '180px',
                    }}
                  >
                    {/* 黄色小标签 */}
                    <span 
                      className="text-xs font-medium mb-2 block"
                      style={{ 
                        color: '#e8b820',
                        fontFamily: '"STSong", "SimSun", serif',
                      }}
                    >
                      战码少年有话说：
                    </span>
                    {/* 横线输入区域 */}
                    <Textarea
                      value={studentWords}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_WORDS) {
                          setStudentWords(e.target.value);
                        }
                      }}
                      placeholder=""
                      className="w-full bg-transparent border-none outline-none resize-none text-sm text-[#333] placeholder:text-[#ccc] min-h-[120px] leading-7 p-0"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, #d4c5a9 27px, #d4c5a9 28px)',
                        lineHeight: '28px',
                        fontFamily: '"STSong", "SimSun", serif',
                      }}
                    />
                    {/* 字数统计 */}
                    <div className="absolute bottom-2 right-3 text-xs text-[#bbb]">
                      {studentWords.length}/{MAX_WORDS}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部黄色横幅 */}
              <div 
                className="px-8 py-4 flex items-center justify-center"
                style={{ background: '#e8b820' }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[#555] text-sm tracking-wider" style={{ fontFamily: '"STSong", "SimSun", serif' }}>快乐学习 · 收获成长</span>
                  <div className="w-px h-4 bg-[#888]/40"></div>
                  <span className="text-[#555] text-sm tracking-wider" style={{ fontFamily: '"STSong", "SimSun", serif' }}>爱心施教 · 娃娃为王</span>
                </div>
              </div>
          </div>

          {/* ========== 第二页：学生基本信息 ========== */}
          <div 
            className="rounded-[20px] overflow-hidden relative"
            style={{ 
              background: '#f5f0e6',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c8b898' fill-opacity='0.12'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* 亚麻布料纹理叠加 */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180,160,130,0.03) 2px, rgba(180,160,130,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,160,130,0.03) 2px, rgba(180,160,130,0.03) 4px)`,
              }}
            />
            <div className="relative p-10 pt-8">
              {/* 顶部标题 - 浅蓝书法字体 */}
              <div className="text-center mb-8">
                <h2 
                  className="text-xl tracking-[0.3em]"
                  style={{ 
                    fontFamily: '"Ma Shan Zheng", "ZCOOL KuaiLe", "STKaiti", "KaiTi", serif',
                    color: '#7ba4c7',
                    fontWeight: 400,
                    letterSpacing: '0.25em',
                  }}
                >
                  战码少年——修炼手册
                </h2>
              </div>

              {/* 核心展示区：圆形头像 + 姓名泼墨横幅 */}
              <div className="flex flex-col items-center mb-10">
                {/* 圆形头像 - 浅蓝粗边框 */}
                <div 
                  className="w-52 h-52 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl"
                  style={{ border: '6px solid #7ba4c7', boxShadow: '0 4px 20px rgba(123,164,199,0.25)' }}
                  onClick={() => handleImageUpload(setStudentPhoto)}
                >
                  {studentPhoto ? (
                    <img src={studentPhoto} alt="学生照片" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#ede6d8' }}>
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-[#b8a88a] mx-auto mb-1" />
                        <span className="text-xs text-[#b8a88a]">上传照片</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 姓名黑色泼墨笔触横幅 */}
                <div className="relative -mt-7 z-10 flex items-center justify-center">
                  <div className="relative px-14 py-3 flex items-center justify-center">
                    {/* 泼墨不规则背景 - 使用clipPath模拟毛笔刷边 */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: '#1a1a1a',
                        clipPath: 'polygon(3% 20%, 8% 5%, 15% 18%, 25% 2%, 35% 15%, 45% 0%, 55% 12%, 65% 3%, 75% 16%, 85% 5%, 92% 18%, 97% 8%, 100% 25%, 98% 45%, 100% 65%, 97% 80%, 100% 92%, 92% 85%, 82% 98%, 72% 88%, 62% 100%, 52% 90%, 42% 98%, 32% 88%, 22% 100%, 12% 90%, 5% 95%, 0% 82%, 2% 65%, 0% 45%, 2% 30%)',
                      }}
                    />
                    {/* 泼墨飞溅小点 */}
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-full bg-[#1a1a1a] opacity-70" style={{ borderRadius: '50%' }} />
                    <div className="absolute -right-3 top-1/3 w-2 h-2 rounded-full bg-[#1a1a1a] opacity-50" />
                    <div className="absolute left-[10%] -bottom-3 w-1.5 h-1 rounded-full bg-[#1a1a1a] opacity-40" />
                    <div className="absolute right-[15%] -bottom-2 w-1 h-1.5 rounded-full bg-[#1a1a1a] opacity-35" />
                    {/* 姓名文字 - 白色毛笔书法 */}
                    <span 
                      className="relative text-3xl font-bold tracking-[0.35em] text-white"
                      style={{ 
                        fontFamily: '"Ma Shan Zheng", "ZCOOL KuaiLe", "STKaiti", "KaiTi", serif',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {student.name || '学生姓名'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 信息填写区：左右分栏 */}
              <div className="grid grid-cols-[1fr_1fr] gap-8 mb-8">
                {/* 左侧：三个手绘黑色方框 */}
                <div className="space-y-4">
                  {[
                    { label: '姓名', value: student.name, disabled: true },
                    { label: '年龄', value: studentAge, setter: setStudentAge, placeholder: '请输入年龄' },
                    { label: '学校', value: studentSchool, setter: setStudentSchool, placeholder: '请输入学校' },
                  ].map((field) => (
                    <div 
                      key={field.label}
                      className="relative px-4 py-3"
                      style={{
                        border: '2.5px solid #2a2a2a',
                        borderRadius: '8px 12px 10px 14px',
                        background: 'rgba(245,240,230,0.6)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#3a3a3a] whitespace-nowrap" style={{ fontFamily: '"STSong", "SimSun", serif' }}>{field.label}：</span>
                        <input 
                          type="text"
                          value={field.value}
                          onChange={field.setter ? (e: React.ChangeEvent<HTMLInputElement>) => field.setter(e.target.value) : undefined}
                          disabled={field.disabled}
                          placeholder={field.placeholder || ''}
                          className="flex-1 bg-transparent text-sm text-[#3a3a3a] placeholder:text-[#b8a88a] outline-none disabled:opacity-70"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 右侧：黄色粗边框大框 */}
                <div 
                  className="rounded-xl p-5 space-y-4"
                  style={{ 
                    border: '3px solid #e8b820',
                    background: 'rgba(255,252,240,0.5)',
                  }}
                >
                  {/* 编程时间 */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4ecdc4, #44a08d)' }}>
                      <span className="text-lg">🤖</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-[#666] block mb-0.5" style={{ fontFamily: '"STSong", "SimSun", serif' }}>编程时间：</span>
                      <input 
                        type="text"
                        value={programmingTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProgrammingTime(e.target.value)}
                        placeholder="例如：1年"
                        className="w-full bg-transparent text-sm font-medium text-[#333] placeholder:text-[#bbb] outline-none"
                      />
                    </div>
                  </div>
                  {/* 学习内容 */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
                      <span className="text-lg">📖</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-[#666] block mb-0.5" style={{ fontFamily: '"STSong", "SimSun", serif' }}>学习内容：</span>
                      <input 
                        type="text"
                        value={learningContent}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLearningContent(e.target.value)}
                        placeholder="例如：Scratch图形化编程"
                        className="w-full bg-transparent text-sm font-medium text-[#333] placeholder:text-[#bbb] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部黄色横幅 - 全宽 */}
              <div 
                className="px-8 py-4 flex items-center justify-center"
                style={{ background: '#e8b820' }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[#555] text-sm tracking-wider" style={{ fontFamily: '"STSong", "SimSun", serif' }}>快乐学习 · 收获成长</span>
                  <div className="w-px h-4 bg-[#888]/40"></div>
                  <span className="text-[#555] text-sm tracking-wider" style={{ fontFamily: '"STSong", "SimSun", serif' }}>爱心施教 · 娃娃为王</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== 第三页：本月课程内容+知识点 ========== */}
          <div className="rounded-[20px] overflow-hidden relative" style={{ background: '#f5f0e6' }}>
            {/* 顶部黄色横幅 */}
            <div 
              className="w-full px-8 pt-6 pb-5 flex flex-col items-center justify-center"
              style={{ background: '#e8b820' }}
            >
              {/* 月份年份 - 粗黑体居中 */}
              <input
                type="text"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="text-center text-3xl font-black text-[#1a1a1a] bg-transparent border-none outline-none tracking-wider mb-3"
                style={{ fontFamily: '"Arial Black", "Helvetica Neue", sans-serif' }}
                placeholder="Jan-2026"
              />
              {/* 励志文案 - 白色居中 */}
              <textarea
                value={monthlyQuote}
                onChange={(e) => setMonthlyQuote(e.target.value)}
                className="text-center text-sm text-white bg-transparent border-none outline-none resize-none w-full max-w-lg leading-relaxed"
                rows={2}
                placeholder="输入本月励志文案..."
              />
            </div>

            <div className="p-10">
              {/* 标题 */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#333344]">本月课程内容</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent ml-4"></div>
              </div>
              
              <div className="space-y-8">
                {/* 知识点掌握情况 */}
                <div>
                  <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                    知识点掌握情况
                  </h3>
                  <div className="space-y-3">
                    {learnedKnowledge.length > 0 ? (
                      learnedKnowledge.map((kp) => (
                        <div key={kp.knowledgePointId} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-purple-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-[#333344] text-base">{kp.knowledgePointName}</span>
                              <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-500 rounded-full">{kp.completedProblems}/{kp.totalProblems}题</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 h-2 rounded-full bg-purple-100 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${kp.completionPercent}%` }}></div>
                              </div>
                              <span className="text-xs text-[#888] w-10 text-right">{kp.completionPercent}%</span>
                              <div className="flex">{renderStars(kp.stars)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-2xl p-10 text-center">
                        <p className="text-[#888]">暂无知识点学习记录</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 本月完成题目 */}
                <div>
                  <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                    本月完成题目
                  </h3>
                  {(() => {
                    // 从三刷记录获取题目
                    const problemGroups = monthRetry.reduce((acc, r) => {
                      if (!acc[r.problemId]) acc[r.problemId] = [];
                      acc[r.problemId].push(r);
                      return acc;
                    }, {} as Record<string, typeof monthRetry>);

                    const allProblems = Object.entries(problemGroups).map(([problemId, records]) => {
                      const hasRetry = records.length > 1;
                      const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
                      const first = sorted[0];
                      const problemDef = course?.problems?.find(p => p.id === problemId);
                      const kpIds = problemDef
                        ? [...(problemDef.knowledgePointIds || []), ...(problemDef.knowledgePointId ? [problemDef.knowledgePointId] : [])]
                        : [];
                      const kpNames: string[] = kpIds
                        .map((id: string) => course!.knowledgePoints.find(k => k.id === id)?.name || '')
                        .filter(Boolean);

                      return { problemId, records: sorted, hasRetry, first, kpNames, problemName: first.problemName || problemId };
                    }).sort((a, b) => a.first.date.localeCompare(b.first.date));
                    const keyProblems = allProblems.filter(p => p.hasRetry);
                    const normalProblems = allProblems.filter(p => !p.hasRetry);

                    if (allProblems.length === 0) {
                      return <div className="bg-white rounded-2xl p-10 text-center"><p className="text-[#888]">暂无完成题目记录</p></div>;
                    }

                    return (
                      <div className="space-y-5">
                        {/* 重点题型 - 汇总表格 */}
                        {keyProblems.length > 0 && (
                          <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h4 className="text-base font-semibold text-orange-600 flex items-center gap-2 mb-4">
                              <AlertCircle className="h-4 w-4" /> 重点题型汇总
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-orange-100">
                                    <th className="text-left py-2.5 px-3 font-semibold text-[#555]">题目</th>
                                    <th className="text-left py-2.5 px-3 font-semibold text-[#555]">知识点</th>
                                    <th className="text-center py-2.5 px-3 font-semibold text-orange-500">一刷</th>
                                    <th className="text-center py-2.5 px-3 font-semibold text-blue-500">二刷</th>
                                    <th className="text-center py-2.5 px-3 font-semibold text-green-500">三刷</th>
                                    <th className="text-center py-2.5 px-3 font-semibold text-[#555]">效率提升</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {keyProblems.map((p) => {
                                    const formatDuration = (d: number) => {
                                      if (!d) return '-';
                                      const mins = Math.floor(d / 60);
                                      const secs = d % 60;
                                      return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
                                    };
                                    const firstTime = p.records[0]?.timeSpent || 0;
                                    const lastTime = p.records[p.records.length - 1]?.timeSpent || 0;
                                    const improvement = firstTime > 0 ? Math.round((firstTime - lastTime) / firstTime * 100) : 0;
                                    return (
                                      <tr key={p.problemId} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                                        <td className="py-3 px-3 font-medium text-[#333]">{p.problemName}</td>
                                        <td className="py-3 px-3">
                                          <div className="flex flex-wrap gap-1">
                                            {p.kpNames.length > 0 ? p.kpNames.slice(0, 2).map(name => (
                                              <span key={name} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">{name}</span>
                                            )) : <span className="text-xs text-[#aaa]">-</span>}
                                            {p.kpNames.length > 2 && <span className="text-xs text-[#aaa]">+{p.kpNames.length - 2}</span>}
                                          </div>
                                        </td>
                                        {['一刷', '二刷', '三刷'].map((label, i) => {
                                          const rec = p.records[i];
                                          return (
                                            <td key={label} className="py-3 px-3 text-center">
                                              {rec ? (
                                                <div>
                                                  <div className="text-xs font-semibold text-[#333]">{formatDuration(rec.timeSpent)}</div>
                                                  <div className="text-[10px] text-[#aaa]">{rec.date.slice(5)}</div>
                                                </div>
                                              ) : (
                                                <span className="text-xs text-[#ccc]">--</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="py-3 px-3 text-center">
                                          {improvement !== 0 ? (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${improvement > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                              {improvement > 0 ? `↑${improvement}%` : `↓${Math.abs(improvement)}%`}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-[#ccc]">--</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 重点题型 - 每道题独立卡片+迷你图表 */}
                        {keyProblems.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-semibold text-orange-600 flex items-center gap-2 px-1">
                              <AlertCircle className="h-5 w-5" /> 重点题型（三刷练习）
                            </h4>
                            {keyProblems.map((p) => {
                              const formatDuration = (d: number) => {
                                if (!d) return '-';
                                const mins = Math.floor(d / 60);
                                const secs = d % 60;
                                return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
                              };
                              const firstTime = p.records[0]?.timeSpent || 0;
                              const lastTime = p.records[p.records.length - 1]?.timeSpent || 0;
                              const improvement = firstTime > 0 ? Math.round((firstTime - lastTime) / firstTime * 100) : 0;
                              // Build chart data for this problem
                              const chartData = p.records.map((rec, idx) => ({
                                name: ['一刷', '二刷', '三刷', '四刷', '五刷'][idx] || `第${idx+1}次`,
                                time: Math.round(rec.timeSpent / 60 * 10) / 10,
                                date: rec.date,
                              }));
                              const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
                              const lineColor = colors[['一刷', '二刷', '三刷', '四刷', '五刷'].indexOf(chartData[0]?.name) % colors.length] || '#f97316';

                              return (
                                <div key={p.problemId} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100/50">
                                  {/* 题目信息行 */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-semibold text-[#333344] text-sm">{p.problemName}</span>
                                        {improvement !== 0 && (
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${improvement > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                            {improvement > 0 ? `效率↑${improvement}%` : `效率↓${Math.abs(improvement)}%`}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {p.kpNames.length > 0 ? p.kpNames.map(name => (
                                          <span key={name} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{name}</span>
                                        )) : <span className="text-xs text-[#888]">暂无知识点</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 迷你折线图 + 刷次明细并排 */}
                                  <div className="flex gap-4">
                                    {/* 左侧：迷你折线图 */}
                                    <div className="flex-1 h-[120px] bg-gradient-to-br from-orange-50/30 to-amber-50/20 rounded-xl p-2">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                                          <YAxis tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} unit="分" />
                                          <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #f0f0f0', fontSize: '11px', padding: '6px 10px' }}
                                            formatter={(value: number, _name: string, props: { payload?: { date?: string } }) => [`${value}分钟`, props.payload?.date || '']}
                                          />
                                          <Line type="monotone" dataKey="time" stroke={lineColor} strokeWidth={2.5} dot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>

                                    {/* 右侧：刷次明细 */}
                                    <div className="w-[200px] flex flex-col gap-1.5">
                                      {['一刷', '二刷', '三刷'].map((label, i) => {
                                        const rec = p.records[i];
                                        return (
                                          <div key={label} className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${rec ? 'bg-[#F7F8FC]' : 'bg-gray-50'}`}>
                                            <span className="text-xs font-medium text-[#888] w-8">{label}</span>
                                            {rec ? (
                                              <div className="text-right">
                                                <span className="text-xs font-semibold text-orange-600">{formatDuration(rec.timeSpent)}</span>
                                                <span className="text-[10px] text-[#aaa] ml-1.5">{rec.date.slice(5)}</span>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-[#ccc]">无记录</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 普通题目 */}
                        {normalProblems.length > 0 && (
                          <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h4 className="text-base font-semibold text-[#555] flex items-center gap-2 mb-4">
                              <CheckCircle className="h-4 w-4 text-green-500" /> 已完成题目
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left py-2.5 px-3 font-semibold text-[#555]">题目</th>
                                    <th className="text-left py-2.5 px-3 font-semibold text-[#555]">知识点</th>
                                    <th className="text-center py-2.5 px-3 font-semibold text-[#555]">完成时间</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {normalProblems.map((p) => (
                                    <tr key={p.problemId} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-green-500 text-[10px]">✓</span>
                                          </div>
                                          <span className="font-medium text-[#333]">{p.problemName}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <div className="flex flex-wrap gap-1">
                                          {p.kpNames.length > 0 ? p.kpNames.map(name => (
                                            <span key={name} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded">{name}</span>
                                          )) : <span className="text-xs text-[#aaa]">-</span>}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        <span className="text-xs text-[#666]">{p.first.date}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: learnedKnowledge.length, label: '已学习知识点', color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200/50' },
                    { value: new Set(monthRetry.map(r => r.problemId)).size, label: '本月完成编程题', color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200/50' },
                    { value: (() => { const pids = [...new Set(monthRetry.map(r => r.problemId))]; return pids.filter(pid => monthRetry.filter(r => r.problemId === pid).length > 1).length; })(), label: '重点题型', color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200/50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center">
                      <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                      <div className="text-sm text-[#888] mt-2">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========== 时间轴模式：显示所有有数据的月份 ========== */}
          {timelineMode && getAvailableMonths().filter(m => m.key !== selectedMonth).map((monthInfo) => {
            const monthData = getMonthData(monthInfo.key);
            const monthQuote = timelineQuotes[monthInfo.key] || '努力不懈，持续进步。';
            
            return (
              <div key={monthInfo.key} className="rounded-[20px] overflow-hidden relative" style={{ background: '#f5f0e6' }}>
                {/* 顶部黄色横幅 */}
                <div 
                  className="w-full px-8 pt-6 pb-5 flex flex-col items-center justify-center"
                  style={{ background: '#e8b820' }}
                >
                  {/* 月份年份 */}
                  <div className="text-center text-3xl font-black text-[#1a1a1a] tracking-wider mb-3" style={{ fontFamily: '"Arial Black", "Helvetica Neue", sans-serif' }}>
                    {monthInfo.display}
                  </div>
                  {/* 励志文案 */}
                  <textarea
                    value={monthQuote}
                    onChange={(e) => setTimelineQuotes({ ...timelineQuotes, [monthInfo.key]: e.target.value })}
                    className="text-center text-sm text-white bg-transparent border-none outline-none resize-none w-full max-w-lg leading-relaxed"
                    rows={2}
                    placeholder="输入本月励志文案..."
                  />
                </div>

                <div className="p-10">
                  {/* 标题 */}
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#333344]">本月课程内容</h2>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent ml-4"></div>
                  </div>
                  
                  <div className="space-y-8">
                    {/* 知识点掌握情况 */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                        知识点掌握情况
                      </h3>
                      <div className="space-y-3">
                        {monthData.learnedKnowledge.length > 0 ? (
                          monthData.learnedKnowledge.map((kp) => (
                            <div key={kp.knowledgePointId} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-purple-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-[#333344] text-base">{kp.knowledgePointName}</span>
                                  <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-500 rounded-full">{kp.completedProblems}/{kp.totalProblems}题</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-2 rounded-full bg-purple-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${kp.completionPercent}%` }}></div>
                                  </div>
                                  <span className="text-xs text-[#888] w-10 text-right">{kp.completionPercent}%</span>
                                  <div className="flex">{renderStars(kp.stars)}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-white rounded-2xl p-10 text-center">
                            <p className="text-[#888]">暂无知识点学习记录</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 本月完成题目 */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                        本月完成题目
                      </h3>
                      {(() => {
                        const problemGroups = monthData.retry.reduce((acc, r) => {
                          if (!acc[r.problemId]) acc[r.problemId] = [];
                          acc[r.problemId].push(r);
                          return acc;
                        }, {} as Record<string, typeof monthData.retry>);

                        const problems = Object.entries(problemGroups).map(([problemId, records]) => {
                          const hasRetry = records.length > 1;
                          const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
                          const first = sorted[0];
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
                          return <div className="bg-white rounded-2xl p-10 text-center"><p className="text-[#888]">暂无完成题目记录</p></div>;
                        }

                        return (
                          <div className="space-y-5">
                            {/* 重点题型 */}
                            {keyProblems.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-orange-400">
                                <h4 className="text-base font-semibold text-orange-600 mb-5 flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5" /> 重点题型（多次练习）
                                </h4>
                                <div className="space-y-4">
                                  {keyProblems.map((p) => (
                                    <div key={p.problemId} className="rounded-2xl p-5 border border-orange-100" style={{ background: 'linear-gradient(135deg, #fffaf5, #fff5eb)' }}>
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-[#333344] text-base">{p.problemName}</span>
                                        <span className="text-xs px-3 py-1 bg-orange-100 text-orange-600 rounded-full font-medium">
                                          练习 {p.records.length} 次
                                        </span>
                                      </div>
                                      {p.kpNames.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                          {p.kpNames.map(name => (
                                            <span key={name} className="text-xs px-3 py-1 bg-blue-50 text-blue-500 rounded-full">{name}</span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="space-y-2">
                                        {p.records.map((r, idx) => (
                                          <div key={idx} className="flex items-center justify-between py-2 px-4 rounded-xl bg-white/70">
                                            <span className="text-sm text-[#888]">第{r.attempt || idx + 1}次</span>
                                            <span className="text-sm text-[#555]">{r.date}</span>
                                            <span className="text-sm text-[#555]">{r.timeSpent ? `${r.timeSpent}秒` : '-'}</span>
                                            <span className="text-xs text-[#888]">{r.notes || '-'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 普通题目 */}
                            {normalProblems.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h4 className="text-base font-semibold text-[#555] flex items-center gap-2 mb-4">
                                  <CheckCircle className="h-4 w-4 text-green-500" /> 已完成题目
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-100">
                                        <th className="text-left py-2.5 px-3 font-semibold text-[#555]">题目</th>
                                        <th className="text-left py-2.5 px-3 font-semibold text-[#555]">知识点</th>
                                        <th className="text-center py-2.5 px-3 font-semibold text-[#555]">完成时间</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {normalProblems.map((p) => (
                                        <tr key={p.problemId} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                                          <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-green-500 text-[10px]">✓</span>
                                              </div>
                                              <span className="font-medium text-[#333]">{p.problemName}</span>
                                            </div>
                                          </td>
                                          <td className="py-3 px-3">
                                            <div className="flex flex-wrap gap-1">
                                              {p.kpNames.length > 0 ? p.kpNames.map(name => (
                                                <span key={name} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded">{name}</span>
                                              )) : <span className="text-xs text-[#aaa]">-</span>}
                                            </div>
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className="text-xs text-[#666]">{p.first.date}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* 统计信息 */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: monthData.learnedKnowledge.length, label: '已学习知识点', color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200/50' },
                        { value: new Set(monthData.retry.map(r => r.problemId)).size, label: '本月完成编程题', color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200/50' },
                        { value: (() => { const pids = [...new Set(monthData.retry.map(r => r.problemId))]; return pids.filter(pid => monthData.retry.filter(r => r.problemId === pid).length > 1).length; })(), label: '重点题型', color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200/50' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center">
                          <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                          <div className="text-sm text-[#888] mt-2">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ========== 合并报告模式：显示选中的多个月份合并数据 ========== */}
          {mergeMode && selectedMergeMonths.length > 0 && mergedData && (
            <div className="rounded-[20px] overflow-hidden relative" style={{ background: '#f5f0e6' }}>
              {/* 顶部黄色横幅 */}
              <div 
                className="w-full px-8 pt-6 pb-5 flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #e8b820, #f0c840)' }}
              >
                {/* 报告标题 */}
                <div className="text-center text-3xl font-black text-[#1a1a1a] tracking-wider mb-2" style={{ fontFamily: '"Arial Black", "Helvetica Neue", sans-serif' }}>
                  {selectedMergeMonths.length === 6 ? '半年度报告' : selectedMergeMonths.length === 12 ? '年度报告' : `${selectedMergeMonths.length}个月合并报告`}
                </div>
                {/* 月份范围 */}
                <div className="text-sm text-white/90 mb-2">
                  {(() => {
                    const sorted = [...selectedMergeMonths].sort();
                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];
                    return `${first} ~ ${last}`;
                  })()}
                </div>
                {/* 励志文案 */}
                <textarea
                  value={mergedQuote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMergedQuote(e.target.value)}
                  className="text-center text-sm text-white bg-transparent border-none outline-none resize-none w-full max-w-lg leading-relaxed"
                  rows={2}
                  placeholder="输入合并报告励志文案..."
                />
              </div>

              <div className="p-10">
                {/* 标题 */}
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#333344]">合并课程内容</h2>
                    <p className="text-sm text-[#888] mt-1">包含 {selectedMergeMonths.length} 个月份的学习数据</p>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent ml-4"></div>
                </div>
                
                <div className="space-y-8">
                  {/* 合并知识点掌握情况 */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                      知识点掌握情况（合并）
                    </h3>
                    <div className="space-y-3">
                      {mergedData.knowledgeMastery.length > 0 ? (
                        mergedData.knowledgeMastery.map((kp: { knowledgePointId: string; knowledgePointName: string; completion: number; stars: number }) => (
                          <div key={kp.knowledgePointId} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-purple-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-[#333344] text-base">{kp.knowledgePointName}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="w-24 h-2 rounded-full bg-purple-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${kp.completion}%` }}></div>
                                </div>
                                <span className="text-xs text-[#888] w-10 text-right">{kp.completion}%</span>
                                <div className="flex">{renderStars(kp.stars)}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded-2xl p-10 text-center">
                          <p className="text-[#888]">暂无知识点学习记录</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 合并完成题目 */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                      完成题目（合并）
                    </h3>
                    {(() => {
                      const problemMap = new Map<string, { problemId: string; problemName: string; records: ProblemRetryRecord[]; kpNames: string[] }>();
                      mergedData.retryRecords.forEach((r: ProblemRetryRecord) => {
                        const existing = problemMap.get(r.problemId);
                        if (existing) {
                          existing.records.push(r);
                        } else {
                          const problem = course?.problems?.find(p => p.id === r.problemId);
                          const kpNames = (problem?.knowledgePointIds || (problem?.knowledgePointId ? [problem.knowledgePointId] : []))
                            .map((id: string) => course?.knowledgePoints?.find(kp => kp.id === id)?.name || '')
                            .filter(Boolean);
                          problemMap.set(r.problemId, {
                            problemId: r.problemId,
                            problemName: r.problemName,
                            records: [r],
                            kpNames,
                          });
                        }
                      });
                      const allProblems = Array.from(problemMap.values());
                      const keyProblems = allProblems.filter(p => p.records.length > 1);
                      const normalProblems = allProblems.filter(p => p.records.length === 1);

                      return (
                        <div className="space-y-4">
                          {/* 重点题型 */}
                          {keyProblems.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-orange-400">
                              <h4 className="text-base font-semibold text-orange-600 mb-5 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" /> 重点题型（多次练习）
                              </h4>
                              <div className="space-y-4">
                                {keyProblems.map((p) => (
                                  <div key={p.problemId} className="rounded-2xl p-5 border border-orange-100" style={{ background: 'linear-gradient(135deg, #fffaf5, #fff5eb)' }}>
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="font-bold text-[#333344] text-base">{p.problemName}</span>
                                      <span className="text-xs px-3 py-1 bg-orange-100 text-orange-600 rounded-full font-medium">
                                        练习 {p.records.length} 次
                                      </span>
                                    </div>
                                    {p.kpNames.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mb-4">
                                        {p.kpNames.map(name => (
                                          <span key={name} className="text-xs px-3 py-1 bg-blue-50 text-blue-500 rounded-full">{name}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 普通题目 */}
                          {normalProblems.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                              <h4 className="text-base font-semibold text-[#555] flex items-center gap-2 mb-4">
                                <CheckCircle className="h-4 w-4 text-green-500" /> 已完成题目
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="text-left py-2.5 px-3 font-semibold text-[#555]">题目</th>
                                      <th className="text-left py-2.5 px-3 font-semibold text-[#555]">知识点</th>
                                      <th className="text-center py-2.5 px-3 font-semibold text-[#555]">完成时间</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {normalProblems.map((p) => (
                                      <tr key={p.problemId} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                              <span className="text-green-500 text-[10px]">✓</span>
                                            </div>
                                            <span className="font-medium text-[#333]">{p.problemName}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex flex-wrap gap-1">
                                            {p.kpNames.length > 0 ? p.kpNames.map(name => (
                                              <span key={name} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded">{name}</span>
                                            )) : <span className="text-xs text-[#aaa]">-</span>}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="text-xs text-[#666]">{p.records[0].date}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* 统计信息 */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: mergedData.knowledgeMastery.length, label: '已学习知识点', color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200/50' },
                      { value: new Set(mergedData.retryRecords.map((r: ProblemRetryRecord) => r.problemId)).size, label: '完成编程题', color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200/50' },
                      { value: (() => { const pids = [...new Set(mergedData.retryRecords.map((r: ProblemRetryRecord) => r.problemId))]; return pids.filter(pid => mergedData.retryRecords.filter((r: ProblemRetryRecord) => r.problemId === pid).length > 1).length; })(), label: '重点题型', color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200/50' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center">
                        <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                        <div className="text-sm text-[#888] mt-2">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== 第四页：能力反馈 ========== */}
          <div className="rounded-[20px] bg-white shadow-xl shadow-green-100/50 overflow-hidden">
            <div className="p-10">
              {/* 标题 */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#333344]">能力反馈</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-200 to-transparent ml-4"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 点赞 */}
                <div className="rounded-2xl p-6 border border-emerald-100" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
                  <h3 className="text-base font-semibold text-[#333344] mb-5 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ThumbsUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    点赞
                  </h3>
                  {teacherTags.praiseTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacherTags.praiseTags.map((tag) => (
                        <span key={tag} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-medium border border-emerald-100 shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : strongPoints.length > 0 ? (
                    <div className="space-y-3">
                      {strongPoints.slice(0, 5).map((kp, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/70">
                          <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-500 text-xs">✓</span>
                          </div>
                          <span className="text-[#333344] text-sm">{kp.knowledgePointName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#888] text-sm">暂无数据</p>
                  )}
                </div>

                {/* 待提升 */}
                <div className="rounded-2xl p-6 border border-orange-100" style={{ background: 'linear-gradient(135deg, #fffaf5, #fff7ed)' }}>
                  <h3 className="text-base font-semibold text-[#333344] mb-5 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    待提升
                  </h3>
                  {teacherTags.improveTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacherTags.improveTags.map((tag) => (
                        <span key={tag} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100 shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : weakPoints.length > 0 ? (
                    <div className="space-y-3">
                      {weakPoints.slice(0, 5).map((kp, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/70">
                          <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-500 text-xs">→</span>
                          </div>
                          <span className="text-[#333344] text-sm">{kp.knowledgePointName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#888] text-sm">暂无数据</p>
                  )}
                </div>
              </div>

              {/* 打字测试 - 表格+图表 */}
              {monthTyping.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-[#333344] mb-5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    打字测试记录
                  </h3>
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    {/* 表格形式展示 */}
                    <div className="overflow-hidden rounded-xl border border-emerald-100 mb-5">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-emerald-700">测试日期</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-700">指力（字/分）</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-700">悟性（正确率）</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-700">速度变化</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-700">正确率变化</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthTyping.sort((a, b) => a.date.localeCompare(b.date)).map((t, i, arr) => {
                            const prev = i > 0 ? arr[i - 1] : null;
                            const speedChange = prev ? t.speed - prev.speed : 0;
                            const accChange = prev ? t.accuracy - prev.accuracy : 0;
                            return (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}>
                                <td className="py-3 px-4 text-sm font-medium text-[#333]">{t.date}</td>
                                <td className="text-center py-3 px-4">
                                  <span className="text-lg font-bold text-emerald-600">{t.speed}</span>
                                  <span className="text-xs text-[#888] ml-1">字/分</span>
                                </td>
                                <td className="text-center py-3 px-4">
                                  <span className="text-lg font-bold text-blue-600">{t.accuracy}</span>
                                  <span className="text-xs text-[#888] ml-1">%</span>
                                </td>
                                <td className="text-center py-3 px-4">
                                  {prev ? (
                                    <span className={`text-sm font-bold ${speedChange > 0 ? 'text-green-500' : speedChange < 0 ? 'text-red-500' : 'text-[#888]'}`}>
                                      {speedChange > 0 ? `+${speedChange}` : speedChange}
                                    </span>
                                  ) : (
                                    <span className="text-[#ccc] text-sm">首次</span>
                                  )}
                                </td>
                                <td className="text-center py-3 px-4">
                                  {prev ? (
                                    <span className={`text-sm font-bold ${accChange > 0 ? 'text-green-500' : accChange < 0 ? 'text-red-500' : 'text-[#888]'}`}>
                                      {accChange > 0 ? `+${accChange}%` : `${accChange}%`}
                                    </span>
                                  ) : (
                                    <span className="text-[#ccc] text-sm">首次</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* 趋势折线图 */}
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={monthTyping.sort((a, b) => a.date.localeCompare(b.date)).map(t => ({
                            date: t.date.slice(5),
                            速度: t.speed,
                            正确率: t.accuracy,
                          }))}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#888' }} label={{ value: '字/分', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#888' } }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#888' }} domain={[0, 100]} label={{ value: '正确率%', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#888' } }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Area yAxisId="left" type="monotone" dataKey="速度" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" />
                          <Area yAxisId="right" type="monotone" dataKey="正确率" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAccuracy)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {typingImprovement !== 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className={`text-sm font-medium ${typingImprovement > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          相比上期{typingImprovement > 0 ? '↑ 提升' : '↓ 下降'} {Math.abs(typingImprovement)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== 出勤与作业统计 ========== */}
          {(monthHomework.length > 0 || monthRetry.length > 0) && (
            <div className="rounded-[20px] shadow-xl shadow-purple-100/50 overflow-hidden" style={{ background: 'linear-gradient(180deg, #faf5ff, #f3e8ff)' }}>
              <div className="p-10">
                {/* 标题 */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-200/50">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#333344]">月度出勤与作业</h2>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent ml-4"></div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* 出勤统计 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-purple-600 mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> 修行勤勉（出勤）
                    </h3>
                    {(() => {
                      // Count unique dates from all records as attendance
                      const allDates = new Set<string>();
                      monthTyping.forEach(t => allDates.add(t.date));
                      monthRetry.forEach(r => allDates.add(r.date));
                      monthHomework.forEach(h => allDates.add(h.date));
                      const attendanceCount = allDates.size;
                      // Estimate expected days (weekdays in month)
                      const year = parseInt(selectedMonth.split('-')[0]);
                      const month = parseInt(selectedMonth.split('-')[1]);
                      const daysInMonth = new Date(year, month, 0).getDate();
                      let weekdays = 0;
                      for (let d = 1; d <= daysInMonth; d++) {
                        const day = new Date(year, month - 1, d).getDay();
                        if (day !== 0 && day !== 6) weekdays++;
                      }
                      const attendanceRate = weekdays > 0 ? Math.round(attendanceCount / weekdays * 100) : 0;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#666]">出勤天数</span>
                            <span className="text-2xl font-bold text-purple-600">{attendanceCount}<span className="text-sm text-[#888] font-normal"> 天</span></span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#666]">出勤率</span>
                            <span className={`text-2xl font-bold ${attendanceRate >= 80 ? 'text-green-500' : attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{attendanceRate}%</span>
                          </div>
                          {/* 出勤率进度条 */}
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${attendanceRate >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : attendanceRate >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} style={{ width: `${Math.min(attendanceRate, 100)}%` }}></div>
                          </div>
                          {/* 出勤日期分布 */}
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-[#888] mb-2">出勤日期</p>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(allDates).sort().map(date => (
                                <span key={date} className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-md">{date.slice(5)}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 作业完成统计 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-violet-600 mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> 修炼日志（作业）
                    </h3>
                    {monthHomework.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#666]">作业次数</span>
                          <span className="text-2xl font-bold text-violet-600">{monthHomework.length}<span className="text-sm text-[#888] font-normal"> 次</span></span>
                        </div>
                        {/* 作业列表 */}
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {monthHomework.sort((a, b) => b.date.localeCompare(a.date)).map((hw, i) => (
                            <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-violet-50/50">
                              <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-violet-500 text-xs">{i + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#333] font-medium truncate">{hw.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-[#888]">{hw.date}</span>
                                  {hw.score && (
                                    <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-500 rounded">{hw.score}分</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* 作业完成趋势 */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="h-[80px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={monthHomework.sort((a, b) => a.date.localeCompare(b.date)).map(hw => ({ date: hw.date.slice(5), 作业: 1 }))} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                <Bar dataKey="作业" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#888] text-sm">本月暂无作业记录</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== 第五页：成长建议 ========== */}
          <div className="rounded-[20px] shadow-xl shadow-amber-100/50 overflow-hidden" style={{ background: 'linear-gradient(180deg, #fffbeb, #fef3c7)' }}>
            <div className="p-10">
              {/* 标题 */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#333344]">成长建议</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent ml-4"></div>
              </div>

              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#333344] mb-4 flex items-center gap-2">
                    <span className="text-lg">💡</span> 提升Tip
                  </h3>
                  {teacherTags.growthSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {teacherTags.growthSuggestions.map((sug, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 px-4 rounded-xl bg-amber-50/50">
                          <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5 shrink-0">
                            <span className="text-amber-500 text-xs">{i + 1}</span>
                          </div>
                          <p className="text-[#555] text-sm leading-relaxed">{sug}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#555] leading-relaxed text-sm">
                      {weakPoints.length > 0 
                        ? `建议重点复习${weakPoints.slice(0, 3).map(kp => kp.knowledgePointName).join('、')}等知识点，多做相关练习题巩固理解。`
                        : '继续保持当前的学习节奏，可以尝试一些进阶题目挑战自我。'}
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#333344] mb-4 flex items-center gap-2">
                    <span className="text-lg">🏠</span> 家校Tip
                  </h3>
                  <p className="text-[#555] leading-relaxed text-sm">
                    鼓励孩子尝试不同的解题方法，培养创新思维。当孩子遇到困难时，引导他们思考而不是直接给出答案。
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#333344] mb-4 flex items-center gap-2">
                    <span className="text-lg">🎯</span> 冲刺目标
                  </h3>
                  
                  {/* 冲刺目标表格 */}
                  <div className="space-y-4">
                    {/* 模块1：课程目标 */}
                    <div className="border border-amber-200/60 rounded-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200/40">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-amber-800">课程目标</span>
                          <span className="text-xs text-amber-600/70 ml-auto">自动推荐下月学习内容</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <Textarea
                          value={sprintCourseGoal}
                          onChange={(e) => setSprintCourseGoal(e.target.value)}
                          placeholder="输入下月课程学习目标..."
                          className="min-h-[80px] resize-none rounded-lg border-amber-200/50 bg-amber-50/30 text-sm focus-visible:ring-amber-200"
                        />
                      </div>
                    </div>

                    {/* 模块2：GESP考级 */}
                    <div className="border border-blue-200/60 rounded-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200/40">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-blue-800">GESP 考级</span>
                          <span className="text-xs text-blue-600/70">{course?.name || ''}对应</span>
                          {sprintGespLevels.length > 0 && (
                            <button
                              onClick={() => setShowAllGesp(!showAllGesp)}
                              className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              {showAllGesp ? '仅显示已选' : '显示全部'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        {/* 无选择时：显示全部可选 */}
                        {sprintGespLevels.length === 0 ? (
                          <div className="space-y-2">
                            {courseGespLevels.map((gesp) => (
                              <button
                                key={gesp.level}
                                onClick={() => toggleGespLevel(gesp.level as GESPLlevel)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 border bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                              >
                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                  {gesp.level}
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium">{gesp.name}</div>
                                  <div className="text-[10px] text-gray-400">{gesp.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : showAllGesp ? (
                          /* 有选择 + 显示全部模式 */
                          <div className="space-y-2">
                            {courseGespLevels.map((gesp) => {
                              const isSelected = sprintGespLevels.includes(gesp.level as GESPLlevel);
                              return (
                                <button
                                  key={gesp.level}
                                  onClick={() => toggleGespLevel(gesp.level as GESPLlevel)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 border ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400 shadow-md shadow-blue-200/50'
                                      : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 opacity-60'
                                  }`}
                                >
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isSelected ? 'bg-white/20' : 'bg-gray-100'
                                  }`}>
                                    {isSelected ? <Check className="h-3 w-3" strokeWidth={2} /> : gesp.level}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs font-medium">{gesp.name}</div>
                                    <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{gesp.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* 有选择 + 仅显示已选模式 */
                          <div className="space-y-2">
                            {courseGespLevels
                              .filter(g => sprintGespLevels.includes(g.level as GESPLlevel))
                              .map(gesp => (
                                <div key={gesp.level} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{gesp.level}</div>
                                  <div className="flex-1">
                                    <div className="text-xs font-medium">{gesp.name}</div>
                                    <div className="text-[10px] text-blue-100">{gesp.desc}</div>
                                  </div>
                                  <button
                                    onClick={() => toggleGespLevel(gesp.level as GESPLlevel)}
                                    className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 模块3：赛事 */}
                    <div className="border border-purple-200/60 rounded-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 px-4 py-3 border-b border-purple-200/40">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-purple-800">赛事活动</span>
                          {sprintCompetitionIds.length > 0 && (
                            <button
                              onClick={() => setShowAllCompetitions(!showAllCompetitions)}
                              className="ml-auto text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                            >
                              {showAllCompetitions ? '仅显示已选' : '显示全部'}
                            </button>
                          )}
                          <button
                            onClick={() => setShowAddCompetition(!showAddCompetition)}
                            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            添加
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        {/* 添加赛事表单 */}
                        {showAddCompetition && (
                          <div className="mb-4 p-3 bg-purple-50/50 rounded-lg border border-purple-200/40 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={newCompName}
                                onChange={(e) => setNewCompName(e.target.value)}
                                placeholder="赛事名称"
                                className="flex-1 h-8 text-xs rounded-lg border-purple-200/50 bg-white"
                              />
                              <Input
                                value={newCompDate}
                                onChange={(e) => setNewCompDate(e.target.value)}
                                placeholder="预计日期"
                                type="date"
                                className="w-32 h-8 text-xs rounded-lg border-purple-200/50 bg-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={newCompCategory}
                                onChange={(e) => setNewCompCategory(e.target.value)}
                                placeholder="分类（如：编程竞赛）"
                                className="flex-1 h-8 text-xs rounded-lg border-purple-200/50 bg-white"
                              />
                              <Button
                                onClick={handleAddCompetition}
                                className="h-8 px-3 text-xs rounded-lg bg-purple-500 hover:bg-purple-600 text-white"
                              >
                                添加
                              </Button>
                              <Button
                                onClick={() => setShowAddCompetition(false)}
                                variant="outline"
                                className="h-8 px-3 text-xs rounded-lg border-purple-200 text-purple-600"
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* 无选择时：显示全部可选 */}
                        {sprintCompetitionIds.length === 0 ? (
                          <div className="space-y-2">
                            {allCompetitions.map((comp) => {
                              const isCustom = comp.id.startsWith('comp_custom_');
                              return (
                                <div
                                  key={comp.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 cursor-pointer"
                                  onClick={() => toggleCompetition(comp.id)}
                                >
                                  <div className="h-4 w-4 rounded border border-gray-300 flex items-center justify-center" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{comp.name}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{comp.category}</div>
                                  </div>
                                  {isCustom && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRemoveCompetition(comp.id); }}
                                      className="h-4 w-4 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : showAllCompetitions ? (
                          /* 有选择 + 显示全部模式 */
                          <div className="space-y-2">
                            {allCompetitions.map((comp) => {
                              const isSelected = sprintCompetitionIds.includes(comp.id);
                              const isCustom = comp.id.startsWith('comp_custom_');
                              return (
                                <div
                                  key={comp.id}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-purple-400 shadow-md shadow-purple-200/50'
                                      : 'bg-white text-gray-400 border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 opacity-60'
                                  }`}
                                  onClick={() => toggleCompetition(comp.id)}
                                >
                                  <div className={`h-4 w-4 rounded flex items-center justify-center border ${
                                    isSelected ? 'bg-white/20 border-white/40' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={2} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{comp.name}</div>
                                    <div className={`text-[10px] truncate ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>{comp.category}</div>
                                  </div>
                                  {isCustom && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRemoveCompetition(comp.id); }}
                                      className={`h-4 w-4 rounded-full flex items-center justify-center ${
                                        isSelected ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                      }`}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* 有选择 + 仅显示已选模式 */
                          <div className="space-y-2">
                            {allCompetitions
                              .filter(c => sprintCompetitionIds.includes(c.id))
                              .map(comp => {
                                const isCustom = comp.id.startsWith('comp_custom_');
                                return (
                                  <div key={comp.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm">
                                    <Trophy className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{comp.name}</div>
                                      <div className="text-[10px] text-purple-100 truncate">{comp.category}{comp.date ? ` · ${comp.date}` : ''}</div>
                                    </div>
                                    <button
                                      onClick={() => toggleCompetition(comp.id)}
                                      className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 保存按钮 */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveSprintGoal}
                        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200/50 transition-all duration-200"
                      >
                        <Target className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        保存冲刺目标
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========== 第六页：课堂风采 ========== */}
          <div className="rounded-[20px] shadow-xl overflow-hidden relative" style={{ background: 'linear-gradient(180deg, #fef7f0, #fdf2e9)' }}>
            {/* 纸质纹理 */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zM20 0h1v40h-1z'/%3E%3C/g%3E%3C/svg%3E")` }} />
            <div className="p-10 relative">
              {/* 标题 */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center shadow-lg shadow-rose-200/50">
                  <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#333344]">课堂风采</h2>
                  <p className="text-xs text-[#999] mt-0.5">记录精彩瞬间</p>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-rose-200 to-transparent ml-4"></div>
              </div>

              {/* 9宫格照片展示 - 纸质相册风格 */}
              <div className="grid grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, i) => {
                  const photo = classroomPhotos[i];
                  if (photo) {
                    return (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 hover:scale-[1.03] relative group" style={{ background: '#fff', padding: '6px' }}>
                        <div className="w-full h-full rounded-xl overflow-hidden relative">
                          <img src={photo} alt={`课堂照片${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                    );
                  } else if (i === classroomPhotos.length && classroomPhotos.length < 9) {
                    return (
                      <div 
                        key={i}
                        className="aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-lg relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #fef7f0, #fce7f3)', border: '2px dashed #e8c4b8' }}
                        onClick={handleClassroomPhotoUpload}
                      >
                        <div className="text-center z-10">
                          <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center mx-auto mb-2 shadow-md transition-transform duration-300 hover:scale-110">
                            <Camera className="h-7 w-7 text-[#c49a8a]" strokeWidth={1.2} />
                          </div>
                          <span className="text-sm font-medium text-[#c49a8a]">添加照片</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={i} className="aspect-square rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f0eb, #ede5dc)', border: '1px solid rgba(200,180,160,0.2)' }}>
                        <Camera className="h-10 w-10 text-[#d4c4b4]" strokeWidth={1} />
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>

          {/* ========== 第七页：家校共育+老师寄语 ========== */}
          <div className="rounded-[20px] shadow-xl shadow-indigo-100/50 overflow-hidden" style={{ background: 'linear-gradient(180deg, #eef2ff, #e0e7ff)' }}>
            <div className="p-10">
              {/* 标题 */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#333344]">家校共育</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent ml-4"></div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#333344] mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span> 陪伴创新
                  </h3>
                  <p className="text-[#555] text-sm leading-relaxed">
                    鼓励孩子尝试不同的解题方法，培养创新思维。当孩子遇到困难时，引导他们思考而不是直接给出答案。
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#333344] mb-3 flex items-center gap-2">
                    <span className="text-lg">📚</span> 学业跟进
                  </h3>
                  <p className="text-[#555] text-sm leading-relaxed">
                    关注孩子的学习进度，定期检查作业完成情况。建议每天安排固定的编程练习时间，保持学习连贯性。
                  </p>
                </div>
              </div>

              {/* 老师寄语 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-200/50">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-[#333344]">老师寄语</h2>
                </div>

                <div className="space-y-4">
                  {/* 快捷标签多选 */}
                  <div>
                    <Label className="text-sm font-medium text-[#555] mb-3 block">快捷评语（可多选，自动组合到寄语）</Label>
                    <div className="flex flex-wrap gap-2">
                      {TEACHER_COMMENT_PRESETS.map(preset => {
                        const isSelected = selectedCommentPresets.includes(preset.id);
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              const newPresets = isSelected
                                ? selectedCommentPresets.filter(id => id !== preset.id)
                                : [...selectedCommentPresets, preset.id];
                              setSelectedCommentPresets(newPresets);
                              // Auto-compose comment from selected presets
                              const selectedTexts = newPresets.map(id => TEACHER_COMMENT_PRESETS.find(p => p.id === id)?.text).filter(Boolean);
                              setTeacherComment(selectedTexts.join('\n'));
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              isSelected 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-md shadow-indigo-200/50' 
                                : 'bg-white text-[#555] border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                            }`}
                          >
                            {isSelected && <Check className="inline h-3.5 w-3.5 mr-1" />}
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 完整模板 */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-[#555]">或选择完整模板</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)} className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                      <Award className="mr-2 h-4 w-4" />
                      {showTemplates ? '收起模板' : '展开模板'}
                    </Button>
                  </div>

                  {showTemplates && (
                    <div className="bg-[#F7F8FC] rounded-2xl p-4 space-y-2 border border-indigo-100">
                      <p className="text-sm font-medium text-[#555] mb-2">推荐模板：</p>
                      {COMMENT_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => { setTeacherComment(template.content); setSelectedCommentPresets([]); }}
                          className="w-full text-left p-3 rounded-xl hover:bg-white transition-all duration-200 border border-transparent hover:border-indigo-200 hover:shadow-sm"
                        >
                          <div className="font-medium text-sm text-[#333344]">{template.name}</div>
                          <div className="text-xs text-[#888] mt-1 line-clamp-2">{template.content}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 自定义编辑 */}
                  <div>
                    <Label className="text-sm font-medium text-[#555] mb-2 block">自定义编辑</Label>
                    <Textarea
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      placeholder="写下您对学生的寄语和鼓励..."
                      className="min-h-[120px] resize-none rounded-xl border-gray-200 bg-[#F7F8FC] focus-visible:ring-indigo-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 页脚 */}
          <div className="rounded-[20px] overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #3066FF 0%, #6B3FA0 50%, #9933FF 100%)' }}>
            <div className="p-10 text-center text-white">
              <p className="text-xl font-bold mb-2 tracking-wide">战码编程</p>
              <p className="text-sm opacity-70">快乐学习 · 收获成长</p>
              <p className="text-xs opacity-50 mt-2">爱心施教 · 娃娃为王</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
