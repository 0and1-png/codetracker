'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Course } from '@/lib/types';
import { getCourses } from '@/lib/store';
import { COURSE_COLORS } from '@/lib/constants';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-gray-500 hover:text-blue-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">课程管理</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => {
          const colors = COURSE_COLORS[course.id] || COURSE_COLORS.course_cpp;
          return (
            <Link key={course.id} href={`/courses/${course.id}`} className="group">
              <div className="bg-white rounded-xl p-6 h-full border border-gray-200 transition-all duration-200 hover:border-blue-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                    {colors.icon || '📘'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{course.name}</h2>
                    <p className="text-xs text-gray-500">{course.knowledgePoints.length} 个知识点 · {course.problems.length} 道题目</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  {course.curriculum && course.curriculum.length > 0
                    ? `${course.curriculum.length} 个章节`
                    : '尚未添加课程内容'}
                </div>
                <div className="mt-4 flex items-center gap-2 text-blue-500 group-hover:text-blue-600 text-xs transition-colors">
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
