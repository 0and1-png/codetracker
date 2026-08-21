'use client';

import { useCallback, forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Heading from '@tiptap/extension-heading';

// Custom heading extension that adds IDs for scrolling
const CustomHeading = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level;
    const text = node.textContent || '';
    const id = 'h-' + text.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || `heading-${level}-${Math.random().toString(36).slice(2, 7)}`;
    return [`h${level}`, { ...HTMLAttributes, id }, 0];
  },
  addKeyboardShortcuts() {
    return {
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-6': () => this.editor.commands.toggleHeading({ level: 6 }),
    };
  },
});
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

export interface RichEditorHandle {
  insertCode: (code: string, language?: string) => void;
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  function RichEditor({ content, onChange, placeholder = '输入笔记内容...', minHeight = 200 }: RichEditorProps, ref) {
    const [mounted, setMounted] = useState(false);
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

    // Sync external content changes
    useEffect(() => {
      if (editor && content !== prevContentRef.current) {
        prevContentRef.current = content;
        if (content !== editor.getHTML()) {
          editor.commands.setContent(content);
        }
      }
    }, [editor, content]);

    const doInsertCode = useCallback((code: string, language = 'cpp') => {
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

    const execCmd = useCallback((fn: () => boolean) => {
      if (!editor) return;
      fn();
    }, [editor]);

    if (!mounted || !editor) {
      return (
        <div className="border border-gray-200 rounded-lg bg-white" style={{ minHeight }}>
          <div className="p-4 text-gray-400 text-sm">加载编辑器中...</div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
          {/* 标题 */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="一级标题 (Ctrl+1)"
            >H1</button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="二级标题 (Ctrl+2)"
            >H2</button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="三级标题 (Ctrl+3)"
            >H3</button>
          </div>

          {/* 文字样式 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="加粗 (Ctrl+B)"
            >B</button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
              className={`px-2 py-1 text-xs rounded underline ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="下划线 (Ctrl+U)"
            >U</button>
          </div>

          {/* 字体颜色 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
            <div className="relative group">
              <button type="button" className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1" title="字体颜色">
                <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: '#000' }} />
                <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:grid grid-cols-6 gap-1 z-50 w-[180px]">
                {['#000000', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#2563EB', '#7C3AED', '#0891B2', '#4B5563', '#9333EA', '#DB2777', '#059669', '#0D9488', '#4F46E5', '#A855F7', '#EC4899', '#F59E0B', '#84CC16'].map((c) => (
                  <button key={c} type="button" className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }} />
                ))}
              </div>
            </div>
            <div className="relative group">
              <button type="button" className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1" title="背景颜色">
                <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: '#FEF08A' }} />
                <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:grid grid-cols-6 gap-1 z-50 w-[180px]">
                {['#FEF08A', '#FECACA', '#FED7AA', '#FDE68A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#CFFAFE', '#FECDD3', '#D1FAE5', '#E0E7FF', '#FCE7F3', '#FEF3C7', '#ECFCCB', '#E5E7EB', '#FFFFFF'].map((c) => (
                  <button key={c} type="button" className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setHighlight({ color: c }).run(); }} />
                ))}
              </div>
            </div>
          </div>

          {/* 代码块 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
              className={`px-2 py-1 text-xs rounded font-mono ${editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="代码块"
            >{'</>'}</button>
          </div>

          {/* 插入代码（描述+代码） */}
          <div className="flex items-center gap-0.5 px-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); doInsertCode(''); }}
              className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 font-medium"
              title="插入代码（描述+代码块）"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              插入代码
            </button>
          </div>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
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