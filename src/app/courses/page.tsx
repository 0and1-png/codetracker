'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Course } from '@/lib/types';
import { getCourses, syncFromSupabase } from '@/lib/store';
import { COURSE_COLORS } from '@/lib/constants';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    syncFromSupabase();
    setCourses(getCourses());
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-10">
        <Link href="/" className="text-[#A0AEC0] hover:text-[#6B8BA4] transition-colors duration-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-[#6B8BA4]" />
          <h1 className="text-xl font-semibold text-[#2D3748] tracking-wide">课程管理</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => {
          const colors = COURSE_COLORS[course.id] || COURSE_COLORS.course_cpp;
          return (
            <Link key={course.id} href={`/courses/${course.id}`} className="group">
              <div className="bg-white rounded-lg p-6 h-full border border-[#EDF2F7] transition-all duration-200 hover:border-[#6B8BA4]/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                    {colors.icon || '📘'}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#2D3748] group-hover:text-[#6B8BA4] transition-colors duration-200">{course.name}</h2>
                    <p className="text-xs text-[#A0AEC0] mt-0.5">{course.knowledgePoints.length} 个知识点 · {course.problems.length} 道题目</p>
                  </div>
                </div>
                <div className="text-sm text-[#4A5568] leading-relaxed">
                  {course.curriculum && course.curriculum.length > 0
                    ? `${course.curriculum.length} 个章节`
                    : '尚未添加课程内容'}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[#6B8BA4] group-hover:text-[#5A7A93] text-xs transition-colors duration-200">
                  <span>进入课程详情</span>
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
