'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Upload,
  Search,
  Trash2,
  FileText,
  ChevronRight,
  Code2,
  Users,
} from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Student } from '@/lib/types';
import {
  getStudents,
  addStudent,
  deleteStudent,
  initKnowledgeForStudent,
} from '@/lib/store';
import { DEFAULT_KNOWLEDGE_POINTS } from '@/lib/constants';

export default function HomePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importText, setImportText] = useState('');

  const loadStudents = useCallback(() => {
    setStudents(getStudents());
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleAddStudent = () => {
    if (!newName.trim()) return;
    const student: Student = {
      id: uuidv4(),
      name: newName.trim(),
      className: newClass.trim() || undefined,
      course: newCourse.trim() || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addStudent(student);
    initKnowledgeForStudent(student.id, DEFAULT_KNOWLEDGE_POINTS);
    setNewName('');
    setNewClass('');
    setNewCourse('');
    setNewNotes('');
    setAddOpen(false);
    loadStudents();
  };

  const handleImport = () => {
    if (!importText.trim()) return;

    // Try CSV parse
    const result = Papa.parse(importText.trim(), {
      header: false,
      skipEmptyLines: true,
    });

    const rows = result.data as string[][];
    let count = 0;
    for (const row of rows) {
      const name = (row[0] || '').trim();
      if (!name) continue;
      const student: Student = {
        id: uuidv4(),
        name,
        className: (row[1] || '').trim() || undefined,
        course: (row[2] || '').trim() || undefined,
        notes: (row[3] || '').trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      addStudent(student);
      initKnowledgeForStudent(student.id, DEFAULT_KNOWLEDGE_POINTS);
      count++;
    }

    setImportText('');
    setImportOpen(false);
    loadStudents();
  };

  const handleDelete = (id: string) => {
    deleteStudent(id);
    loadStudents();
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.course || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                CodeTracker
              </h1>
              <p className="text-xs text-muted-foreground">少儿编程学习追踪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="h-4 w-4 mr-1" />
                  添加学生
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加学生</DialogTitle>
                  <DialogDescription>填写学生信息并添加到列表</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>姓名 *</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="学生姓名"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>班级</Label>
                      <Input
                        value={newClass}
                        onChange={(e) => setNewClass(e.target.value)}
                        placeholder="如：三年级A班"
                      />
                    </div>
                    <div>
                      <Label>课程</Label>
                      <Input
                        value={newCourse}
                        onChange={(e) => setNewCourse(e.target.value)}
                        placeholder="如：Scratch入门"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>备注</Label>
                    <Textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="其他备注信息"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleAddStudent}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    确认添加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-violet-200 text-violet-600">
                  <Upload className="h-4 w-4 mr-1" />
                  批量导入
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>批量导入学生</DialogTitle>
                  <DialogDescription>粘贴CSV格式学生名单快速导入</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>粘贴学生名单</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      每行一个学生，格式：姓名,班级,课程,备注（逗号分隔，班级/课程/备注可选）
                    </p>
                    <Textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={`张小明,三年级A班,Scratch入门\n李小红,三年级B班,Python基础\n王大伟,,Scratch进阶,转学新生`}
                      rows={8}
                    />
                  </div>
                  <Button
                    onClick={handleImport}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    导入
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索学生姓名、班级、课程..."
            className="pl-10 bg-white border-purple-100 focus:border-violet-300"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            共 {students.length} 名学生
          </div>
        </div>

        {/* Student grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-violet-300" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {students.length === 0 ? '还没有学生' : '没有找到匹配的学生'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {students.length === 0
                ? '点击上方"添加学生"或"批量导入"开始使用'
                : '试试调整搜索关键词'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((student) => (
              <Card
                key={student.id}
                className="group cursor-pointer hover:shadow-lg hover:shadow-violet-100 transition-all duration-200 border-purple-50 hover:border-violet-200"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1"
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {student.name}
                          </h3>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {student.className && <span>{student.className}</span>}
                            {student.course && (
                              <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                                {student.course}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {student.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {student.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/reports/${student.id}`)}
                      >
                        <FileText className="h-4 w-4 text-violet-500" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除学生「{student.name}」吗？所有学习记录也将被删除，此操作不可撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(student.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-end mt-3 text-xs text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => router.push(`/students/${student.id}`)}
                  >
                    查看详情 <ChevronRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
