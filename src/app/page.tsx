'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Upload, Search, Trash2, FileText, Code2, Settings,
  Users, Check, Keyboard, RotateCcw, BookOpen, Save, X,
  TrendingUp, ChevronDown, History, Sparkles, Scroll, Swords,
  ChevronRight, ChevronLeft, Eye, EyeOff, Edit, Award, Trophy,
  UserPlus, ChevronUp, ImageIcon,
} from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import type { Student, Course, TypingRecord, ProblemRetryRecord, HomeworkRecord, ExamRecord, CompetitionRecord, HonorRecord, ExamQuestionResult, CompetitionQuestionResult } from '@/lib/types';
import {
  getCourses, getStudents, getStudentsByCourse, addStudent, deleteStudent, updateStudent,
  addTypingRecord, addRetryRecord, addHomeworkRecord, getRetryRecords,
  getTypingByStudent, getRetryByStudent, getHomeworkByStudent, getKnowledgeByStudent,
  getCourses as getCoursesForUpdate,
  addClassToCourse, removeClassFromCourse, renameClassInCourse, getCourseClasses,
  saveExamRecord, saveCompetitionRecord, saveHonorRecord, getHonorRecordsByStudent,
  getExamRecordsByStudent, getStudentPhotos, saveStudentPhotos,
} from '@/lib/store';
import {
  type AutoTag, generateAutoTags, calcTypingSummary, calcRetrySummary,
  calcHomeworkSummary, calcKnowledgeMastery, getMonthRange, getPreviousMonthRange,
  getRecordsInPeriod,
} from '@/lib/analytics';
import { XIAN, COURSE_COLORS, PRESET_STRENGTHS, PRESET_IMPROVEMENTS, getGespLevelsByCourse } from '@/lib/constants';

type RecordTab = 'retry' | 'typing' | 'homework' | 'exam' | 'competition' | 'honor' | 'photos';

interface RetryRowForm {
  id: string;
  problemId: string;
  problemName: string;
  timeSpent: string; // 本次用时（分钟）
  isQualified: boolean; // 是否合格
  unqualifiedReason?: string; // 不合格原因
  praiseTags?: string[];
  improveTags?: string[];
}

interface TypingForm { speed: string; praiseTags: string[]; improveTags: string[] }
interface HomeworkForm { content: string; completion: string; comment: string; praiseTags?: string[]; improveTags?: string[] }

// Growth suggestion presets
const GROWTH_SUGGESTION_PRESETS = [
  '多做基础练习巩固理解',
  '加强打字速度和正确率',
  '尝试独立完成题目',
  '注重代码规范和注释',
  '培养调试和排错能力',
  '学习更高效的解题方法',
  '加强逻辑思维训练',
  '提升问题拆解能力',
] as const;

// ==================== 考级 Tab 组件 ====================
interface ExamSet {
  id: string;
  level: number;
  examDate: string;
  results: ExamQuestionResult[];
}

function ExamTab({ selectedStudentIds, students, selectedCourseId }: { selectedStudentIds: Set<string>; students: Student[]; selectedCourseId: string }) {
  // 年份选项：2020-2030
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());
  const [examLevel, setExamLevel] = useState(1);
  // 4套试卷: 3月/6月/9月/12月
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [wrongNoteMap, setWrongNoteMap] = useState<Record<string, Record<number, string>>>({});
  // 记录每个学员每套试卷的完成状态
  const [completedSets, setCompletedSets] = useState<Record<string, Set<number>>>({});

  const isVisual = selectedCourseId === 'course_visual';
  const totalQuestions = isVisual ? 17 : 27;
  const months = [3, 6, 9, 12];

  // 加载已有考级记录
  useEffect(() => {
    const sets: ExamSet[] = months.map((m, idx) => {
      const results: ExamQuestionResult[] = [];
      for (let i = 1; i <= totalQuestions; i++) {
        results.push({ questionIndex: i, isCorrect: true });
      }
      return {
        id: `set_${activeYear}_${m}`,
        level: examLevel,
        examDate: `${activeYear}年${m}月`,
        results,
      };
    });

    // 加载每个学员的已有记录
    const newCompleted: Record<string, Set<number>> = {};
    selectedStudentIds.forEach(studentId => {
      const records = getExamRecordsByStudent(studentId);
      const studentRecords = records.filter(r => r.courseId === selectedCourseId && r.level === examLevel && r.examDate.startsWith(`${activeYear}年`));
      const completed = new Set<number>();
      studentRecords.forEach(record => {
        const month = parseInt(record.examDate.replace(`${activeYear}年`, '').replace('月', ''));
        const setIdx = months.indexOf(month);
        if (setIdx >= 0) {
          completed.add(setIdx);
          // 恢复试卷结果
          sets[setIdx].results = record.results;
          // 恢复错题笔记
          const key = `${activeYear}_${setIdx}`;
          const notes: Record<number, string> = {};
          record.results.forEach(r => {
            if (r.note) {
              notes[r.questionIndex - 1] = r.note;
            }
          });
          setWrongNoteMap(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...notes } }));
        }
      });
      newCompleted[studentId] = completed;
    });

    setExamSets(sets);
    setCompletedSets(newCompleted);
  }, [activeYear, examLevel, totalQuestions, selectedStudentIds, selectedCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 年份下拉选项（2020-2030）
  const allYears = Array.from({ length: 11 }, (_, i) => 2020 + i);

  // 切换对错
  const toggleQuestion = useCallback((setIdx: number, qIdx: number) => {
    setExamSets(prev => prev.map((set, si) => {
      if (si !== setIdx) return set;
      return {
        ...set,
        results: set.results.map((r, i) => i === qIdx ? { ...r, isCorrect: !r.isCorrect } : r),
      };
    }));
  }, []);

  // 保存错题备注
  const updateWrongNote = useCallback((setIdx: number, qIdx: number, note: string) => {
    const key = `${activeYear}_${setIdx}`;
    setWrongNoteMap(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [qIdx]: note },
    }));
  }, [activeYear]);

  // 保存考级记录
  const handleSaveExam = useCallback((studentId: string, setIdx: number) => {
    const activeSet = examSets[setIdx];
    if (!activeSet) return;
    const correctCount = activeSet.results.filter(r => r.isCorrect).length;
    const key = `${activeYear}_${setIdx}`;
    const notes = wrongNoteMap[key] || {};
    const record: ExamRecord = {
      id: `exam_${studentId}_${activeSet.examDate}_${Date.now()}`,
      studentId,
      courseId: selectedCourseId,
      level: examLevel,
      examDate: activeSet.examDate,
      totalQuestions,
      correctCount,
      wrongCount: totalQuestions - correctCount,
      results: activeSet.results.map(r => ({
        ...r,
        note: notes[r.questionIndex - 1] || r.note,
      })),
      createdAt: new Date().toISOString(),
    };
    saveExamRecord(record);
    // 更新完成状态
    setCompletedSets(prev => {
      const studentCompleted = prev[studentId] || new Set();
      const newCompleted = new Set(studentCompleted);
      newCompleted.add(setIdx);
      return { ...prev, [studentId]: newCompleted };
    });
  }, [examSets, examLevel, selectedCourseId, totalQuestions, wrongNoteMap, activeYear]);

  const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));
  if (selectedStudents.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">请在左侧选择学员</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部控制栏 */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">年份</span>
          <select value={activeYear} onChange={e => setActiveYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {allYears.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">级别</span>
          <select value={examLevel} onChange={e => setExamLevel(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Array.from({ length: isVisual ? 6 : 8 }, (_, i) => i + 1).map(l => (
              <option key={l} value={l}>{l}级</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-400 ml-auto">
          选择题{isVisual ? 10 : 15}道 | 判断题{isVisual ? 5 : 10}道 | 编程题2道 | 共{totalQuestions}道
        </div>
      </div>

      {/* 4套试卷并列 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 gap-4">
          {examSets.map((set, setIdx) => {
            const correctCount = set.results.filter(r => r.isCorrect).length;
            const wrongCount = totalQuestions - correctCount;
            const key = `${activeYear}_${setIdx}`;
            const notes = wrongNoteMap[key] || {};
            return (
              <div key={set.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-blue-600">{set.examDate}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                      正确 {correctCount}/{totalQuestions}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                      错误 {wrongCount}
                    </span>
                  </div>
                </div>

                {/* 题目分组 */}
                {(() => {
                  const groups = isVisual
                    ? [{ label: '选择题', start: 1, end: 10 }, { label: '判断题', start: 11, end: 15 }, { label: '编程题', start: 16, end: 17 }]
                    : [{ label: '选择题', start: 1, end: 15 }, { label: '判断题', start: 16, end: 25 }, { label: '编程题', start: 26, end: 27 }];
                  return groups.map(group => (
                    <div key={group.label} className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1.5">{group.label}（{group.start}-{group.end}）</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: group.end - group.start + 1 }, (_, i) => {
                          const idx = group.start - 1 + i;
                          const result = set.results[idx];
                          if (!result) return null;
                          const hasNote = notes[idx] || result.note;
                          return (
                            <div key={idx} className="flex flex-col items-center min-w-[32px]">
                              <span className="text-[10px] text-gray-400 mb-0.5">{result.questionIndex}</span>
                              <button
                                onClick={() => toggleQuestion(setIdx, idx)}
                                className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-all border ${
                                  result.isCorrect
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                                }`}>
                                {result.isCorrect ? '✓' : '✗'}
                              </button>
                              {!result.isCorrect && (
                                <input
                                  value={notes[idx] || ''}
                                  onChange={e => updateWrongNote(setIdx, idx, e.target.value)}
                                  placeholder="错因"
                                  className="mt-0.5 w-full h-5 text-[9px] px-0.5 rounded border border-gray-200 focus:border-blue-300 focus:outline-none text-center"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}

                {/* 学员保存按钮 */}
                <div className="border-t border-gray-100 pt-2 space-y-1.5">
                  {selectedStudents.map(student => {
                    const isCompleted = completedSets[student.id]?.has(setIdx) || false;
                    return (
                      <div key={student.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{student.name}</span>
                          {isCompleted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">已完成</span>}
                        </div>
                        <Button size="sm" onClick={() => handleSaveExam(student.id, setIdx)}
                          className={`h-7 text-xs px-3 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                          {isCompleted ? '重新保存' : '保存'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 赛事 Tab 组件 ====================
function CompetitionTab({ selectedStudentIds, students, selectedCourseId }: { selectedStudentIds: Set<string>; students: Student[]; selectedCourseId: string }) {
  const [compName, setCompName] = useState('');
  const [compDate, setCompDate] = useState('');
  const [compItems, setCompItems] = useState<{ name: string; totalQ: number }[]>([{ name: '赛项1', totalQ: 10 }]);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [compResults, setCompResults] = useState<CompetitionQuestionResult[]>([]);

  const activeItem = compItems[activeItemIdx];

  useEffect(() => {
    if (!activeItem) return;
    const results: CompetitionQuestionResult[] = [];
    for (let i = 1; i <= activeItem.totalQ; i++) {
      results.push({ questionIndex: i, isCorrect: true });
    }
    setCompResults(results);
  }, [activeItem?.totalQ]);

  const toggleQuestion = (idx: number) => {
    setCompResults(prev => prev.map((r, i) => i === idx ? { ...r, isCorrect: !r.isCorrect } : r));
  };

  const addCompItem = () => {
    setCompItems(prev => [...prev, { name: `赛项${prev.length + 1}`, totalQ: 10 }]);
    setActiveItemIdx(compItems.length);
  };

  const removeCompItem = (idx: number) => {
    if (compItems.length <= 1) return;
    setCompItems(prev => prev.filter((_, i) => i !== idx));
    setActiveItemIdx(Math.max(0, activeItemIdx - (idx < activeItemIdx ? 1 : 0)));
  };

  const updateCompItem = (idx: number, field: 'name' | 'totalQ', value: string | number) => {
    setCompItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSaveComp = useCallback((studentId: string) => {
    if (!activeItem) return;
    const correctCount = compResults.filter(r => r.isCorrect).length;
    const record: CompetitionRecord = {
      id: `comp_${studentId}_${compDate}_${activeItem.name}_${Date.now()}`,
      studentId,
      courseId: selectedCourseId,
      competitionName: `${compName} - ${activeItem.name}`,
      competitionDate: compDate,
      totalQuestions: activeItem.totalQ,
      correctCount,
      wrongCount: activeItem.totalQ - correctCount,
      results: compResults,
      createdAt: new Date().toISOString(),
    };
    saveCompetitionRecord(record);
  }, [compResults, compDate, selectedCourseId, compName, activeItem]);

  const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));

  if (selectedStudents.length === 0) {
    return <div className="flex items-center justify-center h-32 text-gray-400 text-sm">请在左侧选择学员</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs text-gray-500">赛事名称</Label>
          <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="如：NOIP2026" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">赛事日期</Label>
          <Input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} className="mt-1 h-8 text-sm w-36" />
        </div>
      </div>

      {/* 赛项管理 */}
      <div className="flex items-center gap-2 flex-wrap">
        {compItems.map((item, idx) => (
          <div key={idx} className={`flex items-center gap-1 px-2 py-1 rounded border ${idx === activeItemIdx ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <button onClick={() => setActiveItemIdx(idx)} className="text-xs font-medium text-gray-700 hover:text-blue-600">{item.name}</button>
            <Input value={item.totalQ} onChange={e => updateCompItem(idx, 'totalQ', Number(e.target.value))} className="h-5 w-12 text-xs" min={1} max={50} type="number" />
            {compItems.length > 1 && <button onClick={() => removeCompItem(idx)} className="text-red-400 hover:text-red-600 text-xs">×</button>}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCompItem} className="h-7 text-xs">+ 添加赛项</Button>
      </div>

      {selectedStudents.map(student => (
        <div key={student.id} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-gray-800">{student.name} {activeItem && <span className="text-xs text-gray-500">- {activeItem.name} ({activeItem.totalQ}题)</span>}</span>
            <Button size="sm" onClick={() => handleSaveComp(student.id)} disabled={!compName || !compDate}>保存记录</Button>
          </div>
          <div className="space-y-1">
            {Array.from({ length: Math.ceil((activeItem?.totalQ || 0) / 10) }, (_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-1">
                <div className="flex gap-1 flex-wrap">
                  {compResults.slice(rowIdx * 10, (rowIdx + 1) * 10).map((result, colIdx) => {
                    const idx = rowIdx * 10 + colIdx;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 mb-0.5">{result.questionIndex}</span>
                        <button
                          onClick={() => toggleQuestion(idx)}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-all ${
                            result.isCorrect
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 荣誉 Tab 组件 ====================
function HonorTab({ selectedStudentIds, students, selectedCourseId }: { selectedStudentIds: Set<string>; students: Student[]; selectedCourseId: string }) {
  const [honorType, setHonorType] = useState<'exam' | 'competition'>('exam');
  const [uploadLevel, setUploadLevel] = useState<number | null>(null);
  const [uploadStudentId, setUploadStudentId] = useState<string>('');
  const [certificateImg, setCertificateImg] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null); // key: `${studentId}_${level}`
  const [expandedCompetition, setExpandedCompetition] = useState<string | null>(null); // key: `${studentId}_${honorId}`

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 赛事相关状态
  const [showAddCompetitionDialog, setShowAddCompetitionDialog] = useState(false);
  const [addCompetitionStudentId, setAddCompetitionStudentId] = useState<string>('');
  const [competitionName, setCompetitionName] = useState('');
  const [competitionAward, setCompetitionAward] = useState('');
  const [competitionDate, setCompetitionDate] = useState(todayStr);

  const [honorDate, setHonorDate] = useState(todayStr);

  const isVisual = selectedCourseId === 'course_visual';
  const levels = getGespLevelsByCourse(selectedCourseId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCertificateImg(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 压缩图片（用于证书上传）
  const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadStudentId || uploadLevel === null) return;
    const levelDef = levels.find(l => l.level === uploadLevel);
    if (!levelDef) return;

    // 压缩证书图片
    let compressedImg = certificateImg;
    if (certificateImg) {
      compressedImg = await compressImage(certificateImg);
    }

    const record: HonorRecord = {
      id: `honor_${uploadStudentId}_${uploadLevel}_${Date.now()}`,
      studentId: uploadStudentId,
      courseId: selectedCourseId,
      type: honorType,
      title: honorType === 'exam' ? levelDef.name : levelDef.name,
      level: uploadLevel,
      achievedDate: honorDate,
      certificateUrl: compressedImg || undefined,
      createdAt: new Date().toISOString(),
    };
    saveHonorRecord(record);
    setCertificateImg('');
    setShowUploadDialog(false);
    setUploadLevel(null);
    setUploadStudentId('');
  }, [uploadStudentId, uploadLevel, levels, honorType, selectedCourseId, honorDate, certificateImg]);

  // 获取学员已有荣誉
  const getStudentHonors = (studentId: string) => {
    return getHonorRecordsByStudent(studentId).filter(h => h.courseId === selectedCourseId);
  };

  // 判断考级是否已通过（本级或更高级已通过）
  const isLevelPassed = (honors: HonorRecord[], level: number) => {
    return honors.some(h => h.type === 'exam' && (h.level || 0) >= level);
  };

  // 获取某级别的证书图片
  const getLevelCertificate = (honors: HonorRecord[], level: number) => {
    const honor = honors.find(h => h.level === level && h.certificateUrl);
    return honor?.certificateUrl || null;
  };

  // 获取已通过的最高级别
  const getHighestPassedLevel = (honors: HonorRecord[]) => {
    const examHonors = honors.filter(h => h.type === 'exam');
    if (examHonors.length === 0) return 0;
    return Math.max(...examHonors.map(h => h.level || 0));
  };

  // 赛事相关函数
  const getStudentCompetitions = (studentId: string) => {
    return getStudentHonors(studentId).filter(h => h.type === 'competition');
  };

  const handleAddCompetition = useCallback(async () => {
    if (!addCompetitionStudentId || !competitionName.trim()) return;

    // 压缩证书图片
    let compressedImg = certificateImg;
    if (certificateImg) {
      compressedImg = await compressImage(certificateImg);
    }

    const record: HonorRecord = {
      id: `honor_${addCompetitionStudentId}_comp_${Date.now()}`,
      studentId: addCompetitionStudentId,
      courseId: selectedCourseId,
      type: 'competition',
      title: competitionName.trim(),
      level: 0,
      achievedDate: competitionDate,
      certificateUrl: compressedImg || undefined,
      createdAt: new Date().toISOString(),
    };
    saveHonorRecord(record);
    setCertificateImg('');
    setCompetitionName('');
    setCompetitionAward('');
    setCompetitionDate(todayStr);
    setShowAddCompetitionDialog(false);
    setAddCompetitionStudentId('');
  }, [addCompetitionStudentId, competitionName, competitionAward, competitionDate, certificateImg, selectedCourseId, todayStr]);

  const handleCompetitionUpload = (studentId: string, honorId: string) => {
    setUploadStudentId(studentId);
    // 找到对应的荣誉记录
    const honors = getStudentHonors(studentId);
    const honor = honors.find(h => h.id === honorId);
    if (honor) {
      setCertificateImg(honor.certificateUrl || '');
    }
    setShowUploadDialog(true);
  };

  const handleConfirmCompetitionUpload = useCallback(async () => {
    if (!uploadStudentId) return;

    // 压缩证书图片
    let compressedImg = certificateImg;
    if (certificateImg) {
      compressedImg = await compressImage(certificateImg);
    }

    // 更新现有的荣誉记录
    const allHonors = getHonorRecordsByStudent(uploadStudentId).filter(h => h.courseId === selectedCourseId);
    const honor = allHonors.find(h => h.id === expandedCompetition?.split('_').slice(2).join('_'));
    if (honor) {
      const updatedRecord: HonorRecord = {
        ...honor,
        certificateUrl: compressedImg || undefined,
      };
      saveHonorRecord(updatedRecord);
    }
    setCertificateImg('');
    setShowUploadDialog(false);
    setUploadStudentId('');
  }, [uploadStudentId, certificateImg, expandedCompetition, selectedCourseId]);

  const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));

  if (selectedStudents.length === 0) {
    return <div className="flex items-center justify-center h-32 text-gray-400 text-sm">请在左侧选择学员</div>;
  }

  return (
    <div className="space-y-6">
      {/* 类型切换 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setHonorType('exam')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            honorType === 'exam'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          考级记录
        </button>
        <button
          onClick={() => setHonorType('competition')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            honorType === 'competition'
              ? 'bg-purple-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          赛事记录
        </button>
      </div>

      {/* 学员列表 */}
      {selectedStudents.map(student => {
        const honors = getStudentHonors(student.id);
        const highestPassed = getHighestPassedLevel(honors);
        const competitions = getStudentCompetitions(student.id);

        return (
          <div key={student.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* 学员标题 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-blue-800">{student.name}</span>
                {honorType === 'exam' && highestPassed > 0 && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    已通过 {highestPassed} 级
                  </span>
                )}
              </div>
              {honorType === 'competition' && (
                <button
                  onClick={() => {
                    setAddCompetitionStudentId(student.id);
                    setCompetitionName('');
                    setCompetitionAward('');
                    setCompetitionDate(todayStr);
                    setCertificateImg('');
                    setShowAddCompetitionDialog(true);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  添加赛事
                </button>
              )}
            </div>

            {honorType === 'exam' ? (
              /* 考级级别列表 */
              <div className="p-3 space-y-3">
                {levels.map((levelDef) => {
                  const passed = isLevelPassed(honors, levelDef.level);
                  const certImg = getLevelCertificate(honors, levelDef.level);

                  return (
                    <div key={levelDef.level}>
                      <div
                        onClick={() => {
                          const key = `${student.id}_${levelDef.level}`;
                          if (certImg) {
                            // 已有证书，切换显示/隐藏
                            setExpandedLevel(expandedLevel === key ? null : key);
                          } else {
                            // 无证书，打开上传对话框
                            setUploadStudentId(student.id);
                            setUploadLevel(levelDef.level);
                            setShowUploadDialog(true);
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                          passed
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {/* 级别编号圆圈 */}
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          passed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {passed ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : levelDef.level}
                        </div>
                        {/* 级别信息 */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${passed ? 'text-green-800' : 'text-gray-700'}`}>
                            {levelDef.name}
                          </div>
                          <div className={`text-[10px] ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                            {levelDef.desc}
                          </div>
                        </div>
                        {/* 上传提示 */}
                        <div className={`text-[10px] shrink-0 flex items-center gap-1 ${passed ? 'text-green-500' : 'text-gray-300'}`}>
                          {certImg ? (
                            <>
                              <span>{expandedLevel === `${student.id}_${levelDef.level}` ? '收起' : '查看证书'}</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedLevel === `${student.id}_${levelDef.level}` ? 'rotate-180' : ''}`} />
                            </>
                          ) : (
                            <span>{passed ? '已上传' : '点击上传'}</span>
                          )}
                        </div>
                      </div>
                      {/* 证书大图展示 - 点击后展开 */}
                      {certImg && expandedLevel === `${student.id}_${levelDef.level}` && (
                        <div className="mt-2 ml-10 mr-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <img src={certImg} alt={`${levelDef.name}证书`} className="w-full max-h-80 object-contain" />
                          <div className="p-2 border-t border-gray-200 bg-white flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadStudentId(student.id);
                                setUploadLevel(levelDef.level);
                                setCertificateImg(certImg);
                                setShowUploadDialog(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            >
                              <Upload className="h-3 w-3" />
                              更换证书
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 赛事列表 */
              <div className="p-3 space-y-3">
                {competitions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    暂无赛事记录，点击右上角"添加赛事"开始记录
                  </div>
                ) : (
                  competitions.map((competition) => {
                    const certImg = competition.certificateUrl || null;
                    const expandedKey = `${student.id}_${competition.id}`;
                    const isExpanded = expandedCompetition === expandedKey;

                    return (
                      <div key={competition.id}>
                        <div
                          onClick={() => {
                            if (certImg) {
                              setExpandedCompetition(isExpanded ? null : expandedKey);
                            } else {
                              handleCompetitionUpload(student.id, competition.id);
                            }
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                            certImg
                              ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300'
                              : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                          }`}
                        >
                          {/* 赛事图标 */}
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                            certImg
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {certImg ? <Award className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                          </div>
                          {/* 赛事信息 */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium ${certImg ? 'text-purple-800' : 'text-gray-700'}`}>
                              {competition.title}
                            </div>
                            {competition.achievedDate && (
                              <div className={`text-[10px] ${certImg ? 'text-purple-600' : 'text-gray-400'}`}>
                                {competition.achievedDate}
                              </div>
                            )}
                          </div>
                          {/* 上传提示 */}
                          <div className={`text-[10px] shrink-0 flex items-center gap-1 ${certImg ? 'text-purple-500' : 'text-gray-300'}`}>
                            {certImg ? (
                              <>
                                <span>{isExpanded ? '收起' : '查看证书'}</span>
                                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </>
                            ) : (
                              <span>点击上传</span>
                            )}
                          </div>
                        </div>
                        {/* 证书大图展示 */}
                        {certImg && isExpanded && (
                          <div className="mt-2 ml-10 mr-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <img src={certImg} alt={`${competition.title}证书`} className="w-full max-h-80 object-contain" />
                            <div className="p-2 border-t border-gray-200 bg-white flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompetitionUpload(student.id, competition.id);
                                }}
                                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                              >
                                <Upload className="h-3 w-3" />
                                更换证书
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 上传证书对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {honorType === 'exam' 
                ? `上传证书 - ${levels.find(l => l.level === uploadLevel)?.name || ''}`
                : '上传赛事证书'}
            </DialogTitle>
            <DialogDescription>
              为学员 {students.find(s => s.id === uploadStudentId)?.name || ''} 上传证书照片
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">证书图片</Label>
              <div className="mt-2">
                {certificateImg ? (
                  <div className="relative">
                    <img src={certificateImg} alt="证书预览" className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                    <button
                      onClick={() => setCertificateImg('')}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">点击上传证书图片</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setCertificateImg(''); }}>取消</Button>
            <Button onClick={honorType === 'exam' ? handleConfirmUpload : handleConfirmCompetitionUpload} disabled={!certificateImg}>确认上传</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加赛事对话框 */}
      <Dialog open={showAddCompetitionDialog} onOpenChange={setShowAddCompetitionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加赛事记录</DialogTitle>
            <DialogDescription>
              为学员 {students.find(s => s.id === addCompetitionStudentId)?.name || ''} 添加赛事
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">赛事名称 *</Label>
              <Input 
                type="text" 
                value={competitionName} 
                onChange={e => setCompetitionName(e.target.value)} 
                placeholder="如：CSP-J 2024"
                className="mt-1 h-9 text-sm" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">获奖内容</Label>
              <Input 
                type="text" 
                value={competitionAward} 
                onChange={e => setCompetitionAward(e.target.value)} 
                placeholder="如：一等奖、二等奖等"
                className="mt-1 h-9 text-sm" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">获奖日期</Label>
              <Input type="date" value={competitionDate} onChange={e => setCompetitionDate(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">证书图片（可选）</Label>
              <div className="mt-2">
                {certificateImg ? (
                  <div className="relative">
                    <img src={certificateImg} alt="证书预览" className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                    <button
                      onClick={() => setCertificateImg('')}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">点击上传证书图片</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddCompetitionDialog(false); setCompetitionName(''); setCompetitionAward(''); setCertificateImg(''); }}>取消</Button>
            <Button onClick={handleAddCompetition} disabled={!competitionName.trim()}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 图片记录标签页组件
function PhotosTab() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 稳定引用 + 同步读取 localStorage，避免 useEffect 无限循环
  const students = useMemo(() => getStudents(), [refreshKey]);
  const studentPhotos = useMemo(() => {
    const photos: Record<string, string[]> = {};
    students.forEach((s: Student) => {
      photos[s.id] = getStudentPhotos(s.id);
    });
    return photos;
  }, [students]);

  const selectedStudent = students.find((s: Student) => s.id === selectedStudentId);
  const selectedPhotos = selectedStudentId ? (studentPhotos[selectedStudentId] || []) : [];

  // 压缩图片
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理图片上传
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const compressedPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i]);
        compressedPhotos.push(compressed);
      } catch (err) {
        console.error('图片压缩失败:', err);
      }
    }
    setNewPhotos(prev => [...prev, ...compressedPhotos]);
    e.target.value = '';
  };

  // 确认保存照片
  const handleConfirmSave = () => {
    if (!selectedStudentId || newPhotos.length === 0) return;
    const currentPhotos = studentPhotos[selectedStudentId] || [];
    const updatedPhotos = [...newPhotos, ...currentPhotos].slice(0, 50);
    saveStudentPhotos(selectedStudentId, updatedPhotos);
    setNewPhotos([]);
    setShowUploadDialog(false);
    setRefreshKey(k => k + 1);
  };

  // 删除照片
  const handleDeletePhoto = (studentId: string, index: number) => {
    const currentPhotos = studentPhotos[studentId] || [];
    const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
    saveStudentPhotos(studentId, updatedPhotos);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="选择学员" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s: Student) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStudentId && (
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-1" />
              上传照片
            </Button>
          )}
        </div>
        {selectedStudentId && (
          <span className="text-xs text-gray-500">共 {selectedPhotos.length} 张照片</span>
        )}
      </div>

      {!selectedStudentId ? (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">请先选择学员查看图片记录</p>
        </div>
      ) : selectedPhotos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无图片记录</p>
          <Button size="sm" className="mt-3" onClick={() => setShowUploadDialog(true)}>
            上传第一张照片
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {selectedPhotos.map((photo, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={photo} alt={`照片 ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDeletePhoto(selectedStudentId, idx)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传照片对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>上传照片</DialogTitle>
            <DialogDescription>
              为学员 {selectedStudent?.name || ''} 上传照片，最新9张将自动同步到成长档案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 新上传的照片预览 */}
            {newPhotos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">新上传的照片 ({newPhotos.length})</Label>
                <div className="grid grid-cols-4 gap-2">
                  {newPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={photo} alt={`新照片 ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 上传区域 */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500">点击选择照片（可多选）</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setNewPhotos([]); }}>取消</Button>
            <Button onClick={handleConfirmSave} disabled={newPhotos.length === 0}>保存照片</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCourseId, setNewCourseId] = useState('course_cpp');
  const [newClassName, setNewClassName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  const [activeTab, setActiveTab] = useState<RecordTab>('retry');
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Per-student forms
  const [typingForms, setTypingForms] = useState<Record<string, TypingForm>>({});
  const [retryForms, setRetryForms] = useState<Record<string, RetryRowForm[]>>({});
  const [homeworkForms, setHomeworkForms] = useState<Record<string, HomeworkForm>>({});

  // Class filter
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showTags, setShowTags] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');

  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<{ typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] }>({ typing: [], retry: [], homework: [] });
  const [tagFilter, setTagFilter] = useState<'all' | 'highlight' | 'weakness'>('all');

  // Batch retry upload
  const [showBatchRetry, setShowBatchRetry] = useState(false);
  const [batchRetryStudentId, setBatchRetryStudentId] = useState('');
  const [batchRetryText, setBatchRetryText] = useState('');
  const [batchRetryResult, setBatchRetryResult] = useState<{ success: number; failed: number } | null>(null);

  // Class management
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddExistingStudent, setShowAddExistingStudent] = useState(false);
  const [addExistingSelectedIds, setAddExistingSelectedIds] = useState<string[]>([]);
  const [createClass, setCreateClass] = useState('');
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Move student to another class
  const [moveStudentOpen, setMoveStudentOpen] = useState(false);
  const [moveStudentId, setMoveStudentId] = useState('');
  const [moveStudentClass, setMoveStudentClass] = useState('');
  const [classRetryProblemId, setClassRetryProblemId] = useState('');
  const [classProblemSearch, setClassProblemSearch] = useState('');

  const loadData = useCallback(() => {
    const courseList = getCourses();
    setCourses(courseList);
    if (courseList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courseList[0].id);
    }
  }, [selectedCourseId]);

  const loadStudents = useCallback(() => {
    if (!selectedCourseId) return;
    const students = getStudentsByCourse(selectedCourseId);
    setCourseStudents(students);
    const course = getCourses().find((c) => c.id === selectedCourseId);
    const hints: Record<string, { lastSpeed?: number; lastAccuracy?: number }> = {};
    const month = format(new Date(), 'yyyy-MM');
    const curRange = getMonthRange(month);
    const prevRange = getPreviousMonthRange(month);

    students.forEach((s) => {
      const typing = getTypingByStudent(s.id);
      const retry = getRetryByStudent(s.id);
      const homework = getHomeworkByStudent(s.id);
      const knowledge = getKnowledgeByStudent(s.id);
      const lastTyping = typing.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastTyping) hints[s.id] = { lastSpeed: lastTyping.speed, lastAccuracy: lastTyping.accuracy };
      const curTypingRecs = getRecordsInPeriod(typing, curRange.start, curRange.end);
      const prevTypingRecs = getRecordsInPeriod(typing, prevRange.start, prevRange.end);
      const curRetryRecs = getRecordsInPeriod(retry, curRange.start, curRange.end);
      const prevRetryRecs = getRecordsInPeriod(retry, prevRange.start, prevRange.end);
      const curHomeworkRecs = getRecordsInPeriod(homework, curRange.start, curRange.end);
      const tags = generateAutoTags(
        calcTypingSummary(curTypingRecs), calcTypingSummary(prevTypingRecs),
        calcRetrySummary(curRetryRecs, course || undefined),
        calcRetrySummary(prevRetryRecs, course || undefined),
        calcHomeworkSummary(curHomeworkRecs),
        calcKnowledgeMastery(knowledge, retry, course || undefined),
      );
      (s as Student & { _autoTags?: AutoTag[] })._autoTags = tags;
    });
    setLastRecordHints(hints);
  }, [selectedCourseId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStudents(); }, [loadStudents, selectedCourseId]);

  const [lastRecordHints, setLastRecordHints] = useState<Record<string, { lastSpeed?: number; lastAccuracy?: number }>>({});

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

  // Get unique classes from students
  const courseClasses = getCourseClasses(selectedCourseId);
  const classList = [...courseClasses].sort();
  const filteredByClass = selectedClass === 'all' ? courseStudents : courseStudents.filter(s => (s.className || '') === selectedClass);

  const filteredStudents = filteredByClass.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (tagFilter === 'all') return true;
    const tags = (s as Student & { _autoTags?: AutoTag[] })._autoTags || [];
    if (tagFilter === 'highlight') return tags.some((t) => t.type === 'highlight');
    if (tagFilter === 'weakness') return tags.some((t) => t.type === 'weakness');
    return true;
  });

  const selectedStudents = courseStudents.filter((s) => selectedStudentIds.includes(s.id));

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]);
    setSelectedClass('all');
    setTypingForms({});
    setRetryForms({});
    setHomeworkForms({});
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
      if (!next.includes(id)) {
        setTypingForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
        setRetryForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
        setHomeworkForms((f) => { const nf = { ...f }; delete nf[id]; return nf; });
      }
      return next;
    });
  };

  const selectAllInClass = () => {
    const classIds = filteredStudents.map(s => s.id);
    const allSelected = classIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !classIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...classIds])]);
    }
  };

  // Form helpers
  const getTypingForm = (id: string): TypingForm => typingForms[id] || { speed: '', praiseTags: [], improveTags: [] };
  const getRetryForm = (id: string): RetryRowForm[] => retryForms[id] || [{ problemId: '', problemName: '', timeSpent: '', isQualified: true, unqualifiedReason: '', praiseTags: [], improveTags: [] }];
  const getHomeworkForm = (id: string): HomeworkForm => homeworkForms[id] || { content: '', completion: '', comment: '', praiseTags: [], improveTags: [] };

  const updateTypingForm = (id: string, field: keyof TypingForm, value: string | string[]) => {
    setTypingForms((prev) => ({ ...prev, [id]: { ...getTypingForm(id), [field]: value } }));
  };
  const updateHomeworkForm = (id: string, field: keyof HomeworkForm, value: string | string[]) => {
    setHomeworkForms((prev) => ({ ...prev, [id]: { ...getHomeworkForm(id), [field]: value } }));
  };

  const updateRetryRow = (studentId: string, rowIndex: number, field: keyof RetryRowForm, value: string | boolean | string[]) => {
    setRetryForms(prev => {
      const rows = [...(prev[studentId] || [{ problemId: '', problemName: '', timeSpent: '', isQualified: true, unqualifiedReason: '', praiseTags: [], improveTags: [] }])];
      rows[rowIndex] = { ...rows[rowIndex], [field]: value };
      return { ...prev, [studentId]: rows };
    });
  };

  const addRetryRow = (studentId: string) => {
    setRetryForms(prev => {
      const rows = [...(prev[studentId] || []), { id: Date.now().toString(), problemId: '', problemName: '', timeSpent: '', isQualified: true, unqualifiedReason: '', praiseTags: [], improveTags: [] }];
      return { ...prev, [studentId]: rows };
    });
  };

  const removeRetryRow = (studentId: string, rowIndex: number) => {
    setRetryForms(prev => {
      const rows = (prev[studentId] || []).filter((_, i) => i !== rowIndex);
      if (rows.length === 0) rows.push({ id: Date.now().toString(), problemId: '', problemName: '', timeSpent: '', isQualified: true, unqualifiedReason: '', praiseTags: [], improveTags: [] });
      return { ...prev, [studentId]: rows };
    });
  };

  // Add student
  const handleAddStudent = () => {
    if (!newName.trim() || !newCourseId) return;
    const classToUse = newClassName.trim() || (selectedClass !== 'all' ? selectedClass : undefined);
    // Add class to course if it doesn't exist
    if (classToUse) {
      addClassToCourse(newCourseId, classToUse);
    }
    addStudent({
      id: uuidv4(), name: newName.trim(), courseId: newCourseId,
      className: classToUse || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewName(''); setNewCourseId(selectedCourseId); setNewClassName(''); setNewNotes('');
    setAddStudentOpen(false); loadStudents();
  };

  const handleChangeStudentClass = (studentId: string, newClass: string) => {
    const allStudents = getStudentsByCourse(selectedCourseId);
    const student = allStudents.find((s: Student) => s.id === studentId);
    if (!student) return;
    const updated = { ...student, className: newClass || undefined };
    updateStudent(updated);
    loadStudents();
  };

  // Class-level problem selection: add problem to all selected students
  const handleClassProblemSelect = (problemId: string) => {
    setClassRetryProblemId(problemId);
    selectedStudents.forEach((student: Student) => {
      const rows = getRetryForm(student.id);
      // Check if this problem already exists in the student's retry rows
      const existingRow = rows.find(r => r.problemId === problemId);
      if (!existingRow) {
        // Add the problem to this student's retry rows
        addRetryRow(student.id);
        // The new row is added at the end, set its problemId
        const newRows = getRetryForm(student.id);
        if (newRows.length > 0) {
          updateRetryRow(student.id, newRows.length - 1, 'problemId', problemId);
        }
      }
    });
  };

  // Batch import - auto-assign course based on class name
  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const name = (parts[0] || '').trim();
      if (!name) continue;
      const courseName = (parts[1] || '').toLowerCase();
      // Map course name to course ID
      let courseId = selectedCourseId;
      if (courseName === 'c++' || courseName === 'c++信奥') {
        courseId = 'course_cpp';
      } else if (courseName === 'python') {
        courseId = 'course_python';
      } else if (courseName === '图形化') {
        courseId = 'course_visual';
      }
      addStudent({
        id: uuidv4(), name, courseId,
        createdAt: new Date().toISOString(),
      });
    }
    setImportText(''); setImportOpen(false); loadStudents();
  };

  const handleDelete = (id: string) => {
    deleteStudent(id);
    setSelectedStudentIds((prev) => prev.filter((sid) => sid !== id));
    loadStudents();
  };

  // Save student records
  const handleSaveStudent = (studentId: string) => {
    if (activeTab === 'typing') {
      const form = getTypingForm(studentId);
      if (!form.speed) return;
      addTypingRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        speed: Number(form.speed), accuracy: 0,
        praiseTags: form.praiseTags.length > 0 ? form.praiseTags : undefined,
        improveTags: form.improveTags.length > 0 ? form.improveTags : undefined,
      });
    } else if (activeTab === 'retry') {
      const rows = getRetryForm(studentId);
      for (const row of rows) {
        if (!row.problemId) continue;
        const problem = activeCourse?.problems.find((p) => p.id === row.problemId);
        // 保存本次三刷记录
        if (row.timeSpent && Number(row.timeSpent) > 0) {
          addRetryRecord({
            id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
            problemId: row.problemId, problemName: row.problemName || problem?.name || '',
            attempt: 1, timeSpent: Number(row.timeSpent),
            isQualified: row.isQualified,
            unqualifiedReason: row.unqualifiedReason,
            praiseTags: row.praiseTags && row.praiseTags.length > 0 ? row.praiseTags : undefined,
            improveTags: row.improveTags && row.improveTags.length > 0 ? row.improveTags : undefined,
          });
        }
      }
    } else if (activeTab === 'homework') {
      const form = getHomeworkForm(studentId);
      if (!form.content.trim()) return;
      // Auto-generate tags based on score if no tags are provided
      let praiseTags = form.praiseTags && form.praiseTags.length > 0 ? form.praiseTags : undefined;
      let improveTags = form.improveTags && form.improveTags.length > 0 ? form.improveTags : undefined;
      if (!praiseTags && !improveTags && form.completion) {
        const score = Number(form.completion);
        if (score >= 90) {
          praiseTags = ['作业完成优秀'];
        } else if (score >= 80) {
          praiseTags = ['作业完成良好'];
        } else if (score < 60) {
          improveTags = ['作业需要加强'];
        }
      }
      addHomeworkRecord({
        id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
        title: '课后作业',
        content: form.content.trim(),
        score: form.completion ? Number(form.completion) : undefined,
        comment: form.comment.trim() || undefined,
        praiseTags,
        improveTags,
      });
    }
    // 保存后清空表单数据，防止重复提交
    if (activeTab === 'typing') {
      setTypingForms((prev) => ({ ...prev, [studentId]: { speed: '', praiseTags: [], improveTags: [] } }));
    } else if (activeTab === 'retry') {
      setRetryForms((prev) => ({ ...prev, [studentId]: [{ id: Date.now().toString(), problemId: '', problemName: '', timeSpent: '', isQualified: true, unqualifiedReason: '', praiseTags: [], improveTags: [] }] }));
    } else if (activeTab === 'homework') {
      setHomeworkForms((prev) => ({ ...prev, [studentId]: { content: '', completion: '', comment: '', praiseTags: [], improveTags: [] } }));
    }
    setSavedStudents((prev) => new Set(prev).add(studentId));
    setTimeout(() => {
      setSavedStudents((prev) => { const next = new Set(prev); next.delete(studentId); return next; });
    }, 2000);
  };

  const handleSaveAll = () => {
    for (const studentId of selectedStudentIds) {
      handleSaveStudent(studentId);
    }
  };

  // Batch retry upload - auto-add missing problems
  const handleBatchRetryUpload = (studentId: string) => {
    if (!batchRetryText.trim() || !activeCourse) return;
    const lines = batchRetryText.trim().split('\n').filter(l => l.trim());
    let success = 0;
    let failed = 0;
    const course = { ...activeCourse };

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) { failed++; continue; }

      let i = parts.length - 1;
      const tempNums: string[] = [];
      while (i >= 1 && /^\d+(\.\d+)?$/.test(parts[i])) {
        tempNums.unshift(parts[i]);
        i--;
      }

      const problemName = parts.slice(0, i + 1).join(' ');
      const times = tempNums.map(Number);
      if (!problemName || times.length === 0) { failed++; continue; }

      // Find or auto-create problem
      let matchedProblem = course.problems.find(
        p => p.name === problemName || p.id === problemName || problemName.includes(p.name) || p.name.includes(problemName)
      );

      if (!matchedProblem) {
        // Auto-add the problem to the course
        const newProblem = {
          id: `prob_auto_${uuidv4().slice(0, 8)}`,
          name: problemName,
        };
        course.problems = [...course.problems, newProblem];
        matchedProblem = newProblem;
        // Persist to course storage
        const allCourses = getCourses();
        const idx = allCourses.findIndex(c => c.id === selectedCourseId);
        if (idx >= 0) {
          allCourses[idx].problems = course.problems;
          // Save back via localStorage
          localStorage.setItem('coding_courses', JSON.stringify(allCourses));
        }
      }

      times.forEach((time, idx) => {
        if (time > 0) {
          addRetryRecord({
            id: uuidv4(), studentId, courseId: selectedCourseId, date: recordDate,
            problemId: matchedProblem!.id, problemName: matchedProblem!.name,
            attempt: idx + 1, timeSpent: time,
          });
          success++;
        }
      });
    }

    // Reload data to reflect new problems
    setCourses([course]);
    setBatchRetryResult({ success, failed });
    setBatchRetryText('');
    setTimeout(() => setBatchRetryResult(null), 3000);
  };

  const loadHistory = (studentId: string) => {
    if (historyStudentId === studentId) { setHistoryStudentId(null); return; }
    setHistoryStudentId(studentId);
    setHistoryRecords({
      typing: getTypingByStudent(studentId).slice(-5).reverse(),
      retry: getRetryByStudent(studentId).slice(-5).reverse(),
      homework: getHomeworkByStudent(studentId).slice(-5).reverse(),
    });
  };

  // ============ RENDER ============
  return (
    <div className="h-screen flex flex-col bg-[#F7F8FA]">
      {/* Header */}
      <header className="h-14 shrink-0 bg-white border-b border-[#EDF2F7] flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6B8BA4] flex items-center justify-center">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-base font-semibold text-[#2D3748] tracking-wide">{XIAN.app}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-[#4A5568] hover:text-[#6B8BA4] hover:bg-[#F0F4F8] gap-1.5 h-8 px-3 rounded-lg text-sm" onClick={() => { setImportOpen(true); }}>
            <Upload className="h-4 w-4" />{XIAN.importCSV}
          </Button>
          <Button variant="ghost" size="sm" className="text-[#4A5568] hover:text-[#6B8BA4] hover:bg-[#F0F4F8] gap-1.5 h-8 px-3 rounded-lg text-sm" onClick={() => {
            if (selectedClass !== 'all') setNewClassName(selectedClass);
            setAddStudentOpen(true);
          }}>
            <Plus className="h-4 w-4" />{XIAN.addStudent}
          </Button>
          <Link href="/courses">
            <Button variant="ghost" size="sm" className="text-[#4A5568] hover:text-[#6B8BA4] hover:bg-[#F0F4F8] gap-1.5 h-8 px-3 rounded-lg text-sm">
              <Settings className="h-4 w-4" />{XIAN.courses}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main: Left-Right Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Student Selection */}
        <div className="w-72 shrink-0 bg-white border-r border-[#EDF2F7] flex flex-col">
          {/* Course tabs */}
          <div className="p-3 border-b border-[#F1F5F9]">
            <div className="flex gap-1">
              {courses.map(c => {
                const colors = COURSE_COLORS[c.id] || COURSE_COLORS.course_cpp;
                return (
                  <button key={c.id} onClick={() => handleCourseChange(c.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedCourseId === c.id
                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                        : 'text-[#A0AEC0] hover:bg-[#F7F8FA] hover:text-[#4A5568]'
                    }`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class filter as dropdown */}
          <div className="px-3 py-2.5 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-[#A0AEC0] shrink-0 font-medium">班级</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-7 text-xs flex-1 min-w-[120px]">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {classList.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span>{cls}</span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingClass(cls); setEditingClassName(cls); }}
                            className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-500" title="重命名">
                            <Edit className="h-3 w-3" />
                          </button>
                          <button onClick={() => { if (confirm(`确定删除班级「${cls}」？班级内学员也将被删除`)) { removeClassFromCourse(selectedCourseId, cls); loadData(); if (selectedClass === cls) setSelectedClass('all'); } }}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500" title="删除">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={() => setShowCreateClass(true)}
                className="px-2 py-1 rounded text-xs text-blue-500 hover:bg-blue-50 transition-all flex items-center gap-1 shrink-0">
                <Plus className="h-3 w-3" /> 班级
              </button>
              <button onClick={() => setShowAddStudent(true)}
                className="px-2 py-1 rounded text-xs text-green-500 hover:bg-green-50 transition-all flex items-center gap-1 shrink-0">
                <UserPlus className="h-3 w-3" /> 学员
              </button>
              {selectedClass !== 'all' && (
                <button onClick={() => setShowAddExistingStudent(true)}
                  className="px-2 py-1 rounded text-xs text-purple-500 hover:bg-purple-50 transition-all flex items-center gap-1 shrink-0">
                  <UserPlus className="h-3 w-3" /> 添加已有学员
                </button>
              )}
            </div>
          </div>

          {/* Search + select all */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="搜索学员..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-7 text-xs rounded-lg border-gray-200" />
            </div>
            <button onClick={selectAllInClass} className="text-xs text-blue-500 hover:text-blue-600 shrink-0">
              {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? '取消全选' : '全选'}
            </button>
          </div>

          {/* Add existing student button - shown when a class is selected */}
          {selectedClass !== 'all' && (
            <div className="px-3 py-2 border-b border-gray-100">
              <button onClick={() => setShowAddExistingStudent(true)}
                className="w-full px-3 py-1.5 rounded-lg text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all flex items-center justify-center gap-1.5 border border-purple-200">
                <UserPlus className="h-3.5 w-3.5" /> 添加已有学员到「{selectedClass}」
              </button>
            </div>
          )}

          {/* Student list */}
          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">暂无学员</div>
            ) : (
              <div className="py-1">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div key={student.id}
                      className={`px-3 py-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => toggleStudent(student.id)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{student.name}</div>
                        {student.className && (
                          <div className="text-xs text-gray-400 truncate">{student.className}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-blue-100 rounded opacity-80 hover:opacity-100 transition-all"
                          title="更换班级"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveStudentId(student.id);
                            setMoveStudentClass(student.className || '');
                            setMoveStudentOpen(true);
                          }}>
                          <Users className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                        </button>
                        <Link href={`/reports/${student.id}`} className="p-1.5 hover:bg-blue-100 rounded opacity-80 hover:opacity-100 transition-all"
                          title="查看成长报告" onClick={(e) => e.stopPropagation()}>
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Link>
                        <button className="p-1.5 hover:bg-red-100 rounded opacity-80 hover:opacity-100 transition-all"
                          onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}>
                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Recording Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar + controls */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveTab('retry')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'retry' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.retry}
                </button>
                <button onClick={() => setActiveTab('typing')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'typing' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.typing}
                </button>
                <button onClick={() => setActiveTab('homework')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'homework' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {XIAN.homework}
                </button>
                <button onClick={() => setActiveTab('exam')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'exam' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  考级记录
                </button>
                <button onClick={() => setActiveTab('competition')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'competition' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  赛事记录
                </button>
                <button onClick={() => setActiveTab('honor')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'honor' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  荣誉
                </button>
                <button onClick={() => setActiveTab('photos')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'photos' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                  图片记录
                </button>
                <Separator orientation="vertical" className="h-5 mx-2 bg-gray-200" />
                <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
                  className="w-36 h-7 text-xs border-gray-200" />
                {selectedStudentIds.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-5 mx-2 bg-gray-200" />
                    <Button size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSaveAll}>
                      <Save className="h-3.5 w-3.5 mr-1" />全部{XIAN.save}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTags(!showTags)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${showTags ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {showTags ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showTags ? '隐藏评价' : '显示评价'}
                </button>
              </div>
            </div>
          </div>

          {/* Class-level problem selector for retry tab */}
          {activeTab === 'retry' && selectedClass !== 'all' && selectedStudents.length > 1 && (
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">班级统一选题</span>
                  <span className="text-xs text-gray-500">{selectedStudents.length}名学员共用此题</span>
                </div>
                <div className="flex-1">
                  {activeCourse && activeCourse.problems.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 text-sm w-full max-w-xs justify-between bg-white">
                          {classRetryProblemId ? (
                            <span className="truncate text-gray-700">
                              {activeCourse.problems.find(p => p.id === classRetryProblemId)?.name || '选择题目'}
                            </span>
                          ) : (
                            <span className="text-gray-400">选择统一题目</span>
                          )}
                          <ChevronDown className="h-3 w-3 text-gray-400 ml-1 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-white border-gray-200" align="start">
                        <div className="p-2 border-b border-gray-100">
                          <Input placeholder="搜索题号或题目名..." className="h-7 text-xs"
                            value={classProblemSearch} onChange={(e) => setClassProblemSearch(e.target.value)} />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {activeCourse.problems
                            .filter(p => {
                              if (!classProblemSearch) return true;
                              const s = classProblemSearch.toLowerCase();
                              return p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
                            })
                            .map((p) => (
                              <div key={p.id}
                                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                                  classRetryProblemId === p.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  handleClassProblemSelect(p.id);
                                  setClassProblemSearch('');
                                }}>
                                {p.name}
                              </div>
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-xs text-gray-400">请先在课程管理中添加题目</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStudentIds.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">请在左侧选择学员开始记录</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {selectedStudents.map((student) => (
                  <StudentRecordCard
                    key={student.id}
                    student={student}
                    activeTab={activeTab}
                    activeCourse={activeCourse}
                    recordDate={recordDate}
                    showTags={showTags}
                    isSaved={savedStudents.has(student.id)}
                    isHistoryOpen={historyStudentId === student.id}
                    historyRecords={historyRecords}
                    typingForm={getTypingForm(student.id)}
                    retryRows={getRetryForm(student.id)}
                    homeworkForm={getHomeworkForm(student.id)}
                    problemSearch={problemSearch}
                    onProblemSearchChange={setProblemSearch}
                    onUpdateTyping={(field, value) => updateTypingForm(student.id, field, value)}
                    onUpdateRetryRow={(rowIndex, field, value) => updateRetryRow(student.id, rowIndex, field, value)}
                    onAddRetryRow={() => addRetryRow(student.id)}
                    onRemoveRetryRow={(rowIndex) => removeRetryRow(student.id, rowIndex)}
                    onUpdateHomework={(field, value) => updateHomeworkForm(student.id, field, value)}
                    onSave={() => handleSaveStudent(student.id)}
                    onLoadHistory={() => loadHistory(student.id)}
                    onBatchRetry={() => { setBatchRetryStudentId(student.id); setShowBatchRetry(true); }}
                  />
                ))}
              </div>
            )}

            {/* 考级/赛事/荣誉 Tabs - 在学员卡片后面显示 */}
            {selectedStudentIds.length > 0 && (
              <div className="mt-4">
                {activeTab === 'exam' && <ExamTab selectedStudentIds={new Set(selectedStudentIds)} students={courseStudents} selectedCourseId={selectedCourseId} />}
                {activeTab === 'competition' && <CompetitionTab selectedStudentIds={new Set(selectedStudentIds)} students={courseStudents} selectedCourseId={selectedCourseId} />}
                {activeTab === 'honor' && <HonorTab selectedStudentIds={new Set(selectedStudentIds)} students={courseStudents} selectedCourseId={selectedCourseId} />}
                {activeTab === 'photos' && <PhotosTab />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-800">{XIAN.addStudent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">姓名</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="学员姓名" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">课程</Label>
              <Select value={newCourseId} onValueChange={setNewCourseId}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">班级</Label>
              <div className="flex gap-2 mt-1">
                <Select value={newClassName} onValueChange={setNewClassName}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="选择班级" /></SelectTrigger>
                  <SelectContent>
                    {[...getCourseClasses(newCourseId)].sort().map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => {
                  const name = prompt('请输入新班级名称');
                  if (name && name.trim()) {
                    addClassToCourse(newCourseId, name.trim());
                    setNewClassName(name.trim());
                  }
                }}>
                  <Plus className="h-3 w-3 mr-1" />新增
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">备注</Label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="备注信息（可选）" className="mt-1 h-8 text-sm" />
            </div>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleAddStudent} disabled={!newName.trim()}>
              确认添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Existing Student to Class Dialog */}
      <Dialog open={showAddExistingStudent} onOpenChange={(open) => {
        setShowAddExistingStudent(open);
        if (!open) setAddExistingSelectedIds([]);
      }}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-800">添加已有学员到「{selectedClass}」</DialogTitle>
            <DialogDescription className="text-gray-500">
              勾选学员后点击底部按钮批量添加
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {courseStudents.filter((s: Student) => !s.className).map((student: Student) => (
              <label key={student.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addExistingSelectedIds.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAddExistingSelectedIds([...addExistingSelectedIds, student.id]);
                    } else {
                      setAddExistingSelectedIds(addExistingSelectedIds.filter(id => id !== student.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800">{student.name}</div>
                  {student.notes && <div className="text-xs text-gray-400">{student.notes}</div>}
                </div>
              </label>
            ))}
            {courseStudents.filter((s: Student) => !s.className).length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">没有未分配班级的学员</div>
            )}
          </div>
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={addExistingSelectedIds.length === 0}
            onClick={() => {
              addExistingSelectedIds.forEach(id => {
                const student = courseStudents.find(s => s.id === id);
                if (student) {
                  updateStudent({ ...student, className: selectedClass });
                }
              });
              setAddExistingSelectedIds([]);
              loadData();
              setShowAddExistingStudent(false);
            }}
          >
            添加已选学员 ({selectedStudentIds.length})
          </Button>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-800">{XIAN.importCSV}</DialogTitle>
            <DialogDescription className="text-gray-500">
              每行一名学员，格式：姓名 课程<br/>
              课程填写：c++、python、图形化（三选一）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              placeholder={'张三 c++\n李四 python\n王五 图形化'} className="min-h-[140px] text-sm" />
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleImport} disabled={!importText.trim()}>
              确认导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog open={showCreateClass} onOpenChange={(open) => {
        setShowCreateClass(open);
        if (!open) setCreateClass('');
      }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>创建新班级</DialogTitle>
            <DialogDescription>在「{courses.find(c => c.id === selectedCourseId)?.name}」课程下创建班级</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium text-gray-700">班级名称</Label>
            <Input value={createClass} onChange={(e) => setCreateClass(e.target.value)}
              placeholder="例如：周六班、提高班" className="mt-1.5" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateClass(false); setCreateClass(''); }}>取消</Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              if (createClass.trim()) {
                addClassToCourse(selectedCourseId, createClass.trim());
                setShowCreateClass(false);
                setCreateClass('');
                loadData();
              }
            }} disabled={!createClass.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Class Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => {
        if (!open) { setEditingClass(null); setEditingClassName(''); }
      }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>重命名班级</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium text-gray-700">新名称</Label>
            <Input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)}
              placeholder="输入新的班级名称" className="mt-1.5" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingClass(null); setEditingClassName(''); }}>取消</Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              if (editingClass && editingClassName.trim()) {
                renameClassInCourse(selectedCourseId, editingClass, editingClassName.trim());
                setEditingClass(null);
                setEditingClassName('');
                if (selectedClass === editingClass) setSelectedClass(editingClassName.trim());
                loadData();
              }
            }} disabled={!editingClassName.trim()}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Student to Class Dialog */}
      <Dialog open={moveStudentOpen} onOpenChange={(open) => {
        setMoveStudentOpen(open);
        if (!open) { setMoveStudentId(''); setMoveStudentClass(''); }
      }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>更换班级</DialogTitle>
            <DialogDescription>将学员移动到另一个班级</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium text-gray-700">选择班级</Label>
            <select value={moveStudentClass} onChange={(e) => setMoveStudentClass(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">未分班</option>
              {classList.filter(c => c !== 'all').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveStudentOpen(false); setMoveStudentId(''); setMoveStudentClass(''); }}>取消</Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              if (moveStudentId) {
                handleChangeStudentClass(moveStudentId, moveStudentClass);
                setMoveStudentOpen(false);
                setMoveStudentId('');
                setMoveStudentClass('');
              }
            }}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Retry Upload Dialog */}
      <Dialog open={showBatchRetry} onOpenChange={(open) => {
        setShowBatchRetry(open);
        if (!open) { setBatchRetryText(''); setBatchRetryResult(null); }
      }}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-800 flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              批量{XIAN.retry}上传
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              为「{courseStudents.find(s => s.id === batchRetryStudentId)?.name}」批量录入三刷记录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium mb-1">格式说明：</p>
              <p className="text-xs text-gray-500">每行一条，空格分隔：题目名称 一刷耗时 二刷耗时 三刷耗时</p>
              <p className="text-xs text-gray-400 mt-1">耗时单位为分钟。不存在的题目会自动添加到题库</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">示例：</p>
                <p className="text-xs text-gray-500 font-mono mt-1">津津的储蓄计划 30 20 15</p>
                <p className="text-xs text-gray-500 font-mono">买铅笔 10 8</p>
              </div>
            </div>
            <Textarea value={batchRetryText} onChange={(e) => setBatchRetryText(e.target.value)}
              placeholder={'津津的储蓄计划 30 20 15\n买铅笔 10 8'} className="min-h-[140px] font-mono text-sm" />
            {batchRetryResult && (
              <div className={`text-sm rounded-lg px-3 py-2 ${batchRetryResult.success > 0 ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                成功录入 {batchRetryResult.success} 条{batchRetryResult.failed > 0 ? `，${batchRetryResult.failed} 条失败` : ''}
              </div>
            )}
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleBatchRetryUpload(batchRetryStudentId)} disabled={!batchRetryText.trim()}>
              确认上传
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Student Record Card Component ============
interface StudentRecordCardProps {
  student: Student;
  activeTab: RecordTab;
  activeCourse: Course | undefined;
  recordDate: string;
  showTags: boolean;
  isSaved: boolean;
  isHistoryOpen: boolean;
  historyRecords: { typing: TypingRecord[]; retry: ProblemRetryRecord[]; homework: HomeworkRecord[] };
  typingForm: TypingForm;
  retryRows: RetryRowForm[];
  homeworkForm: HomeworkForm;
  problemSearch: string;
  onProblemSearchChange: (v: string) => void;
  onUpdateTyping: (field: keyof TypingForm, value: string | string[]) => void;
  onUpdateRetryRow: (rowIndex: number, field: keyof RetryRowForm, value: string | boolean | string[]) => void;
  onAddRetryRow: () => void;
  onRemoveRetryRow: (rowIndex: number) => void;
  onUpdateHomework: (field: keyof HomeworkForm, value: string | string[]) => void;
  onSave: () => void;
  onLoadHistory: () => void;
  onBatchRetry: () => void;
}

function StudentRecordCard({
  student, activeTab, activeCourse, showTags, isSaved, isHistoryOpen,
  historyRecords, typingForm, retryRows, homeworkForm,
  problemSearch, onProblemSearchChange,
  onUpdateTyping, onUpdateRetryRow, onAddRetryRow, onRemoveRetryRow,
  onUpdateHomework, onSave, onLoadHistory, onBatchRetry,
}: StudentRecordCardProps) {
  const retryRecords = historyRecords?.retry || [];
  const [collapsedHistory, setCollapsedHistory] = useState<Set<number>>(new Set());
  const toggleHistory = (rowIndex: number) => {
    setCollapsedHistory(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{student.name}</span>
          {student.className && <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{student.className}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLoadHistory} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
            <History className="h-3 w-3" />{isHistoryOpen ? '收起' : '历史'}
          </button>
          {activeTab === 'retry' && (
            <button onClick={onBatchRetry} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
              <Upload className="h-3 w-3" />批量
            </button>
          )}
          <Button size="sm" className={`h-7 text-xs ${isSaved ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`} onClick={onSave}>
            {isSaved ? <Check className="h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            {isSaved ? '已保存' : XIAN.save}
          </Button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Retry Tab */}
        {activeTab === 'retry' && (
          <div className="space-y-3">
            {retryRows.map((row, rowIndex) => {
              // 获取该题目的历史记录
              const problemHistory = retryRecords.filter(r => r.problemId === row.problemId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return (
                <div key={rowIndex} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-3">
                  {/* Problem selector + Time + Pass */}
                  <div className="flex items-start gap-3">
                    {/* Problem selector */}
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-gray-500 mb-1 block">题目</Label>
                      {activeCourse && activeCourse.problems.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-8 text-sm justify-between">
                              {row.problemId ? (
                                <span className="truncate text-gray-700">
                                  {activeCourse.problems.find(p => p.id === row.problemId)?.name || '选择题目'}
                                </span>
                              ) : (
                                <span className="text-gray-400">搜索题号/题目名</span>
                              )}
                              <ChevronDown className="h-3 w-3 text-gray-400 ml-1 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 bg-white border-gray-200" align="start">
                            <div className="p-2 border-b border-gray-100">
                              <Input placeholder="输入题号或题目名搜索..." className="h-7 text-xs"
                                value={problemSearch} onChange={(e) => onProblemSearchChange(e.target.value)} />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {activeCourse.problems
                                .filter(p => {
                                  if (!problemSearch) return true;
                                  const s = problemSearch.toLowerCase();
                                  return p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
                                })
                                .map((p) => (
                                  <div key={p.id}
                                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                                      row.problemId === p.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                    onClick={() => { onUpdateRetryRow(rowIndex, 'problemId', p.id); onProblemSearchChange(''); }}>
                                    {p.name}
                                  </div>
                                ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs text-gray-400">请先在课程管理中添加题目</span>
                      )}
                    </div>
                    {/* Time input */}
                    <div className="w-24">
                      <Label className="text-xs text-gray-500 mb-1 block">本次用时</Label>
                      <Input type="number" placeholder="分钟"
                        value={row.timeSpent}
                        onChange={(e) => onUpdateRetryRow(rowIndex, 'timeSpent', e.target.value)}
                        className="h-8 text-sm" />
                    </div>
                    {/* Pass/Fail selector */}
                    <div className="w-24">
                      <Label className="text-xs text-gray-500 mb-1 block">是否合格</Label>
                      <Select value={row.isQualified ? 'yes' : 'no'} onValueChange={(v) => onUpdateRetryRow(rowIndex, 'isQualified', v === 'yes')}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">合格</SelectItem>
                          <SelectItem value="no">不合格</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Remove row */}
                    {retryRows.length > 1 && (
                      <button onClick={() => onRemoveRetryRow(rowIndex)} className="mt-5 p-1 text-gray-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Fail reason */}
                  {!row.isQualified && (
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">不合格原因</Label>
                      <Input placeholder="请输入不合格原因..."
                        value={row.unqualifiedReason || ''}
                        onChange={(e) => onUpdateRetryRow(rowIndex, 'unqualifiedReason', e.target.value)}
                        className="h-8 text-sm" />
                    </div>
                  )}
                  {/* History records - collapsible */}
                  {row.problemId && problemHistory.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleHistory(rowIndex)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors mb-1"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${!collapsedHistory.has(rowIndex) ? 'rotate-180' : ''}`} />
                        <span>历史记录 ({problemHistory.length})</span>
                      </button>
                      {!collapsedHistory.has(rowIndex) && (
                        <div className="grid grid-cols-3 gap-2">
                          {problemHistory.slice(-6).map((record, idx) => (
                            <div key={idx} className="text-xs p-2 rounded bg-white border border-gray-200">
                              <div className="text-gray-500">{new Date(record.date).toLocaleDateString('zh-CN')}</div>
                              <div className="font-medium">{record.timeSpent}分钟</div>
                              <div className={record.isQualified ? 'text-green-600' : 'text-red-600'}>
                                {record.isQualified ? '合格' : '不合格'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={onAddRetryRow} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
              <Plus className="h-3 w-3" />添加题目
            </button>
          </div>
        )}

        {/* Typing Tab */}
        {activeTab === 'typing' && (
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-gray-500">打字速度（字/分钟）</Label>
              <Input type="number" placeholder="速度" value={typingForm.speed}
                onChange={(e) => onUpdateTyping('speed', e.target.value)}
                className="w-32 h-8 text-sm mt-1" />
            </div>
          </div>
        )}

        {/* Homework Tab */}
        {activeTab === 'homework' && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-gray-500">作业内容</Label>
                <Textarea value={homeworkForm.content} onChange={(e) => onUpdateHomework('content', e.target.value)}
                  placeholder="记录作业内容..." className="mt-1 min-h-[60px] text-sm" />
              </div>
              <div className="w-24">
                <Label className="text-xs text-gray-500">完成度</Label>
                <Select value={homeworkForm.completion} onValueChange={(v) => onUpdateHomework('completion', v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">全部完成</SelectItem>
                    <SelectItem value="75">大部分完成</SelectItem>
                    <SelectItem value="50">完成一半</SelectItem>
                    <SelectItem value="25">少量完成</SelectItem>
                    <SelectItem value="0">未完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">教师评语</Label>
              <Input value={homeworkForm.comment} onChange={(e) => onUpdateHomework('comment', e.target.value)}
                placeholder="写一句评语..." className="mt-1 h-8 text-sm" />
            </div>
          </div>
        )}

        {/* Tags section (toggleable) */}
        {showTags && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {/* 点赞 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-gray-500">{XIAN.strengths}</Label>
                <button
                  onClick={() => {
                    const customTag = prompt('输入自定义点赞标签：');
                    if (customTag && customTag.trim()) {
                      const trimmed = customTag.trim();
                      if (activeTab === 'typing') {
                        const cur = typingForm.praiseTags || [];
                        if (!cur.includes(trimmed)) {
                          onUpdateTyping('praiseTags', [...cur, trimmed]);
                        }
                      } else if (activeTab === 'retry') {
                        const firstRow = retryRows[0];
                        if (firstRow) {
                          const cur = firstRow.praiseTags || [];
                          if (!cur.includes(trimmed)) {
                            onUpdateRetryRow(0, 'praiseTags', [...cur, trimmed]);
                          }
                        }
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.praiseTags || [];
                        if (!cur.includes(trimmed)) {
                          onUpdateHomework('praiseTags', [...cur, trimmed]);
                        }
                      }
                    }
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" />
                  自定义
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESET_STRENGTHS.map(tag => {
                  let tags: string[] = [];
                  if (activeTab === 'typing') tags = typingForm.praiseTags || [];
                  else if (activeTab === 'retry' && retryRows[0]) tags = retryRows[0].praiseTags || [];
                  else if (activeTab === 'homework') tags = homeworkForm.praiseTags || [];
                  const isActive = tags.includes(tag);
                  return (
                    <button key={tag} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.praiseTags || [];
                        onUpdateTyping('praiseTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      } else if (activeTab === 'retry' && retryRows[0]) {
                        const cur = retryRows[0].praiseTags || [];
                        onUpdateRetryRow(0, 'praiseTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.praiseTags || [];
                        onUpdateHomework('praiseTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      }
                    }}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                      {tag}
                    </button>
                  );
                })}
                {/* Custom tags */}
                {(() => {
                  let customTags: string[] = [];
                  const presetList = PRESET_STRENGTHS as readonly string[];
                  if (activeTab === 'typing') customTags = (typingForm.praiseTags || []).filter(t => !presetList.includes(t));
                  else if (activeTab === 'retry' && retryRows[0]) customTags = (retryRows[0].praiseTags || []).filter(t => !presetList.includes(t));
                  else if (activeTab === 'homework') customTags = (homeworkForm.praiseTags || []).filter(t => !presetList.includes(t));
                  return customTags.map(tag => (
                    <button key={`custom-${tag}`} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.praiseTags || [];
                        onUpdateTyping('praiseTags', cur.filter(t => t !== tag));
                      } else if (activeTab === 'retry' && retryRows[0]) {
                        const cur = retryRows[0].praiseTags || [];
                        onUpdateRetryRow(0, 'praiseTags', cur.filter(t => t !== tag));
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.praiseTags || [];
                        onUpdateHomework('praiseTags', cur.filter(t => t !== tag));
                      }
                    }}
                      className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                      {tag} ×
                    </button>
                  ));
                })()}
              </div>
            </div>
            {/* 待提升 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-gray-500">{XIAN.improvements}</Label>
                <button
                  onClick={() => {
                    const customTag = prompt('输入自定义待提升标签：');
                    if (customTag && customTag.trim()) {
                      const trimmed = customTag.trim();
                      if (activeTab === 'typing') {
                        const cur = typingForm.improveTags || [];
                        if (!cur.includes(trimmed)) {
                          onUpdateTyping('improveTags', [...cur, trimmed]);
                        }
                      } else if (activeTab === 'retry') {
                        const firstRow = retryRows[0];
                        if (firstRow) {
                          const cur = firstRow.improveTags || [];
                          if (!cur.includes(trimmed)) {
                            onUpdateRetryRow(0, 'improveTags', [...cur, trimmed]);
                          }
                        }
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.improveTags || [];
                        if (!cur.includes(trimmed)) {
                          onUpdateHomework('improveTags', [...cur, trimmed]);
                        }
                      }
                    }
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" />
                  自定义
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESET_IMPROVEMENTS.map(tag => {
                  let tags: string[] = [];
                  if (activeTab === 'typing') tags = typingForm.improveTags || [];
                  else if (activeTab === 'retry' && retryRows[0]) tags = retryRows[0].improveTags || [];
                  else if (activeTab === 'homework') tags = homeworkForm.improveTags || [];
                  const isActive = tags.includes(tag);
                  return (
                    <button key={tag} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.improveTags || [];
                        onUpdateTyping('improveTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      } else if (activeTab === 'retry' && retryRows[0]) {
                        const cur = retryRows[0].improveTags || [];
                        onUpdateRetryRow(0, 'improveTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.improveTags || [];
                        onUpdateHomework('improveTags', isActive ? cur.filter(t => t !== tag) : [...cur, tag]);
                      }
                    }}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${isActive ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                      {tag}
                    </button>
                  );
                })}
                {/* Custom tags */}
                {(() => {
                  let customTags: string[] = [];
                  const presetList = PRESET_IMPROVEMENTS as readonly string[];
                  if (activeTab === 'typing') customTags = (typingForm.improveTags || []).filter(t => !presetList.includes(t));
                  else if (activeTab === 'retry' && retryRows[0]) customTags = (retryRows[0].improveTags || []).filter(t => !presetList.includes(t));
                  else if (activeTab === 'homework') customTags = (homeworkForm.improveTags || []).filter(t => !presetList.includes(t));
                  return customTags.map(tag => (
                    <button key={`custom-${tag}`} onClick={() => {
                      if (activeTab === 'typing') {
                        const cur = typingForm.improveTags || [];
                        onUpdateTyping('improveTags', cur.filter(t => t !== tag));
                      } else if (activeTab === 'retry' && retryRows[0]) {
                        const cur = retryRows[0].improveTags || [];
                        onUpdateRetryRow(0, 'improveTags', cur.filter(t => t !== tag));
                      } else if (activeTab === 'homework') {
                        const cur = homeworkForm.improveTags || [];
                        onUpdateHomework('improveTags', cur.filter(t => t !== tag));
                      }
                    }}
                      className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 border border-orange-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                      {tag} ×
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History panel */}
      {isHistoryOpen && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <h4 className="text-xs font-medium text-gray-500 mb-2">{XIAN.history}</h4>
          <div className="space-y-1">
            {historyRecords.retry.length === 0 && historyRecords.typing.length === 0 && historyRecords.homework.length === 0 ? (
              <p className="text-xs text-gray-400">暂无记录</p>
            ) : (
              <>
                {historyRecords.retry.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 text-[10px]">三刷</span>
                    <span>{r.date}</span>
                    <span>{r.problemName}</span>
                    <span>第{r.attempt}次 {r.timeSpent}分</span>
                  </div>
                ))}
                {historyRecords.typing.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-500 text-[10px]">速度</span>
                    <span>{r.date}</span>
                    <span>{r.speed}字/分</span>
                  </div>
                ))}
                {historyRecords.homework.map((r) => (
                  <div key={r.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 text-[10px]">作业</span>
                    <span>{r.date}</span>
                    <span>{r.content.slice(0, 20)}{r.content.length > 20 ? '...' : ''}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
