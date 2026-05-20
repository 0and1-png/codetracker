'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Plus, Trash2, X, ChevronDown, ChevronRight,
  FileText, Code, Palette, Edit3, GripVertical, ListPlus,
  FolderOpen, FileCode, Tag, Settings2, ChevronUp,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Course, CurriculumNode, CurriculumNodeType, CodeBlock, KnowledgePointDef, ProblemDef } from '@/lib/types';
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

const NODE_TYPE_CONFIG: Record<CurriculumNodeType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  chapter: { label: '章', icon: <FolderOpen className="h-3.5 w-3.5" />, color: 'text-violet-600', bgColor: 'bg-violet-50' },
  section: { label: '节', icon: <FileText className="h-3.5 w-3.5" />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  topic: { label: '知识点', icon: <Tag className="h-3.5 w-3.5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

const LANGUAGES = ['C++', 'Python', 'JavaScript', 'Java', 'HTML/CSS', '其他'];

// ============ Deep clone & tree helpers ============
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function findNodeById(nodes: CurriculumNode[], id: string): CurriculumNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateNodeInTree(nodes: CurriculumNode[], id: string, updater: (node: CurriculumNode) => CurriculumNode): CurriculumNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(deepClone(node));
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, id, updater) };
    }
    return node;
  });
}

function removeNodeFromTree(nodes: CurriculumNode[], id: string): CurriculumNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? removeNodeFromTree(node.children, id) : undefined,
    }));
}

function addChildNode(nodes: CurriculumNode[], parentId: string, child: CurriculumNode): CurriculumNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = [...(node.children || []), child];
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: addChildNode(node.children, parentId, child) };
    }
    return node;
  });
}

function countAllNodes(nodes: CurriculumNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children) count += countAllNodes(node.children);
  }
  return count;
}

// ============ Main Component ============
export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [courseId, setCourseId] = useState<string>('');
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<string>('curriculum');
  const [mounted, setMounted] = useState(false);

  // Curriculum state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Knowledge point state
  const [newKpName, setNewKpName] = useState('');
  const [expandedKpId, setExpandedKpId] = useState<string | null>(null);
  const [newProblemName, setNewProblemName] = useState('');
  const [newProblemKpId, setNewProblemKpId] = useState<string>('');

  // Add node dialog
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [addNodeParentId, setAddNodeParentId] = useState<string | null>(null);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeType, setNewNodeType] = useState<CurriculumNodeType>('section');

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
      // Auto-expand first level
      if (found.curriculum && found.curriculum.length > 0) {
        const firstLevel = new Set(found.curriculum.map((n) => n.id));
        setExpandedIds(firstLevel);
      }
    }
  }, [courseId]);

  useEffect(() => {
    if (mounted) loadCourse();
  }, [mounted, loadCourse]);

  const save = (updated: Course) => {
    updateCourse(updated);
    setCourse(updated);
  };

  // ====== Curriculum Tree Operations ======
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddNodeDialog = (parentId: string | null) => {
    setAddNodeParentId(parentId);
    setNewNodeTitle('');
    // Auto-suggest type based on parent
    if (!parentId) {
      setNewNodeType('chapter');
    } else {
      const parent = findNodeById(course?.curriculum || [], parentId);
      if (parent?.type === 'chapter') setNewNodeType('section');
      else setNewNodeType('topic');
    }
    setAddNodeDialogOpen(true);
  };

  const confirmAddNode = () => {
    if (!course || !newNodeTitle.trim()) return;
    const newNode: CurriculumNode = {
      id: uuidv4(),
      title: newNodeTitle.trim(),
      type: newNodeType,
      order: addNodeParentId
        ? (findNodeById(course.curriculum, addNodeParentId)?.children?.length || 0)
        : course.curriculum.length,
    };
    let updated: CurriculumNode[];
    if (addNodeParentId) {
      updated = addChildNode(course.curriculum, addNodeParentId, newNode);
      setExpandedIds((prev) => new Set([...prev, addNodeParentId]));
    } else {
      updated = [...course.curriculum, newNode];
    }
    save({ ...course, curriculum: updated });
    setSelectedNodeId(newNode.id);
    setAddNodeDialogOpen(false);
  };

  const deleteNode = (id: string) => {
    if (!course) return;
    const updated = removeNodeFromTree(course.curriculum, id);
    save({ ...course, curriculum: updated });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNodeField = (id: string, field: string, value: unknown) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, id, (node) => ({
      ...node,
      [field]: value,
    }));
    save({ ...course, curriculum: updated });
  };

  // Move node up/down within same level
  const moveNode = (nodes: CurriculumNode[], id: string, direction: 'up' | 'down'): CurriculumNode[] => {
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx === -1) {
      return nodes.map((n) => ({
        ...n,
        children: n.children ? moveNode(n.children, id, direction) : undefined,
      }));
    }
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= nodes.length) return nodes;
    const arr = [...nodes];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    return arr.map((n, i) => ({ ...n, order: i }));
  };

  const handleMoveNode = (id: string, direction: 'up' | 'down') => {
    if (!course) return;
    save({ ...course, curriculum: moveNode(course.curriculum, id, direction) });
  };

  // Add code block to node
  const addCodeBlock = (nodeId: string) => {
    if (!course) return;
    const newBlock: CodeBlock = {
      id: uuidv4(),
      language: 'C++',
      code: '',
      description: '',
    };
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => ({
      ...node,
      codeBlocks: [...(node.codeBlocks || []), newBlock],
    }));
    save({ ...course, curriculum: updated });
  };

  const updateCodeBlock = (nodeId: string, blockId: string, field: keyof CodeBlock, value: string) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => ({
      ...node,
      codeBlocks: (node.codeBlocks || []).map((b) =>
        b.id === blockId ? { ...b, [field]: value } : b
      ),
    }));
    save({ ...course, curriculum: updated });
  };

  const removeCodeBlock = (nodeId: string, blockId: string) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => ({
      ...node,
      codeBlocks: (node.codeBlocks || []).filter((b) => b.id !== blockId),
    }));
    save({ ...course, curriculum: updated });
  };

  // Link problem to curriculum node
  const toggleProblemLink = (nodeId: string, problemId: string) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => {
      const ids = node.problemIds || [];
      return {
        ...node,
        problemIds: ids.includes(problemId)
          ? ids.filter((id) => id !== problemId)
          : [...ids, problemId],
      };
    });
    save({ ...course, curriculum: updated });
  };

  // Link knowledge point to curriculum node
  const linkKnowledgePoint = (nodeId: string, kpId: string) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => ({
      ...node,
      knowledgePointId: node.knowledgePointId === kpId ? undefined : kpId,
    }));
    save({ ...course, curriculum: updated });
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
  const selectedNode = selectedNodeId ? findNodeById(course.curriculum, selectedNodeId) : null;
  const totalNodes = countAllNodes(course.curriculum);

  // ============ Tree Node Renderer ============
  const renderTreeNode = (node: CurriculumNode, depth: number, siblings: CurriculumNode[]) => {
    const isSelected = selectedNodeId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const config = NODE_TYPE_CONFIG[node.type];
    const idx = siblings.findIndex((n) => n.id === node.id);

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm
            ${isSelected ? 'bg-violet-100 text-violet-800 font-medium' : 'hover:bg-gray-50 text-foreground'}
            ${depth > 0 ? 'ml-' + Math.min(depth * 4, 12) : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            setSelectedNodeId(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <button
              className="shrink-0 p-0.5 hover:bg-gray-200 rounded"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          {/* Type icon */}
          <span className={`shrink-0 ${config.color}`}>{config.icon}</span>

          {/* Title */}
          <span className="truncate flex-1">{node.title}</span>

          {/* Badges */}
          {node.knowledgePointId && (
            <Tag className="h-3 w-3 text-violet-400 shrink-0" />
          )}
          {(node.problemIds?.length || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0">
              {node.problemIds!.length}题
            </Badge>
          )}
          {(node.codeBlocks?.length || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200 shrink-0">
              {node.codeBlocks!.length}码
            </Badge>
          )}

          {/* Action buttons (show on hover) */}
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {idx > 0 && (
              <button
                className="p-0.5 hover:bg-gray-200 rounded"
                onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'up'); }}
                title="上移"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            )}
            {idx < siblings.length - 1 && (
              <button
                className="p-0.5 hover:bg-gray-200 rounded"
                onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'down'); }}
                title="下移"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            <button
              className="p-0.5 hover:bg-violet-100 rounded"
              onClick={(e) => { e.stopPropagation(); openAddNodeDialog(node.id); }}
              title="添加子节点"
            >
              <Plus className="h-3 w-3 text-violet-500" />
            </button>
            <button
              className="p-0.5 hover:bg-red-100 rounded"
              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              title="删除"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1, node.children!))}
          </div>
        )}
      </div>
    );
  };

  // ============ Node Detail Editor ============
  const renderNodeDetail = () => {
    if (!selectedNode) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">选择左侧节点查看详情</p>
          <p className="text-xs mt-1">或点击「添加章节」开始构建课程体系</p>
        </div>
      );
    }

    const config = NODE_TYPE_CONFIG[selectedNode.type];
    const linkedKp = selectedNode.knowledgePointId
      ? course.knowledgePoints.find((kp) => kp.id === selectedNode.knowledgePointId)
      : null;
    const linkedProblems = (selectedNode.problemIds || [])
      .map((pid) => course.problems.find((p) => p.id === pid))
      .filter(Boolean) as ProblemDef[];
    const unlinkedProblems = course.problems.filter(
      (p) => !(selectedNode.problemIds || []).includes(p.id)
    );

    return (
      <div className="space-y-5">
        {/* Node header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {config.icon} {config.label}
            </Badge>
            {editingNodeId === selectedNode.id ? (
              <Input
                value={selectedNode.title}
                onChange={(e) => updateNodeField(selectedNode.id, 'title', e.target.value)}
                onBlur={() => setEditingNodeId(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingNodeId(null); }}
                className="h-8 text-base font-semibold"
                autoFocus
              />
            ) : (
              <h3
                className="text-base font-semibold cursor-pointer hover:text-violet-600 transition-colors"
                onClick={() => setEditingNodeId(selectedNode.id)}
              >
                {selectedNode.title}
                <Edit3 className="h-3 w-3 inline ml-1 opacity-30" />
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="border-violet-200 text-violet-600 h-7"
              onClick={() => openAddNodeDialog(selectedNode.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />添加子节点
            </Button>
          </div>
        </div>

        {/* Content / Description */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">内容描述</label>
          <Textarea
            value={selectedNode.content || ''}
            onChange={(e) => updateNodeField(selectedNode.id, 'content', e.target.value)}
            placeholder="输入该节点的教学内容描述、教学要点、备课笔记..."
            rows={6}
            className="text-sm"
          />
        </div>

        {/* Link Knowledge Point */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">关联知识点</label>
          {linkedKp ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                <Tag className="h-3 w-3 mr-1" />
                {linkedKp.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-400 hover:text-red-600"
                onClick={() => linkKnowledgePoint(selectedNode.id, selectedNode.knowledgePointId!)}
              >
                取消关联
              </Button>
            </div>
          ) : (
            <Select onValueChange={(val) => linkKnowledgePoint(selectedNode.id, val)}>
              <SelectTrigger className="h-8 w-64 border-dashed border-violet-200">
                <SelectValue placeholder="选择关联知识点..." />
              </SelectTrigger>
              <SelectContent>
                {course.knowledgePoints.map((kp) => (
                  <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Code Blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">代码示例</label>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs border-blue-200 text-blue-600"
              onClick={() => addCodeBlock(selectedNode.id)}
            >
              <Code className="h-3 w-3 mr-1" />添加代码
            </Button>
          </div>
          {(selectedNode.codeBlocks || []).length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-2">
              暂无代码示例
            </div>
          ) : (
            <div className="space-y-3">
              {(selectedNode.codeBlocks || []).map((block) => (
                <div key={block.id} className="border border-blue-100 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50">
                    <Select
                      value={block.language}
                      onValueChange={(val) => updateCodeBlock(selectedNode.id, block.id, 'language', val)}
                    >
                      <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={block.description || ''}
                      onChange={(e) => updateCodeBlock(selectedNode.id, block.id, 'description', e.target.value)}
                      placeholder="代码说明（可选）"
                      className="h-6 flex-1 text-xs border-0 bg-transparent p-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-red-100 hover:text-red-500"
                      onClick={() => removeCodeBlock(selectedNode.id, block.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={block.code}
                    onChange={(e) => updateCodeBlock(selectedNode.id, block.id, 'code', e.target.value)}
                    placeholder={`// 输入${block.language}代码...`}
                    rows={5}
                    className="font-mono text-xs bg-gray-900 text-green-400 border-0 rounded-none min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Problems */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">练习题目</label>
          {linkedProblems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {linkedProblems.map((p) => (
                <Badge
                  key={p.id}
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  onClick={() => toggleProblemLink(selectedNode.id, p.id)}
                >
                  {p.name}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          {unlinkedProblems.length > 0 ? (
            <Select onValueChange={(val) => toggleProblemLink(selectedNode.id, val)}>
              <SelectTrigger className="h-7 w-48 text-xs border-dashed border-emerald-200">
                <SelectValue placeholder="关联已有题目..." />
              </SelectTrigger>
              <SelectContent>
                {unlinkedProblems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              所有题目已关联（在「知识点」Tab 可添加新题目）
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {totalNodes} 个节点
            </Badge>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="curriculum" className="gap-1.5">
              <FileText className="h-4 w-4" />
              授课体系
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              知识点
            </TabsTrigger>
          </TabsList>

          {/* ====== Tab 1: Curriculum Tree ====== */}
          <TabsContent value="curriculum">
            <div className="flex gap-4 h-[calc(100vh-180px)]">
              {/* Left: Tree navigation */}
              <div className="w-72 shrink-0 border border-purple-100 rounded-xl bg-white overflow-hidden flex flex-col">
                <div className="px-3 py-2.5 border-b border-purple-50 flex items-center justify-between bg-violet-50/30">
                  <span className="text-xs font-medium text-violet-700">课程大纲</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs border-violet-200 text-violet-600"
                    onClick={() => openAddNodeDialog(null)}
                  >
                    <Plus className="h-3 w-3 mr-1" />添加章节
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {course.curriculum.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">暂无内容</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs border-violet-200 text-violet-600"
                        onClick={() => openAddNodeDialog(null)}
                      >
                        <Plus className="h-3 w-3 mr-1" />添加第一个章节
                      </Button>
                    </div>
                  ) : (
                    course.curriculum.map((node) => renderTreeNode(node, 0, course.curriculum))
                  )}
                </div>
              </div>

              {/* Right: Node detail editor */}
              <div className="flex-1 border border-purple-100 rounded-xl bg-white overflow-y-auto">
                <div className="p-5">
                  {renderNodeDetail()}
                </div>
              </div>
            </div>
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
                            <div
                              className="flex items-center justify-between px-4 py-3 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors"
                              onClick={() => setExpandedKpId(isExpanded ? null : kp.id)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-violet-500" /> : <ChevronRight className="h-4 w-4 text-violet-500" />}
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
                                onClick={(e) => { e.stopPropagation(); removeKnowledgePoint(kp.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-1 space-y-2 bg-white">
                                {kpProblems.length > 0 && (
                                  <div className="space-y-1.5">
                                    {kpProblems.map((p) => (
                                      <div key={p.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
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
                          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
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

                  {/* Standalone add problem */}
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

      {/* Add Node Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加{addNodeParentId ? '子' : ''}节点</DialogTitle>
            <DialogDescription>
              {addNodeParentId
                ? `在「${findNodeById(course.curriculum, addNodeParentId)?.title || ''}」下添加子节点`
                : '添加新的顶层章节'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">节点类型</label>
              <div className="flex gap-2">
                {(['chapter', 'section', 'topic'] as CurriculumNodeType[]).map((type) => {
                  const cfg = NODE_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors
                        ${newNodeType === type
                          ? `${cfg.bgColor} ${cfg.color} border-current`
                          : 'border-gray-200 text-muted-foreground hover:border-gray-300'}`}
                      onClick={() => setNewNodeType(type)}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">标题</label>
              <Input
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                placeholder="输入节点标题"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAddNode();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNodeDialogOpen(false)}>取消</Button>
            <Button
              onClick={confirmAddNode}
              disabled={!newNodeTitle.trim()}
              className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
