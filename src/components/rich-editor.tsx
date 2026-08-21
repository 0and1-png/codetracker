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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DrawingCanvas from './drawing-canvas';
import { v4 as uuidv4 } from 'uuid';

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

interface Shape {
  id: string;
  type: 'textbox' | 'arrow';
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
    const [drawingMode, setDrawingMode] = useState<'none' | 'textbox' | 'arrow'>('none');
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

      if (drawingMode === 'textbox') {
        const newShape: Shape = {
          id: uuidv4(),
          type: 'textbox',
          x, y,
          width: w,
          height: Math.max(h, 60),
          text: '在此输入文字...',
          color: '#F0FDF4',
          borderColor: '#86EFAC',
        };
        setShapes(prev => [...prev, newShape]);
        setSelectedShape(newShape.id);
      } else if (drawingMode === 'arrow') {
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
        // Check if clicking near start or end point
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

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, shape: Shape, edge: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedShape(shape.id);
      setResizingShape({ id: shape.id, edge, startX: e.clientX, startY: e.clientY, origShape: { ...shape } });
    }, []);

    // Save shapes to editor content
    useEffect(() => {
      if (shapes.length > 0 && editor) {
        const shapesJson = JSON.stringify(shapes);
        const existingHtml = editor.getHTML();
        // Store shapes data in a hidden element
        if (!existingHtml.includes('data-shapes')) {
          // We'll handle this through the onChange callback
        }
      }
    }, [shapes]);

    if (!mounted || !editor) {
      return (
        <div className="border border-gray-200 rounded-lg bg-white" style={{ minHeight }}>
          <div className="p-4 text-gray-400 text-sm">加载编辑器中...</div>
        </div>
      );
    }

    const isActive = drawingMode !== 'none';

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm">
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
              onClick={() => { setDrawingMode(drawingMode === 'textbox' ? 'none' : 'textbox'); setSelectedShape(null); }}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${drawingMode === 'textbox' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              title="绘制文本框（点击后在编辑区拖拽绘制）">
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

        {/* Editor with overlay */}
        <div ref={editorContainerRef} className="relative"
          onMouseMove={handleShapeMouseMove}
          onMouseUp={handleShapeMouseUp}
          onMouseLeave={handleShapeMouseUp}
        >
          <EditorContent editor={editor} />

          {/* Shapes overlay */}
          {shapes.map((shape) => (
            <div key={shape.id}
              className="absolute"
              style={{
                left: shape.x, top: shape.y,
                width: shape.type === 'arrow' ? 'auto' : shape.width,
                height: shape.type === 'arrow' ? 'auto' : shape.height,
                cursor: draggingShape?.id === shape.id ? 'grabbing' : selectedShape === shape.id ? 'move' : 'pointer',
                zIndex: selectedShape === shape.id ? 20 : 10,
                touchAction: 'none',
              }}
              onMouseDown={(e) => handleShapeMouseDown(e, shape)}
            >
              {shape.type === 'textbox' ? (
                <>
                  <div
                    className={`rounded-lg border-2 shadow-sm overflow-hidden ${selectedShape === shape.id ? 'ring-2 ring-blue-400' : ''}`}
                    style={{ backgroundColor: shape.color, borderColor: shape.borderColor || '#86EFAC', width: shape.width, height: shape.height }}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="w-full h-full p-2 text-sm outline-none focus:outline-dashed focus:outline-2 focus:outline-blue-300"
                      style={{ fontSize: '13px', lineHeight: '1.5', color: '#374151' }}
                      onBlur={(e) => {
                        const text = e.currentTarget.textContent || '';
                        setShapes(prev => prev.map(s => s.id === shape.id ? { ...s, text } : s));
                      }}
                      dangerouslySetInnerHTML={{ __html: shape.text || '' }}
                    />
                  </div>
                  {/* Resize handles for selected textbox */}
                  {selectedShape === shape.id && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'nw')} />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'ne')} />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'sw')} />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'se')} />
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-n-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'n')} />
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-s-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 's')} />
                      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-w-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'w')} />
                      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-e-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, shape, 'e')} />
                    </>
                  )}
                </>
              ) : (
                <div className="relative" style={{ width: 1, height: 1 }}>
                  <svg
                    width={Math.abs((shape.endX || 0) - shape.x) + 20}
                    height={Math.abs((shape.endY || 0) - shape.y) + 20}
                    style={{ overflow: 'visible', position: 'absolute', left: -10, top: -10, pointerEvents: 'none' }}
                  >
                    <defs>
                      <marker id={`arrowhead-${shape.id}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill={shape.color} />
                      </marker>
                    </defs>
                    <line x1="0" y1="0"
                      x2={Math.abs((shape.endX || 0) - shape.x) + 10}
                      y2={Math.abs((shape.endY || 0) - shape.y) + 10}
                      stroke={shape.color} strokeWidth="2.5" markerEnd={`url(#arrowhead-${shape.id})`}
                      className={selectedShape === shape.id ? 'opacity-100' : 'opacity-80'}
                      style={{ pointerEvents: 'stroke' }}
                    />
                  </svg>
                  {/* Arrow start/end draggable points */}
                  {selectedShape === shape.id && (
                    <>
                      <div className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-move -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: 0, top: 0 }}
                        title="拖拽起点" />
                      <div className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-move -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: (shape.endX || 0) - shape.x, top: (shape.endY || 0) - shape.y }}
                        title="拖拽终点" />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Drawing mode overlay */}
          {isActive && (
            <div
              ref={overlayRef}
              className="absolute inset-0 cursor-crosshair z-30"
              style={{ backgroundColor: drawingMode === 'textbox' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Drawing preview */}
              {isDrawing && (
                <div className="absolute border-2 border-dashed pointer-events-none"
                  style={{
                    left: Math.min(drawStart.x, drawCurrent.x),
                    top: Math.min(drawStart.y, drawCurrent.y),
                    width: Math.abs(drawCurrent.x - drawStart.x),
                    height: Math.abs(drawCurrent.y - drawStart.y),
                    borderColor: drawingMode === 'textbox' ? '#3B82F6' : '#3B82F6',
                    backgroundColor: drawingMode === 'textbox' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    borderRadius: drawingMode === 'textbox' ? '8px' : '0',
                  }}
                />
              )}
              {/* Hint */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full shadow-sm text-xs text-gray-500 border border-gray-200 pointer-events-none">
                {drawingMode === 'textbox' ? '📦 点击拖拽绘制文本框' : '➡️ 点击拖拽绘制箭头'}
              </div>
            </div>
          )}
        </div>

        {/* Drawing Canvas Dialog */}
        <Dialog open={showDrawing} onOpenChange={setShowDrawing}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>✏️ 自由绘制</DialogTitle>
            </DialogHeader>
            <DrawingCanvas onSave={handleSaveDrawing} onClose={() => setShowDrawing(false)} />
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap gap-2 px-2 py-1 text-[10px] text-gray-400 border-t border-gray-100">
          <span>Ctrl+1 H1</span>
          <span>Ctrl+2 H2</span>
          <span>Ctrl+3 H3</span>
          <span>Ctrl+B 加粗</span>
          <span>Ctrl+U 下划线</span>
          <span>**粗体**</span>
          <span>~~删除~~</span>
          <span>`代码`</span>
        </div>
      </div>
    );
  }
);