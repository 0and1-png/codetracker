import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DrawingCanvas from './drawing-canvas';
import { v4 as uuidv4 } from 'uuid';

// Fraction node for mathematical fractions
const FractionNode = Node.create({
  name: 'fraction',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      numerator: { default: '1' },
      denominator: { default: '2' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-fraction]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-fraction': '',
        style: 'display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; font-size: 0.7em; line-height: 1.1; margin: 0 2px;',
      }),
      [
        'span',
        { style: 'padding: 0 4px; border-bottom: 1.5px solid currentColor;' },
        node.attrs.numerator,
      ],
      [
        'span',
        { style: 'padding: 0 4px;' },
        node.attrs.denominator,
      ],
    ];
  },

  addCommands() {
    return {
      insertFraction: (numerator: string, denominator: string) => ({ chain }: any) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { numerator, denominator },
          })
          .run();
      },
    } as any;
  },
});

const CustomHeading = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level;
    const id = `h-${level}-${node.textContent?.slice(0, 30).replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '') || 'heading'}`;
    return [`h${level}`, { ...HTMLAttributes, id }, 0];
  },
  addKeyboardShortcuts() {
    return {
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
    };
  },
});

// TextBox node for inline text boxes in the document
const TextBoxNode = Node.create({
  name: 'textBox',
  group: 'block',
  content: 'inline*',
  defining: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      backgroundColor: { default: '#F0FDF4' },
      borderColor: { default: '#86EFAC' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="textbox"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      {
        'data-type': 'textbox',
        class: 'rounded-lg border-2 p-3 my-2 min-h-[60px]',
        style: `background-color: ${node.attrs.backgroundColor}; border-color: ${node.attrs.borderColor};`,
      },
      0,
    ];
  },

  addCommands() {
    return {
      insertTextBox: (backgroundColor?: string, borderColor?: string) => ({ chain }: any) => {
        return chain()
          .insertContent({
            type: 'textBox',
            attrs: { backgroundColor: backgroundColor || '#F0FDF4', borderColor: borderColor || '#86EFAC' },
            content: [{ type: 'text', text: '在此输入文字...' }],
          })
          .run();
      },
    } as any;
  },
});

interface Shape {
  id: string;
  type: 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  borderColor?: string;
  endX?: number;
  endY?: number;
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export interface RichEditorHandle {
  insertCode: (code?: string, language?: string) => void;
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  function RichEditor({ content, onChange, placeholder = '输入笔记内容...', minHeight = 200 }: RichEditorProps, ref) {
    const [mounted, setMounted] = useState(false);
    const [showDrawing, setShowDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<'none' | 'arrow'>('none');
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
    const [selectedShape, setSelectedShape] = useState<string | null>(null);
    const [draggingShape, setDraggingShape] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
    const [resizingShape, setResizingShape] = useState<{ id: string; edge: string; startX: number; startY: number; origShape: Shape } | null>(null);
    const [draggingArrowEnd, setDraggingArrowEnd] = useState<{ id: string; startX: number; startY: number; origEndX: number; origEndY: number; isStart?: boolean } | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const prevContentRef = useRef(content);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        CustomHeading.configure({ levels: [1, 2, 3] }),
        Underline,
        Superscript,
        Subscript,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        CodeBlock,
        History,
        Dropcursor,
        Gapcursor,
        OrderedList,
        ListItem,
        BulletList,
        FractionNode.configure({}),
        TextBoxNode.configure({}),
        Image.configure({ inline: true, allowBase64: true }),
        Placeholder.configure({ placeholder }),
      ],
      content,
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
          style: `min-height: ${minHeight}px`,
        },
        handleKeyDown: (view, event) => {
          // Tab key for indentation (insert spaces)
          if (event.key === 'Tab') {
            event.preventDefault();
            const { state, dispatch } = view;
            const { tr } = state;
            tr.insertText('    ');
            dispatch(tr);
            return true;
          }
          return false;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;
              const reader = new FileReader();
              reader.onload = (e) => {
                const url = e.target?.result as string;
                editor?.chain().focus().setImage({ src: url }).run();
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
      },
    });

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (editor && content !== prevContentRef.current) {
        prevContentRef.current = content;
        if (content !== editor.getHTML()) {
          editor.commands.setContent(content);
        }
      }
    }, [editor, content]);

    const doInsertCode = useCallback((code = '', language = 'cpp') => {
      if (!editor) return;
      const cppFramework = `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n\n    return 0;\n}`;
      const codeContent = code.trim() || cppFramework;
      editor.chain().focus().insertContent([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '📝 ', marks: [] },
            { type: 'text', text: '题目描述', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '在此输入题目描述...', marks: [{ type: 'textStyle', attrs: { color: '#9CA3AF' } }] },
          ],
        },
        { type: 'codeBlock', attrs: { language }, content: [{ type: 'text', text: codeContent }] },
        { type: 'paragraph' },
      ]).run();
    }, [editor]);

    useImperativeHandle(ref, () => ({
      insertCode: doInsertCode,
    }), [doInsertCode]);

    const handleSaveDrawing = useCallback((dataUrl: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent({
        type: 'image',
        attrs: { src: dataUrl, alt: 'drawing', class: 'drawing-image' },
      }).run();
      setShowDrawing(false);
    }, [editor]);

    const execCmd = useCallback((fn: () => boolean) => {
      if (!editor) return;
      fn();
    }, [editor]);

    // Get editor position for overlay
    const getEditorRect = useCallback(() => {
      return editorContainerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    }, []);

    // Mouse handlers for drawing
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (drawingMode === 'none') return;
      const rect = getEditorRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    }, [drawingMode, getEditorRect]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDrawing) return;
      const rect = getEditorRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawCurrent({ x, y });
    }, [isDrawing, getEditorRect]);

    const handleMouseUp = useCallback(() => {
      if (!isDrawing || drawingMode === 'none') return;
      setIsDrawing(false);
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      if (w < 10 && h < 10) {
        setDrawingMode('none');
        return;
      }

      if (drawingMode === 'arrow') {
        const newShape: Shape = {
          id: uuidv4(),
          type: 'arrow',
          x: drawStart.x, y: drawStart.y,
          width: 0, height: 0,
          color: '#3B82F6',
          endX: drawCurrent.x,
          endY: drawCurrent.y,
        };
        setShapes(prev => [...prev, newShape]);
      }
      setDrawingMode('none');
    }, [isDrawing, drawingMode, drawStart, drawCurrent]);

    // Shape drag handlers
    const handleShapeMouseDown = useCallback((e: React.MouseEvent, shape: Shape) => {
      if (drawingMode !== 'none') return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedShape(shape.id);
      if (shape.type === 'arrow') {
        const rect = getEditorRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const distToEnd = Math.sqrt((mx - (shape.endX || shape.x)) ** 2 + (my - (shape.endY || shape.y)) ** 2);
        const distToStart = Math.sqrt((mx - shape.x) ** 2 + (my - shape.y) ** 2);
        if (distToEnd < 12) {
          setDraggingArrowEnd({ id: shape.id, startX: e.clientX, startY: e.clientY, origEndX: shape.endX || shape.x, origEndY: shape.endY || shape.y });
          return;
        }
        if (distToStart < 12) {
          setDraggingArrowEnd({ id: shape.id, startX: e.clientX, startY: e.clientY, origEndX: shape.x, origEndY: shape.y, isStart: true });
          return;
        }
      }
      setDraggingShape({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
    }, [drawingMode, getEditorRect]);

    const handleShapeMouseMove = useCallback((e: React.MouseEvent) => {
      const rect = getEditorRect();
      if (draggingShape) {
        const dx = e.clientX - draggingShape.startX;
        const dy = e.clientY - draggingShape.startY;
        setShapes(prev => prev.map(s => {
          if (s.id !== draggingShape.id) return s;
          const newX = draggingShape.origX + dx;
          const newY = draggingShape.origY + dy;
          if (s.type === 'arrow') {
            const ow = (s.endX || s.x) - s.x;
            const oh = (s.endY || s.y) - s.y;
            return { ...s, x: newX, y: newY, endX: newX + ow, endY: newY + oh };
          }
          return { ...s, x: newX, y: newY };
        }));
      }
      if (draggingArrowEnd) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setShapes(prev => prev.map(s => {
          if (s.id !== draggingArrowEnd.id) return s;
          if (draggingArrowEnd.isStart) {
            return { ...s, x: mx, y: my };
          }
          return { ...s, endX: mx, endY: my };
        }));
      }
      if (resizingShape) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { edge, origShape } = resizingShape;
        let { x, y, width, height } = origShape;
        if (edge.includes('e')) width = Math.max(40, mx - x);
        if (edge.includes('w')) { const newW = Math.max(40, x + width - mx); x = x + width - newW; width = newW; }
        if (edge.includes('s')) height = Math.max(40, my - y);
        if (edge.includes('n')) { const newH = Math.max(40, y + height - my); y = y + height - newH; height = newH; }
        setShapes(prev => prev.map(s => s.id === resizingShape.id ? { ...s, x, y, width, height } : s));
      }
    }, [draggingShape, draggingArrowEnd, resizingShape, getEditorRect]);

    const handleShapeMouseUp = useCallback(() => {
      setDraggingShape(null);
      setDraggingArrowEnd(null);
      setResizingShape(null);
    }, []);

    

    if (!mounted || !editor) {
      return (
        <div className="border border-gray-200 rounded-lg bg-white" style={{ minHeight }}>
          <div className="p-4 text-gray-400 text-sm">加载编辑器中...</div>
        </div>
      );
    }

    const isActive = drawingMode !== 'none';

    const toolbar = (
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm">
        {/* 标题 */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="一级标题 (Ctrl+1)">H1</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="二级标题 (Ctrl+2)">H2</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="三级标题 (Ctrl+3)">H3</button>
        </div>

        {/* 文字样式 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="加粗 (Ctrl+B)">B</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            className={`px-2 py-1 text-xs rounded underline ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="下划线 (Ctrl+U)">U</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSuperscript().run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('superscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="上标">X<sup>2</sup></button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSubscript().run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('subscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="下标">X<sub>2</sub></button>
        </div>

        {/* 字体颜色 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <div className="relative">
            <button type="button"
              onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
              className={`px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1 ${showColorPicker ? 'bg-gray-200' : ''}`}
              title="字体颜色">
              <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: '#000' }} />
              <span className="text-[10px]">▼</span>
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-1 z-50 w-[180px]">
                  {['#000000', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#2563EB', '#7C3AED', '#0891B2', '#4B5563', '#9333EA', '#DB2777', '#059669', '#0D9488', '#4F46E5', '#A855F7', '#EC4899', '#F59E0B', '#84CC16'].map((c) => (
                    <button key={c} type="button" className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button type="button"
              onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
              className={`px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1 ${showBgColorPicker ? 'bg-gray-200' : ''}`}
              title="背景颜色">
              <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: '#FEF08A' }} />
              <span className="text-[10px]">▼</span>
            </button>
            {showBgColorPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBgColorPicker(false)} />
                <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-1 z-50 w-[180px]">
                  {['#FEF08A', '#FECACA', '#FED7AA', '#FDE68A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#CFFAFE', '#FECDD3', '#D1FAE5', '#E0E7FF', '#FCE7F3', '#FEF3C7', '#ECFCCB', '#E5E7EB', '#FFFFFF'].map((c) => (
                    <button key={c} type="button" className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setHighlight({ color: c }).run(); setShowBgColorPicker(false); }} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 列表 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="有序列表（自动编号）">
            <span className="text-sm font-mono">1.</span>
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`px-2 py-1 text-xs rounded ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="无序列表">
            <span className="text-sm">•</span>
          </button>
        </div>

        {/* 分数 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <div className="relative">
            <button type="button"
              onClick={() => {
                const num = prompt('输入分子：', '1');
                if (num === null) return;
                const den = prompt('输入分母：', '2');
                if (den === null) return;
                (editor.chain().focus() as any).insertFraction(num || '1', den || '2').run();
              }}
              className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1"
              title="插入分数">
              <span className="text-sm font-serif" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1', fontSize: '11px' }}>
                <span style={{ borderBottom: '1.5px solid currentColor', padding: '0 2px' }}>a</span>
                <span style={{ padding: '0 2px' }}>b</span>
              </span>
            </button>
          </div>
        </div>

        {/* 代码块 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
            className={`px-2 py-1 text-xs rounded font-mono ${editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="代码块">{'</>'}</button>
          <button type="button" onClick={() => doInsertCode('')}
            className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 font-medium"
            title="插入代码（描述+代码块）">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>

        {/* 绘制工具 */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <button type="button"
            onClick={() => {
              const colors = ['#F0FDF4', '#FEF08A', '#FECACA', '#DBEAFE', '#EDE9FE', '#FCE7F3', '#E0F2FE', '#FFF7ED', '#F5F5F4', '#ECFDF5'];
              const bgColor = colors[Math.floor(Math.random() * colors.length)];
              const borderColors = ['#86EFAC', '#FDE047', '#FCA5A5', '#93C5FD', '#C4B5FD', '#F9A8D4', '#7DD3FC', '#FDBA74', '#D6D3D1', '#6EE7B7'];
              const bdColor = borderColors[Math.floor(Math.random() * borderColors.length)];
              (editor.chain().focus() as any).insertTextBox(bgColor, bdColor).run();
            }}
            className="px-2 py-1 text-xs rounded flex items-center gap-1 text-gray-600 hover:bg-gray-200 transition-colors"
            title="插入文本框">
            <span className="text-sm">📦</span>
            <span>文本框</span>
          </button>
          <button type="button"
            onClick={() => { setDrawingMode(drawingMode === 'arrow' ? 'none' : 'arrow'); setSelectedShape(null); }}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${drawingMode === 'arrow' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
            title="绘制箭头（点击后在编辑区拖拽绘制）">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>箭头</span>
          </button>
          <button type="button" onClick={() => setShowDrawing(true)}
            className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1"
            title="自由绘制画板">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            画板
          </button>
          {shapes.length > 0 && (
            <button type="button" onClick={() => { setShapes([]); setSelectedShape(null); }}
              className="px-2 py-1 text-xs rounded text-red-500 hover:bg-red-50"
              title="清除所有绘制">清除</button>
          )}
        </div>
      </div>
    );

    return (
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="sticky top-0 z-20">
          {toolbar}
        </div>
        <div ref={editorContainerRef} className="relative"
          onMouseMove={handleShapeMouseMove}
          onMouseUp={handleShapeMouseUp}
          onMouseLeave={handleShapeMouseUp}
        >
          <div onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <EditorContent editor={editor} />
          </div>

          {/* Shapes overlay - only arrows */}
          {shapes.map((shape) => (
            <div key={shape.id}
              className="absolute"
              style={{
                left: shape.x, top: shape.y,
                cursor: draggingShape?.id === shape.id ? 'grabbing' : selectedShape === shape.id ? 'move' : 'pointer',
                zIndex: selectedShape === shape.id ? 20 : 10,
                touchAction: 'none',
              }}
              onMouseDown={(e) => handleShapeMouseDown(e, shape)}
            >
              {/* Arrow */}
              <svg style={{ overflow: 'visible', pointerEvents: 'none' }} width={Math.abs((shape.endX || shape.x) - shape.x)} height={Math.abs((shape.endY || shape.y) - shape.y)}>
                <line x1={shape.x < (shape.endX || 0) ? 0 : Math.abs((shape.endX || shape.x) - shape.x)}
                  y1={shape.y < (shape.endY || 0) ? 0 : Math.abs((shape.endY || shape.y) - shape.y)}
                  x2={shape.x < (shape.endX || 0) ? Math.abs((shape.endX || shape.x) - shape.x) : 0}
                  y2={shape.y < (shape.endY || 0) ? Math.abs((shape.endY || shape.y) - shape.y) : 0}
                  stroke={shape.color} strokeWidth={2} markerEnd={`url(#arrowhead-${shape.id})`} />
                <defs>
                  <marker id={`arrowhead-${shape.id}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill={shape.color} />
                  </marker>
                </defs>
              </svg>
              {/* Start/End points */}
              {selectedShape === shape.id && (
                <>
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-pointer z-30"
                    style={{ left: -6, top: -6 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedShape(shape.id);
                      setDraggingArrowEnd({ id: shape.id, startX: e.clientX, startY: e.clientY, origEndX: shape.x, origEndY: shape.y, isStart: true });
                    }} />
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-pointer z-30"
                    style={{ left: (shape.endX || shape.x) - shape.x - 6, top: (shape.endY || shape.y) - shape.y - 6 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedShape(shape.id);
                      setDraggingArrowEnd({ id: shape.id, startX: e.clientX, startY: e.clientY, origEndX: shape.endX || shape.x, origEndY: shape.endY || shape.y });
                    }} />
                </>
              )}
            </div>
          ))}

          {/* Drawing preview overlay - only arrows */}
          {isDrawing && drawingMode !== 'none' && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y}
                  stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 3" />
              </svg>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-blue-500 bg-white px-2 py-0.5 rounded shadow">
                ➡️ 点击拖拽绘制箭头
              </div>
            </div>
          )}

          {/* Drawing mode hint */}
          {drawingMode !== 'none' && !isDrawing && (
            <div className="absolute inset-0 bg-blue-500/5 z-20 flex items-center justify-center pointer-events-none rounded-b-lg">
              <div className="text-sm text-blue-500 bg-white/90 px-4 py-2 rounded-lg shadow">
                ➡️ 在编辑区点击并拖拽鼠标绘制箭头
              </div>
            </div>
          )}
        </div>

        {/* Drawing Canvas Modal */}
        <Dialog open={showDrawing} onOpenChange={setShowDrawing}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>自由绘制画板</DialogTitle>
            </DialogHeader>
            <DrawingCanvas onSave={handleSaveDrawing} onClose={() => setShowDrawing(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);