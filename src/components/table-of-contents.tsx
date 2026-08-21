'use client';

import { useEffect, useState, useCallback } from 'react';
import { ListTree, Hash, ChevronLeft } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string; // HTML content from the editor
  onHeadingClick?: (id: string) => void;
  onClose?: () => void;
}

export function TableOfContents({ content, onHeadingClick, onClose }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from HTML content
  useEffect(() => {
    if (!content) {
      setItems([]);
      return;
    }

    // Parse HTML to extract headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    
    const tocItems: TocItem[] = [];
    headings.forEach((h, index) => {
      const text = h.textContent?.trim() || '';
      if (!text) return;
      
      const level = parseInt(h.tagName.substring(1), 10);
      const id = `toc-heading-${index}-${text.slice(0, 20).replace(/\s+/g, '-')}`;
      h.setAttribute('id', id);
      tocItems.push({ id, text, level });
    });

    setItems(tocItems);
  }, [content]);

  // Track active heading based on scroll position
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px', threshold: 0 }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      onHeadingClick?.(id);
    }
  }, [onHeadingClick]);

  if (items.length === 0) return null;

  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 px-3 py-2 mb-1">
        <ListTree className="h-3.5 w-3.5 text-[#6B8BA4]" />
        <span className="text-xs font-medium text-[#4A5568] flex-1">目录</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-gray-100 text-[#94a3b8] hover:text-[#475569] transition-colors"
            title="收起"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <nav className="space-y-0.5 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors
              ${activeId === item.id
                ? 'bg-[#6B8BA4]/10 text-[#2D3748] font-medium'
                : 'text-[#718096] hover:text-[#2D3748] hover:bg-gray-50'
              }
              ${item.level === 1 ? 'pl-2' : item.level === 2 ? 'pl-5' : 'pl-8'}
            `}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.level === 1 && <Hash className="h-3 w-3 shrink-0 text-[#6B8BA4]" />}
              <span className="truncate">{item.text}</span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}