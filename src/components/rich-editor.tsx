'use client';

import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';

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
    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Heading.configure({ levels: [1, 2, 3] }),
        BulletList,
        OrderedList,
        ListItem,
        Blockquote,
        Code,
        CodeBlock,
        HorizontalRule,
        HardBreak,
        History,
        Dropcursor,
        Gapcursor,
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
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

    useImperativeHandle(ref, () => ({
      insertCode(code: string, language = 'cpp') {
        if (!editor) return;
        editor.chain().focus().setCodeBlock({ language }).insertContent(code).run();
      },
    }), [editor]);

    const setColor = useCallback((color: string) => {
      editor?.chain().focus().setColor(color).run();
    }, [editor]);

    const setHighlight = useCallback((color: string) => {
      editor?.chain().focus().setHighlight({ color }).run();
    }, [editor]);

    if (!editor) return null;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
          {/* 标题 */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="一级标题"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="二级标题"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="三级标题"
            >
              H3
            </button>
          </div>

          {/* 文字样式 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="加粗"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1 text-xs rounded underline ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="下划线"
            >
              U
            </button>
          </div>

          {/* 字体颜色 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
            <div className="relative group">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                title="字体颜色"
              >
                <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: '#000' }} />
                <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:grid grid-cols-6 gap-1 z-50 w-[180px]">
                {['#000000', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#2563EB', '#7C3AED', '#0891B2', '#4B5563', '#9333EA', '#DB2777', '#059669', '#0D9488', '#4F46E5', '#A855F7', '#EC4899', '#F59E0B', '#84CC16'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                title="背景颜色"
              >
                <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: '#FEF08A' }} />
                <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:grid grid-cols-6 gap-1 z-50 w-[180px]">
                {['#FEF08A', '#FECACA', '#FED7AA', '#FDE68A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#CFFAFE', '#FECDD3', '#D1FAE5', '#E0E7FF', '#FCE7F3', '#FEF3C7', '#ECFCCB', '#E5E7EB', '#FFFFFF'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setHighlight(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 代码块 */}
          <div className="flex items-center gap-0.5 px-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`px-2 py-1 text-xs rounded font-mono ${editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="代码块"
            >
              {'</>'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    );
  }
);