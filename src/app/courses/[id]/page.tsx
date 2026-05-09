'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Plus, Trash2, X, ChevronDown, ChevronRight,
  FileText, Code, Palette, Eye, Edit3,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Course, KnowledgePointDef, ProblemDef } from '@/lib/types';
import { getCourses, updateCourse } from '@/lib/store';

const COURSE_ICONS: Record<string, React.ReactNode> = {
  course_cpp: <Code className="h-5 w-5" />,
  course_python: <BookOpen className="h-5 w-5" />,
  course_visual: <Palette className="h-5 w-5" />,
};

const COURSE_GRADIENTS: Record<string, string> = {
  course_cpp: 'from-blue-500 to-indigo-600',
  course_python: 'from-emerald-500 to-teal-600',
  course_visual: 'from-orange-500 to-amber-600',
};

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [courseId, setCourseId] = useState<string>('');
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<string>('teaching');
  const [mounted, setMounted] = useState(false);

  // Teaching content state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Knowledge point state
  const [newKpName, setNewKpName] = useState('');
  const [expandedKpId, setExpandedKpId] = useState<string | null>(null);
  const [newProblemName, setNewProblemName] = useState('');
  const [newProblemKpId, setNewProblemKpId] = useState<string>('');

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      setCourseId(p.id);
      setMounted(true);
    });
  }, [params]);

  const loadCourse = useCallback(() => {
    if (!courseId) return;
    const list = getCourses();
    const found = list.find((c) => c.id === courseId);
    if (found) {
      setCourse(found);
      setEditContent(found.teachingContent);
    }
  }, [courseId]);

  useEffect(() => {
    if (mounted) loadCourse();
  }, [mounted, loadCourse]);

  const save = (updated: Course) => {
    updateCourse(updated);
    setCourse(updated);
  };

  // ====== Teaching Content ======
  const startEditing = () => {
    if (!course) return;
    setEditContent(course.teachingContent);
    setIsEditing(true);
  };

  const saveContent = () => {
    if (!course) return;
    save({ ...course, teachingContent: editContent });
    setIsEditing(false);
  };

  const cancelEditing = () => {
    if (!course) return;
    setEditContent(course.teachingContent);
    setIsEditing(false);
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    if (!text.trim()) {
      return <p className="text-muted-foreground italic">暂无内容，点击右上角编辑按钮开始备课...</p>;
    }
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>;
      }
      // Code blocks (inline backtick)
      const codeParts = line.split(/(`[^`]+`)/);
      if (codeParts.length > 1) {
        return (
          <p key={i} className="text-sm leading-relaxed mb-1">
            {codeParts.map((part, j) =>
              part.startsWith('`') && part.endsWith('`') ? (
                <code key={j} className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono">
                  {part.slice(1, -1)}
                </code>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-sm leading-relaxed ml-4 list-disc">{line.slice(2)}</li>;
      }
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        return <li key={i} className="text-sm leading-relaxed ml-4 list-decimal">{line.slice(numMatch[0].length)}</li>;
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Regular paragraph
      return <p key={i} className="text-sm leading-relaxed mb-1">{line}</p>;
    });
  };

  // ====== Knowledge Points ======
  const addKnowledgePoint = () => {
    if (!course || !newKpName.trim()) return;
    const kp: KnowledgePointDef = { id: uuidv4(), name: newKpName.trim() };
    save({ ...course, knowledgePoints: [...course.knowledgePoints, kp] });
    setNewKpName('');
  };

  const removeKnowledgePoint = (id: string) => {
    if (!course) return;
    save({
      ...course,
      knowledgePoints: course.knowledgePoints.filter((kp) => kp.id !== id),
      problems: course.problems.filter((p) => p.knowledgePointId !== id),
    });
  };

  const addProblem = (kpId?: string) => {
    if (!course || !newProblemName.trim()) return;
    const targetKpId = kpId || newProblemKpId || undefined;
    const problem: ProblemDef = {
      id: uuidv4(),
      name: newProblemName.trim(),
      knowledgePointId: targetKpId,
    };
    save({ ...course, problems: [...course.problems, problem] });
    setNewProblemName('');
    setNewProblemKpId('');
  };

  const removeProblem = (id: string) => {
    if (!course) return;
    save({ ...course, problems: course.problems.filter((p) => p.id !== id) });
  };

  const getProblemsForKp = (kpId: string) => {
    if (!course) return [];
    return course.problems.filter((p) => p.knowledgePointId === kpId);
  };

  const getUnassignedProblems = () => {
    if (!course) return [];
    return course.problems.filter((p) => !p.knowledgePointId);
  };

  if (!mounted || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const gradient = COURSE_GRADIENTS[course.id] || COURSE_GRADIENTS.course_cpp;
  const icon = COURSE_ICONS[course.id] || <BookOpen className="h-5 w-5" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/courses" className="text-muted-foreground hover:text-violet-600 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
              {icon}
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {course.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="teaching" className="gap-1.5">
              <FileText className="h-4 w-4" />
              授课体系
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              知识点
            </TabsTrigger>
          </TabsList>

          {/* ====== Tab 1: Teaching Content ====== */}
          <TabsContent value="teaching">
            <Card className="border-purple-100">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  授课体系 / 备课内容
                </CardTitle>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEditing}>取消</Button>
                    <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white" onClick={saveContent}>
                      保存
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="border-violet-200 text-violet-600" onClick={startEditing}>
                    <Edit3 className="h-4 w-4 mr-1" />编辑
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground bg-violet-50 rounded-lg p-3 space-y-1">
                      <p className="font-medium text-violet-700">Markdown 风格语法支持：</p>
                      <p><code className="bg-white px-1 rounded"># 标题</code> / <code className="bg-white px-1 rounded">## 二级标题</code> / <code className="bg-white px-1 rounded">### 三级标题</code></p>
                      <p><code className="bg-white px-1 rounded">- 列表项</code> / <code className="bg-white px-1 rounded">1. 编号列表</code></p>
                      <p><code className="bg-white px-1 rounded">`代码`</code> 行内代码高亮</p>
                    </div>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder={`# 第一课：Hello World\n\n## 教学目标\n- 了解C++程序基本结构\n- 学会使用cout输出\n\n## 课堂代码\n\n\`#include <iostream>\`\n\`using namespace std;\`\n\`int main() {\`\n\`    cout << "Hello World" << endl;\`\n\`    return 0;\`\n\`}\`\n\n## 课后练习\n1. 修改输出内容为自己的名字\n2. 输出两行文字`}
                      rows={20}
                      className="font-mono text-sm leading-relaxed min-h-[400px]"
                    />
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none min-h-[400px] bg-white rounded-lg p-4">
                    {renderContent(course.teachingContent)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== Tab 2: Knowledge Points ====== */}
          <TabsContent value="knowledge">
            <div className="space-y-4">
              {/* Add knowledge point */}
              <Card className="border-purple-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet-500" />
                    知识点管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newKpName}
                      onChange={(e) => setNewKpName(e.target.value)}
                      placeholder="新知识点名称"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKnowledgePoint();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={addKnowledgePoint}
                      disabled={!newKpName.trim()}
                      className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />添加知识点
                    </Button>
                  </div>

                  {/* Knowledge point tree */}
                  {course.knowledgePoints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无知识点，请添加
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {course.knowledgePoints.map((kp) => {
                        const kpProblems = getProblemsForKp(kp.id);
                        const isExpanded = expandedKpId === kp.id;
                        return (
                          <div key={kp.id} className="border border-purple-100 rounded-xl overflow-hidden">
                            {/* KP header */}
                            <div
                              className="flex items-center justify-between px-4 py-3 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors"
                              onClick={() => setExpandedKpId(isExpanded ? null : kp.id)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-violet-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-violet-500" />
                                )}
                                <span className="font-medium text-sm text-violet-800">{kp.name}</span>
                                {kpProblems.length > 0 && (
                                  <Badge variant="outline" className="bg-white text-violet-600 border-violet-200 text-xs">
                                    {kpProblems.length} 题
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeKnowledgePoint(kp.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Expanded: sub-problems */}
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-1 space-y-2 bg-white">
                                {kpProblems.length > 0 && (
                                  <div className="space-y-1.5">
                                    {kpProblems.map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2"
                                      >
                                        <span className="text-sm text-emerald-800">{p.name}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 hover:bg-red-50 hover:text-red-500"
                                          onClick={() => removeProblem(p.id)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Quick add problem under this KP */}
                                <div className="flex gap-2">
                                  <Input
                                    value={newProblemName}
                                    onChange={(e) => setNewProblemName(e.target.value)}
                                    placeholder="添加题目..."
                                    className="flex-1 h-8 text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addProblem(kp.id);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-emerald-200 text-emerald-600 h-8"
                                    onClick={() => addProblem(kp.id)}
                                    disabled={!newProblemName.trim()}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Unassigned problems */}
                  {getUnassignedProblems().length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">未关联知识点的题目</h3>
                      <div className="space-y-1.5">
                        {getUnassignedProblems().map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <span className="text-sm text-foreground">{p.name}</span>
                            <div className="flex items-center gap-1">
                              <Select
                                value={p.knowledgePointId || ''}
                                onValueChange={(val) => {
                                  const updated = course.problems.map((prob) =>
                                    prob.id === p.id ? { ...prob, knowledgePointId: val } : prob
                                  );
                                  save({ ...course, problems: updated });
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs border-purple-200">
                                  <SelectValue placeholder="关联知识点" />
                                </SelectTrigger>
                                <SelectContent>
                                  {course.knowledgePoints.map((kp) => (
                                    <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
                                onClick={() => removeProblem(p.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standalone add problem with KP selection */}
                  <div className="mt-6 pt-4 border-t border-purple-100">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">添加题目（选择关联知识点）</h3>
                    <div className="flex gap-2">
                      <Input
                        value={newProblemName}
                        onChange={(e) => setNewProblemName(e.target.value)}
                        placeholder="题目名称"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addProblem();
                          }
                        }}
                      />
                      <Select value={newProblemKpId} onValueChange={setNewProblemKpId}>
                        <SelectTrigger className="w-40 border-purple-200">
                          <SelectValue placeholder="关联知识点" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不关联</SelectItem>
                          {course.knowledgePoints.map((kp) => (
                            <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-600"
                        onClick={() => addProblem()}
                        disabled={!newProblemName.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />添加题目
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
