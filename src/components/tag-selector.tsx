'use client';

import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  customTags: string[];
  onCustomTagsChange: (tags: string[]) => void;
  colorClass?: string;
  label: string;
}

export function TagSelector({
  options,
  selected,
  onChange,
  customTags,
  onCustomTagsChange,
  colorClass = 'bg-violet-100 text-violet-700 hover:bg-violet-200',
  label,
}: TagSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const allOptions = [...options, ...customTags];

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customInput.trim();
    if (trimmed && !allOptions.includes(trimmed)) {
      onCustomTagsChange([...customTags, trimmed]);
      onChange([...selected, trimmed]);
      setCustomInput('');
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground"
          onClick={() => setShowCustom(!showCustom)}
        >
          <Plus className="h-3 w-3 mr-1" />
          自定义
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((tag) => {
          const isSelected = selected.includes(tag);
          const isCustom = customTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant="outline"
              className={cn(
                'cursor-pointer transition-all duration-150 text-sm py-1 px-3 border-0',
                isSelected
                  ? colorClass
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
              onClick={() => toggle(tag)}
            >
              {isSelected && <span className="mr-1">&#10003;</span>}
              {tag}
              {isCustom && (
                <X
                  className="h-3 w-3 ml-1 opacity-60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomTagsChange(customTags.filter((t) => t !== tag));
                    onChange(selected.filter((t) => t !== tag));
                  }}
                />
              )}
            </Badge>
          );
        })}
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="输入自定义标签"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTag();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={addCustomTag}
          >
            添加
          </Button>
        </div>
      )}
    </div>
  );
}
