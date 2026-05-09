'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, Code, Palette, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course } from '@/lib/types';
import { getCourses } from '@/lib/store';

const COURSE_ICONS: Record<string, React.ReactNode> = {
  course_cpp: <Code className="h-8 w-8" />,
  course_python: <BookOpen className="h-8 w-8" />,
  course_visual: <Palette className="h-8 w-8" />,
};

const COURSE_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  course_cpp: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    gradient: 'from-blue-500 to-indigo-600',
  },
  course_python: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    gradient: 'from-emerald-500 to-teal-600',
  },
  course_visual: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    gradient: 'from-orange-500 to-amber-600',
  },
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadCourses = useCallback(() => {
    setCourses(getCourses());
  }, []);

  useEffect(() => {
    setMounted(true);
    loadCourses();
  }, [loadCourses]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-violet-600 transition-colors">
              工作台
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              课程管理
            </h1>
          </div>
        </div>
      </header>

      {/* Course Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => {
            const colors = COURSE_COLORS[course.id] || COURSE_COLORS.course_cpp;
            const icon = COURSE_ICONS[course.id] || <BookOpen className="h-8 w-8" />;
            return (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <div
                  className={`group relative rounded-2xl border ${colors.border} ${colors.bg} p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colors.gradient} text-white mb-4`}>
                    {icon}
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">{course.name}</h2>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>知识点：{course.knowledgePoints.length} 个</p>
                    <p>自定义题目：{course.problems.length} 个</p>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 p-6 rounded-xl bg-white border border-purple-100 text-center">
          <p className="text-muted-foreground text-sm">
            点击课程卡片进入课程详情，管理授课体系和知识点
          </p>
        </div>
      </div>
    </div>
  );
}
