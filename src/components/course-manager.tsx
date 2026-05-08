'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, BookOpen, Settings, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Course, KnowledgePointDef, ProblemDef } from '@/lib/types';
import { getCourses, updateCourse } from '@/lib/store';

interface CourseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoursesChange: () => void;
}

export function CourseManager({ open, onOpenChange, onCoursesChange }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');

  const loadCourses = useCallback(() => {
    const list = getCourses();
    setCourses(list);
    if (list.length > 0 && !activeCourseId) {
      setActiveCourseId(list[0].id);
    }
  }, [activeCourseId]);

  useEffect(() => {
    if (open) loadCourses();
  }, [open, loadCourses]);

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const save = (updated: Course) => {
    updateCourse(updated);
    setCourses(getCourses());
    onCoursesChange();
  };

  // Knowledge points
  const [newKpName, setNewKpName] = useState('');

  const addKnowledgePoint = () => {
    if (!activeCourse || !newKpName.trim()) return;
    const kp: KnowledgePointDef = {
      id: uuidv4(),
      name: newKpName.trim(),
    };
    save({ ...activeCourse, knowledgePoints: [...activeCourse.knowledgePoints, kp] });
    setNewKpName('');
  };

  const removeKnowledgePoint = (id: string) => {
    if (!activeCourse) return;
    save({
      ...activeCourse,
      knowledgePoints: activeCourse.knowledgePoints.filter((kp) => kp.id !== id),
      problems: activeCourse.problems.filter((p) => p.knowledgePointId !== id),
    });
  };

  // Problems
  const [newProblemName, setNewProblemName] = useState('');
  const [newProblemKpId, setNewProblemKpId] = useState<string>('');

  const addProblem = () => {
    if (!activeCourse || !newProblemName.trim()) return;
    const problem: ProblemDef = {
      id: uuidv4(),
      name: newProblemName.trim(),
      knowledgePointId: newProblemKpId || undefined,
    };
    save({ ...activeCourse, problems: [...activeCourse.problems, problem] });
    setNewProblemName('');
    setNewProblemKpId('');
  };

  const removeProblem = (id: string) => {
    if (!activeCourse) return;
    save({
      ...activeCourse,
      problems: activeCourse.problems.filter((p) => p.id !== id),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-violet-500" />
            课程管理
          </DialogTitle>
          <DialogDescription>管理课程的知识点、自定义题目和教学偏好</DialogDescription>
        </DialogHeader>

        <Tabs value={activeCourseId} onValueChange={setActiveCourseId}>
          <TabsList className="w-full">
            {courses.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="flex-1">
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {courses.map((course) => (
            <TabsContent key={course.id} value={course.id} className="space-y-6 mt-4">
              {/* Teaching habits */}
              <Card className="border-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    教学偏好 / 上课习惯
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={course.teachingHabits}
                    onChange={(e) => save({ ...course, teachingHabits: e.target.value })}
                    placeholder="记录你的教学偏好和上课习惯，如：注重代码规范、多练少讲..."
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Knowledge points */}
              <Card className="border-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet-500" />
                    知识点 ({course.knowledgePoints.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {course.knowledgePoints.map((kp) => (
                      <Badge
                        key={kp.id}
                        variant="outline"
                        className="bg-violet-50 text-violet-700 border-violet-200 py-1 px-3 text-sm"
                      >
                        {kp.name}
                        <button
                          onClick={() => removeKnowledgePoint(kp.id)}
                          className="ml-1.5 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
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
                      variant="outline"
                      onClick={addKnowledgePoint}
                      disabled={!newKpName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Custom problems */}
              <Card className="border-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    自定义题目 ({course.problems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.problems.length > 0 && (
                    <div className="space-y-2">
                      {course.problems.map((p) => {
                        const kp = course.knowledgePoints.find((k) => k.id === p.knowledgePointId);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {p.name}
                              </span>
                              {kp && (
                                <Badge
                                  variant="outline"
                                  className="bg-violet-50 text-violet-600 border-0 text-xs"
                                >
                                  {kp.name}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeProblem(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newProblemName}
                      onChange={(e) => setNewProblemName(e.target.value)}
                      placeholder="新题目名称"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addProblem();
                        }
                      }}
                    />
                    <select
                      value={newProblemKpId}
                      onChange={(e) => setNewProblemKpId(e.target.value)}
                      className="border rounded-md px-2 text-sm bg-white min-w-[100px]"
                    >
                      <option value="">关联知识点</option>
                      {course.knowledgePoints.map((kp) => (
                        <option key={kp.id} value={kp.id}>
                          {kp.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addProblem}
                      disabled={!newProblemName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
