// ============================================
// 滤镜选择器组件
// ============================================
import { useState } from 'react';
import { FILTER_PRESETS, FILTER_CATEGORIES, type FilterPreset } from './filterPresets';

interface FilterSelectorProps {
  selectedFilters: string[];
  onToggleFilter: (filterId: string) => void;
}

export default function FilterSelector({ selectedFilters, onToggleFilter }: FilterSelectorProps) {
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = FILTER_PRESETS.filter((f) => {
    const matchesCategory = category === 'all' || f.category === category;
    const matchesSearch = !searchQuery ||
      f.nameCn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="p-2 border-b border-editor-border">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索滤镜效果..."
          className="w-full px-2 py-1.5 bg-editor-bg border border-editor-border rounded-md text-xs
            focus:outline-none focus:border-editor-accent"
        />
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-1 flex-wrap p-2 border-b border-editor-border">
        {FILTER_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              category === c.key
                ? 'bg-editor-accent text-white'
                : 'text-editor-muted hover:text-editor-text hover:bg-editor-bg'
            }`}
          >
            {c.label}({c.count})
          </button>
        ))}
      </div>

      {/* 滤镜网格 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((filter) => (
            <FilterCard
              key={filter.id}
              filter={filter}
              isSelected={selectedFilters.includes(filter.id)}
              onToggle={() => onToggleFilter(filter.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-editor-muted text-xs">
            没有找到匹配的滤镜效果
          </div>
        )}
      </div>

      {/* 已选滤镜 */}
      {selectedFilters.length > 0 && (
        <div className="p-2 border-t border-editor-border bg-editor-accent/5">
          <div className="text-xs mb-1">
            <span className="text-editor-muted">已选择: </span>
            <span className="text-editor-accent font-medium">{selectedFilters.length}</span>
            <span className="text-editor-muted"> 个滤镜</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedFilters.slice(0, 5).map((id) => {
              const filter = FILTER_PRESETS.find(f => f.id === id);
              return filter ? (
                <span key={id} className="px-1.5 py-0.5 bg-editor-accent/20 text-editor-accent text-[10px] rounded">
                  {filter.icon} {filter.nameCn}
                </span>
              ) : null;
            })}
            {selectedFilters.length > 5 && (
              <span className="text-[10px] text-editor-muted">+{selectedFilters.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 滤镜卡片
function FilterCard({
  filter,
  isSelected,
  onToggle,
}: {
  filter: FilterPreset;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center p-2 rounded-lg border transition-all ${
        isSelected
          ? 'border-editor-accent bg-editor-accent/20 shadow-sm'
          : 'border-editor-border bg-editor-bg hover:border-editor-accent/50 hover:bg-editor-panel'
      }`}
      title={filter.description}
    >
      {/* 选中指示器 */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-editor-accent rounded-full flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <span className="text-base mb-0.5">{filter.icon}</span>
      <span className="text-[9px] text-center leading-tight font-medium">
        {filter.nameCn}
      </span>
    </button>
  );
}

// 导出供其他组件使用
export { FILTER_PRESETS, FILTER_CATEGORIES };
export type { FilterPreset };
