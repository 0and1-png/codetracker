export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Plus, Trash2, X, ChevronDown, ChevronRight,
  FileText, Code, Palette, Edit3, Upload,
  FolderOpen, Tag, ChevronUp,
  Sparkles, Scroll, Flame, Swords,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
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
import { XIAN, COURSE_COLORS } from '@/lib/constants';

const COURSE_ICONS: Record<string, React.ReactNode> = {
  course_cpp: <Swords className="h-5 w-5" />,
  course_python: <Flame className="h-5 w-5" />,
  course_visual: <Sparkles className="h-5 w-5" />,
};

const NODE_TYPE_CONFIG: Record<CurriculumNodeType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  chapter: { label: '章', icon: <Scroll className="h-3.5 w-3.5" />, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  section: { label: '篇', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'text-sky-400', bgColor: 'bg-sky-900/30' },
  topic: { label: '知识点题库', icon: <Tag className="h-3.5 w-3.5" />, color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' },
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

  // Batch upload state
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [batchUploadKpId, setBatchUploadKpId] = useState<string>('');
  const [batchUploadText, setBatchUploadText] = useState('');
  const [batchUploadResult, setBatchUploadResult] = useState<{ success: number; failed: number } | null>(null);

  // Problem detail state
  const [problemDetailOpen, setProblemDetailOpen] = useState(false);

  // Problem detail state
  const [selectedProblem, setSelectedProblem] = useState<{ problem: ProblemDef; kpName: string } | null>(null);

  // Problem tag state
  const PRESET_TAGS = ['例题', '作业', '重点', '普通'] as const;
  const TAG_DESCRIPTIONS: Record<string, string> = {
    '例题': '上课讲解的例题',
    '作业': '上完课后需要完成的作业',
    '重点': '需要掌握、三刷的题型',
    '普通': '正常练习的题型',
  };
  const [customTags, setCustomTags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('coding_custom_problem_tags');
    return saved ? JSON.parse(saved) : [];
  });
  const [addingTagToProblem, setAddingTagToProblem] = useState<string | null>(null);
  const [newCustomTag, setNewCustomTag] = useState('');

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

  // ====== Problem Tag Operations ======
  const addTagToProblem = (problemId: string, tag: string) => {
    if (!course) return;
    const updated = {
      ...course,
      problems: course.problems.map((p) => {
        if (p.id !== problemId) return p;
        const tags = [...(p.tags || [])];
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
        return { ...p, tags };
      }),
    };
    save(updated);
  };

  const removeTagFromProblem = (problemId: string, tag: string) => {
    if (!course) return;
    const updated = {
      ...course,
      problems: course.problems.map((p) => {
        if (p.id !== problemId) return p;
        return { ...p, tags: (p.tags || []).filter((t) => t !== tag) };
      }),
    };
    save(updated);
  };

  const addCustomTag = () => {
    if (!newCustomTag.trim()) return;
    const tag = newCustomTag.trim();
    if (PRESET_TAGS.includes(tag as any) || customTags.includes(tag)) return;
    const updated = [...customTags, tag];
    setCustomTags(updated);
    localStorage.setItem('coding_custom_problem_tags', JSON.stringify(updated));
    setNewCustomTag('');
  };

  const removeCustomTag = (tag: string) => {
    const updated = customTags.filter((t) => t !== tag);
    setCustomTags(updated);
    localStorage.setItem('coding_custom_problem_tags', JSON.stringify(updated));
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

  const linkKnowledgePoint = (nodeId: string, kpId: string) => {
    if (!course) return;
    const updated = updateNodeInTree(course.curriculum, nodeId, (node) => {
      const isLinking = node.knowledgePointId !== kpId;
      // 如果关联知识点，同步关联该知识点下的所有题目
      let problemIds = node.problemIds || [];
      if (isLinking) {
        const relatedProblems = course.problems.filter(
          (p) => p.knowledgePointId === kpId || p.knowledgePointIds?.includes(kpId)
        );
        const relatedProblemIds = relatedProblems.map((p) => p.id);
        // 合并并去重
        problemIds = [...new Set([...problemIds, ...relatedProblemIds])];
      } else {
        // 取消关联时，移除该知识点关联的题目
        const relatedProblems = course.problems.filter(
          (p) => p.knowledgePointId === kpId || p.knowledgePointIds?.includes(kpId)
        );
        const relatedProblemIds = new Set(relatedProblems.map((p) => p.id));
        problemIds = problemIds.filter((id) => !relatedProblemIds.has(id));
      }
      return {
        ...node,
        knowledgePointId: isLinking ? kpId : undefined,
        problemIds,
      };
    });
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

  const moveKnowledgePoint = (id: string, direction: 'up' | 'down') => {
    if (!course) return;
    const kps = [...course.knowledgePoints];
    const idx = kps.findIndex((kp) => kp.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      [kps[idx - 1], kps[idx]] = [kps[idx], kps[idx - 1]];
    } else if (direction === 'down' && idx < kps.length - 1) {
      [kps[idx + 1], kps[idx]] = [kps[idx], kps[idx + 1]];
    } else {
      return;
    }
    save({ ...course, knowledgePoints: kps });
  };

  const updateProblemImage = (problemId: string, image: string) => {
    if (!course) return;
    save({
      ...course,
      problems: course.problems.map((p) => {
        if (p.id !== problemId) return p;
        return { ...p, image };
      }),
    });
    // Update selectedProblem state
    if (selectedProblem && selectedProblem.problem.id === problemId) {
      setSelectedProblem({ ...selectedProblem, problem: { ...selectedProblem.problem, image } });
    }
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

  const batchUploadProblems = () => {
    if (!course || !batchUploadText.trim() || !batchUploadKpId) return;
    const lines = batchUploadText.split('\n').filter((l) => l.trim());
    const newProblems: ProblemDef[] = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const name = parts.length >= 2 ? `${parts[0]} ${parts.slice(1).join(' ')}` : line.trim();
      return {
        id: uuidv4(),
        name,
        knowledgePointId: batchUploadKpId,
      };
    });
    save({ ...course, problems: [...course.problems, ...newProblems] });
    setBatchUploadText('');
    setBatchUploadKpId('');
    setBatchUploadOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-bg-gray-50">
        <div className="animate-pulse text-gray-700">加载中...</div>
      </div>
    );
  }

  const colors = COURSE_COLORS[course.id] || COURSE_COLORS.course_cpp;
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
            ${isSelected ? 'bg-gray-100 text-gray-700 font-medium' : 'hover:bg-white/5 text-gray-700/70'}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            setSelectedNodeId(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          {hasChildren ? (
            <button
              className="shrink-0 p-0.5 hover:bg-white/10 rounded"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-700" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-700" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <span className={`shrink-0 ${config.color}`}>{config.icon}</span>
          <span className="truncate flex-1">{node.title}</span>

          {node.knowledgePointId && (
            <Tag className="h-3 w-3 text-gray-700 shrink-0" />
          )}
          {(node.problemIds?.length || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-900/30 text-emerald-400 border-emerald-800 shrink-0">
              {node.problemIds!.length}题
            </Badge>
          )}
          {(node.codeBlocks?.length || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-sky-900/30 text-sky-400 border-sky-800 shrink-0">
              {node.codeBlocks!.length}码
            </Badge>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {idx > 0 && (
              <button className="p-0.5 hover:bg-white/10 rounded" onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'up'); }} title="上移">
                <ChevronUp className="h-3 w-3 text-gray-700" />
              </button>
            )}
            {idx < siblings.length - 1 && (
              <button className="p-0.5 hover:bg-white/10 rounded" onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'down'); }} title="下移">
                <ChevronDown className="h-3 w-3 text-gray-700" />
              </button>
            )}
            <button className="p-0.5 hover:bg-gray-100 rounded" onClick={(e) => { e.stopPropagation(); openAddNodeDialog(node.id); }} title="添加子知识点题库">
              <Plus className="h-3 w-3 text-gray-700" />
            </button>
            <button className="p-0.5 hover:bg-red-900/30 rounded" onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} title="删除">
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        </div>

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
        <div className="flex flex-col items-center justify-center h-full text-gray-700 py-20">
          <Scroll className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">选择左侧知识点题库查看详情</p>
          <p className="text-xs mt-1">或点击「添加卷章」开始构建课程体系</p>
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
                className="h-8 text-base font-semibold bg-white border-gray-200 border-gray-200 text-gray-700"
                autoFocus
              />
            ) : (
              <h3
                className="text-base font-semibold cursor-pointer text-gray-700 hover:text-gray-700 transition-colors"
                onClick={() => setEditingNodeId(selectedNode.id)}
              >
                {selectedNode.title}
                <Edit3 className="h-3 w-3 inline ml-1 opacity-30" />
              </h3>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-100 h-7"
            onClick={() => openAddNodeDialog(selectedNode.id)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />添加子知识点题库
          </Button>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">知识点题库描述</label>
          <Textarea
            value={selectedNode.content || ''}
            onChange={(e) => updateNodeField(selectedNode.id, 'content', e.target.value)}
            placeholder="输入教学要点、教学要点、备课笔记..."
            rows={6}
            className="text-sm bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">关联知识点题库</label>
          {linkedKp ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                <Tag className="h-3 w-3 mr-1" />
                {linkedKp.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-400 hover:text-red-300"
                onClick={() => linkKnowledgePoint(selectedNode.id, selectedNode.knowledgePointId!)}
              >
                解除关联
              </Button>
            </div>
          ) : (
            <Select onValueChange={(val) => linkKnowledgePoint(selectedNode.id, val)}>
              <SelectTrigger className="h-8 w-64 border-dashed border-gray-200 bg-white border-gray-200 text-gray-700">
                <SelectValue placeholder="选择关联知识点题库..." />
              </SelectTrigger>
              <SelectContent>
                {course.knowledgePoints.map((kp) => (
                  <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">代码示例</label>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs border-sky-700 text-sky-400 hover:bg-sky-900/30"
              onClick={() => addCodeBlock(selectedNode.id)}
            >
              <Code className="h-3 w-3 mr-1" />添加代码
            </Button>
          </div>
          {(selectedNode.codeBlocks || []).length === 0 ? (
            <div className="text-xs text-gray-700 italic py-2">暂无代码示例</div>
          ) : (
            <div className="space-y-3">
              {(selectedNode.codeBlocks || []).map((block) => (
                <div key={block.id} className="border border-sky-900/50 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-950/30">
                    <Select
                      value={block.language}
                      onValueChange={(val) => updateCodeBlock(selectedNode.id, block.id, 'language', val)}
                    >
                      <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0 text-sky-300">
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
                      placeholder="法术说明（可选）"
                      className="h-6 flex-1 text-xs border-0 bg-transparent p-0 text-gray-700"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-red-900/30 hover:text-red-400"
                      onClick={() => removeCodeBlock(selectedNode.id, block.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={block.code}
                    onChange={(e) => updateCodeBlock(selectedNode.id, block.id, 'code', e.target.value)}
                    placeholder={`// 输入${block.language}代码示例...`}
                    rows={5}
                    className="font-mono text-xs bg-gray-950 text-green-400 border-0 rounded-none min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">练习题目</label>
          {linkedProblems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {linkedProblems.map((p) => (
                <Badge
                  key={p.id}
                  className="bg-emerald-900/30 text-emerald-400 border-emerald-700 cursor-pointer hover:bg-red-900/30 hover:text-red-400 hover:border-red-700 transition-colors"
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
              <SelectTrigger className="h-7 w-48 text-xs border-dashed border-emerald-700 bg-white border-gray-200 text-gray-700">
                <SelectValue placeholder="关联题目..." />
              </SelectTrigger>
              <SelectContent>
                {unlinkedProblems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-gray-700 italic">所有题目已关联（在「知识点题库」Tab 可添加新题目）</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/courses" className="text-gray-700 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="inline-flex p-1.5 rounded-lg text-white"
              style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
              {icon}
            </div>
            <h1 className="text-lg font-bold text-gray-800 ">
              {course.name}
            </h1>
            <Badge variant="outline" className="text-xs text-gray-700 border-gray-200">
              {totalNodes} 个知识点题库
            </Badge>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-white border-gray-200">
            <TabsTrigger value="curriculum" className="gap-1.5 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
              <Scroll className="h-4 w-4" />
              {XIAN.curriculum}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
              <BookOpen className="h-4 w-4" />
              {XIAN.knowledgePoints}
            </TabsTrigger>
          </TabsList>

          {/* ====== Tab 1: Curriculum Tree ====== */}
          <TabsContent value="curriculum">
            <div className="flex gap-4 h-[calc(100vh-180px)]">
              {/* Left: Tree navigation */}
              <div className="w-72 shrink-0 bg-white border border-gray-200 rounded-xl rounded-xl overflow-hidden flex flex-col">
                <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between bg-gray-100">
                  <span className="text-xs font-medium text-gray-700">课程大纲</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs border-gray-200 text-gray-700 hover:bg-gray-100"
                    onClick={() => openAddNodeDialog(null)}
                  >
                    <Plus className="h-3 w-3 mr-1" />添加卷章
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {course.curriculum.length === 0 ? (
                    <div className="text-center py-10 text-gray-700">
                      <Scroll className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">尚无知识点题库心要</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs border-gray-200 text-gray-700 hover:bg-gray-100"
                        onClick={() => openAddNodeDialog(null)}
                      >
                        <Plus className="h-3 w-3 mr-1" />添加第一卷
                      </Button>
                    </div>
                  ) : (
                    course.curriculum.map((node) => renderTreeNode(node, 0, course.curriculum))
                  )}
                </div>
              </div>

              {/* Right: Node detail editor */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl rounded-xl overflow-y-auto">
                <div className="p-5">
                  {renderNodeDetail()}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ====== Tab 2: Knowledge Points ====== */}
          <TabsContent value="knowledge">
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="h-4 w-4 text-gray-700" />
                  <h2 className="text-base font-semibold text-gray-800 ">知识点题库管理</h2>
                </div>

                <div className="flex gap-2 mb-4">
                  <Input
                    value={newKpName}
                    onChange={(e) => setNewKpName(e.target.value)}
                    placeholder="新知识点题库名称"
                    className="flex-1 bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addKnowledgePoint(); }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={addKnowledgePoint}
                    disabled={!newKpName.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />添加知识点题库
                  </Button>
                </div>

                {course.knowledgePoints.length === 0 ? (
                  <div className="text-center py-8 text-gray-700">暂无知识点题库，请添加</div>
                ) : (
                  <div className="space-y-2">
                    {course.knowledgePoints.map((kp) => {
                      const kpProblems = getProblemsForKp(kp.id);
                      const isExpanded = expandedKpId === kp.id;
                      return (
                        <div key={kp.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setExpandedKpId(isExpanded ? null : kp.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-700" /> : <ChevronRight className="h-4 w-4 text-gray-700" />}
                              <span className="font-medium text-sm text-gray-700">{kp.name}</span>
                              {kpProblems.length > 0 && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                                  {kpProblems.length} 题目
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-gray-200 text-gray-700"
                                onClick={(e) => { e.stopPropagation(); moveKnowledgePoint(kp.id, 'up'); }}
                                title="上移"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-gray-200 text-gray-700"
                                onClick={(e) => { e.stopPropagation(); moveKnowledgePoint(kp.id, 'down'); }}
                                title="下移"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-red-900/30 hover:text-red-400"
                                onClick={(e) => { e.stopPropagation(); removeKnowledgePoint(kp.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-1 space-y-2 bg-white">
                              {kpProblems.length > 0 && (
                                <div className="space-y-1.5">
                                  {kpProblems.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="text-sm text-emerald-700 cursor-pointer hover:text-emerald-900 hover:underline truncate font-medium"
                                            onClick={() => { setSelectedProblem({ problem: p, kpName: kp.name }); setProblemDetailOpen(true); }}
                                            title="点击查看详情"
                                          >
                                            {p.name}
                                          </span>
                                          {/* Problem Tags */}
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {(p.tags || []).map((tag) => (
                                              <Tooltip key={tag}>
                                                <TooltipTrigger asChild>
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs cursor-pointer hover:bg-red-100 hover:text-red-600 hover:border-red-200 ${
                                                      PRESET_TAGS.includes(tag as any)
                                                        ? tag === '例题' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : tag === '作业' ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : tag === '重点' ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    }`}
                                                    onClick={() => removeTagFromProblem(p.id, tag)}
                                                  >
                                                    {tag}
                                                    <X className="h-3 w-3 ml-1" />
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{TAG_DESCRIPTIONS[tag] || `自定义标记：${tag}`}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            ))}
                                            {addingTagToProblem === p.id ? (
                                              <div className="flex items-center gap-1">
                                                <Select
                                                  value=""
                                                  onValueChange={(val) => {
                                                    if (val) {
                                                      addTagToProblem(p.id, val);
                                                      setAddingTagToProblem(null);
                                                    }
                                                  }}
                                                >
                                                  <SelectTrigger className="h-6 w-20 text-xs border-emerald-200 bg-white">
                                                    <SelectValue placeholder="选择标记" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {PRESET_TAGS.map((tag) => (
                                                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                                    ))}
                                                    {customTags.map((tag) => (
                                                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                                    ))}
                                                    <SelectSeparator />
                                                    <div className="px-2 py-1.5">
                                                      <div className="flex gap-1">
                                                        <Input
                                                          value={newCustomTag}
                                                          onChange={(e) => setNewCustomTag(e.target.value)}
                                                          placeholder="新标记..."
                                                          className="h-6 text-xs"
                                                          onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                              e.preventDefault();
                                                              addCustomTag();
                                                            }
                                                          }}
                                                        />
                                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addCustomTag}>
                                                          <Plus className="h-3 w-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </SelectContent>
                                                </Select>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddingTagToProblem(null)}>
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-emerald-600 hover:text-emerald-800"
                                                onClick={() => setAddingTagToProblem(p.id)}
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-900/30 hover:text-red-400" onClick={() => removeProblem(p.id)}>
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
                                  placeholder="添加练习题..."
                                  className="flex-1 h-8 text-sm bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700"
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProblem(kp.id); } }}
                                />
                                <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 h-8" onClick={() => addProblem(kp.id)} disabled={!newProblemName.trim()}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-700 text-purple-400 hover:bg-purple-900/30 h-8 text-xs"
                                  onClick={() => { setBatchUploadKpId(kp.id); setBatchUploadOpen(true); }}
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  批量
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {getUnassignedProblems().length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">未关联知识点题库的题目</h3>
                    <div className="space-y-1.5">
                      {getUnassignedProblems().map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{p.name}</span>
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
                              <SelectTrigger className="h-7 w-28 text-xs border-gray-200 bg-white border-gray-200 text-gray-700">
                                <SelectValue placeholder="关联知识点题库" />
                              </SelectTrigger>
                              <SelectContent>
                                {course.knowledgePoints.map((kp) => (
                                  <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-900/30 hover:text-red-400" onClick={() => removeProblem(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">添加题目（选择关联知识点题库）</h3>
                  <div className="flex gap-2">
                    <Input
                      value={newProblemName}
                      onChange={(e) => setNewProblemName(e.target.value)}
                      placeholder="题目名称"
                      className="bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProblem(); } }}
                    />
                    <Select value={newProblemKpId} onValueChange={setNewProblemKpId}>
                      <SelectTrigger className="w-40 border-gray-200 bg-white border-gray-200 text-gray-700">
                        <SelectValue placeholder="关联知识点题库" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不关联</SelectItem>
                        {course.knowledgePoints.map((kp) => (
                          <SelectItem key={kp.id} value={kp.id}>{kp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30" onClick={() => addProblem()} disabled={!newProblemName.trim()}>
                      <Plus className="h-4 w-4 mr-1" />添加题目
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-800 ">添加{addNodeParentId ? '子' : ''}知识点题库</DialogTitle>
            <DialogDescription className="text-gray-700">
              {addNodeParentId
                ? `在「${findNodeById(course.curriculum, addNodeParentId)?.title || ''}」下添加子知识点题库`
                : '添加新的顶层卷章'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700">知识点题库类型</label>
              <div className="flex gap-2">
                {(['chapter', 'section', 'topic'] as CurriculumNodeType[]).map((type) => {
                  const cfg = NODE_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors
                        ${newNodeType === type
                          ? `${cfg.bgColor} ${cfg.color} border-current`
                          : 'border-gray-200 text-gray-700 hover:border-gray-200'}`}
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
              <label className="text-sm font-medium mb-1.5 block text-gray-700">知识点题库名称</label>
              <Input
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                placeholder="输入知识点题库名称"
                className="bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAddNode(); } }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-700" onClick={() => setAddNodeDialogOpen(false)}>取消</Button>
            <Button onClick={confirmAddNode} disabled={!newNodeTitle.trim()} className="bg-blue-500 hover:bg-blue-600 text-white">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量上传题库弹窗 */}
      <Dialog open={batchUploadOpen} onOpenChange={setBatchUploadOpen}>
        <DialogContent className="max-w-2xl bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-800 ">批量上传题库</DialogTitle>
            <DialogDescription className="text-gray-700">
              每行一道题，格式：题号 题目名称（空格隔开）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700">题目列表</label>
              <Textarea
                value={batchUploadText}
                onChange={(e) => setBatchUploadText(e.target.value)}
                placeholder={`1059 津津的储蓄计划\n1060 津津的开心一天\n1061 津津的烦恼`}
                className="bg-white border-gray-200 border-gray-200 text-gray-700 placeholder:text-gray-700 min-h-[200px] font-mono text-sm"
              />
            </div>
            {batchUploadResult && (
              <div className={`p-3 rounded-lg text-sm ${batchUploadResult.success > 0 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-red-900/30 text-red-400 border border-red-800/50'}`}>
                成功导入 {batchUploadResult.success} 道题目{batchUploadResult.failed > 0 ? `，${batchUploadResult.failed} 道失败` : ''}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-700" onClick={() => { setBatchUploadOpen(false); setBatchUploadText(''); setBatchUploadResult(null); }}>取消</Button>
            <Button onClick={batchUploadProblems} className="bg-blue-500 hover:bg-blue-600 text-white">
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 题目详情弹窗 */}
      <Dialog open={problemDetailOpen} onOpenChange={setProblemDetailOpen}>
        <DialogContent className="max-w-2xl bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-800  flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-700" />
              {selectedProblem?.problem.name || '题目详情'}
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {selectedProblem?.problem.id && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">ID: {selectedProblem.problem.id}</span>}
              {selectedProblem?.kpName && <span className="text-xs bg-purple-900/30 px-2 py-0.5 rounded ml-2">知识点题库: {selectedProblem.kpName}</span>}
            </DialogDescription>
          </DialogHeader>
          {selectedProblem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">题目描述</label>
                <Textarea
                  value={selectedProblem.problem.description || ''}
                  onChange={(e) => {
                    if (!selectedProblem || !course) return;
                    const updatedProblem = { ...selectedProblem.problem, description: e.target.value };
                    setSelectedProblem({ ...selectedProblem, problem: updatedProblem });
                    save({
                      ...course,
                      problems: course.problems.map((p) => p.id === updatedProblem.id ? updatedProblem : p),
                    });
                  }}
                  placeholder="输入题目描述..."
                  className="min-h-[80px] text-sm resize-y"
                />
              </div>
              {/* 题目图片上传 */}
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">题目图片</label>
                {selectedProblem.problem.image ? (
                  <div className="relative group">
                    <img src={selectedProblem.problem.image} alt="题目图片" className="max-w-full max-h-[300px] rounded-lg border border-gray-200" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => updateProblemImage(selectedProblem.problem.id, '')}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />移除
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-6 w-6 mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">点击上传题目图片</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          // Compress image
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxSize = 400;
                            let { width, height } = img;
                            if (width > maxSize || height > maxSize) {
                              if (width > height) { height = (height / width) * maxSize; width = maxSize; }
                              else { width = (width / height) * maxSize; height = maxSize; }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            const compressed = canvas.toDataURL('image/jpeg', 0.5);
                            updateProblemImage(selectedProblem.problem.id, compressed);
                          };
                          img.src = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
              {selectedProblem.problem.codeExample && (
                <div>
                  <label className="text-sm font-medium mb-1 block text-gray-700">代码示例</label>
                  <pre className="p-3 rounded-lg bg-gray-900 border border-gray-200 text-emerald-400 text-sm overflow-x-auto">
                    <code>{selectedProblem.problem.codeExample}</code>
                  </pre>
                </div>
              )}
              {selectedProblem.problem.knowledgePointIds && selectedProblem.problem.knowledgePointIds.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block text-gray-700">关联知识点题库</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProblem.problem.knowledgePointIds.map((kpId: string) => {
                      const kp = course?.curriculum.find(k => k.id === kpId);
                      return kp ? (
                        <span key={kpId} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-900/30 text-purple-300 border border-purple-800/50">
                          {kp.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-700" onClick={() => setProblemDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
