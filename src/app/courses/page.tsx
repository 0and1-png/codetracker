'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { Course } from '@/lib/types';
import { getCourses } from '@/lib/store';
import { XIAN, COURSE_COLORS } from '@/lib/constants';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-amber-600 hover:text-amber-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold xian-text-gold font-serif">{XIAN.courses}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => {
          const colors = COURSE_COLORS[course.id] || COURSE_COLORS.course_cpp;
          return (
            <Link key={course.id} href={`/courses/${course.id}`} className="group">
              <div className="xian-card rounded-2xl p-6 h-full transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                    {colors.icon || '📜'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-200 font-serif group-hover:text-amber-100 transition-colors">{course.name}</h2>
                    <p className="text-xs text-amber-600">{course.knowledgePoints.length} 法门 · {course.problems.length} 题目</p>
                  </div>
                </div>
                <div className="text-sm text-amber-500/70 leading-relaxed">
                  {course.curriculum && course.curriculum.length > 0
                    ? `${course.curriculum.length} 章功法心要`
                    : '尚未构建修炼体系'}
                </div>
                <div className="mt-4 flex items-center gap-2 text-amber-600 group-hover:text-amber-400 text-xs transition-colors">
                  <span>进入修炼法门</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
