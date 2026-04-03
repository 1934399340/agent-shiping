// ============================================
// 转场效果选择器 - 50+种转场效果
// ============================================
import { useState } from 'react';
import type { TransitionType } from '../../../../shared/types';

interface TransitionPreset {
  type: TransitionType;
  name: string;
  nameCn: string;
  category: string;
  icon: string;
  defaultDuration: number;
  description?: string;
}

// 完整的转场预设库
const PRESETS: TransitionPreset[] = [
  // ========== 基础转场 ==========
  { type: 'fade', name: 'Fade', nameCn: '淡入淡出', category: 'basic', icon: '🌅', defaultDuration: 0.5, description: '经典淡入淡出' },
  { type: 'dissolve', name: 'Dissolve', nameCn: '溶解', category: 'basic', icon: '💫', defaultDuration: 0.5, description: '柔和溶解过渡' },
  { type: 'cross-fade', name: 'Cross Fade', nameCn: '交叉淡化', category: 'basic', icon: '🔄', defaultDuration: 0.6, description: '平滑交叉过渡' },
  { type: 'flash', name: 'Flash', nameCn: '闪光', category: 'basic', icon: '⚡', defaultDuration: 0.2, description: '闪光切换' },

  // ========== 滑动转场 ==========
  { type: 'slide-left', name: 'Slide Left', nameCn: '左滑', category: 'slide', icon: '⬅️', defaultDuration: 0.4 },
  { type: 'slide-right', name: 'Slide Right', nameCn: '右滑', category: 'slide', icon: '➡️', defaultDuration: 0.4 },
  { type: 'slide-up', name: 'Slide Up', nameCn: '上滑', category: 'slide', icon: '⬆️', defaultDuration: 0.4 },
  { type: 'slide-down', name: 'Slide Down', nameCn: '下滑', category: 'slide', icon: '⬇️', defaultDuration: 0.4 },
  { type: 'slide-diagonal-tl', name: 'Diagonal TL', nameCn: '对角左上', category: 'slide', icon: '↖️', defaultDuration: 0.5 },
  { type: 'slide-diagonal-tr', name: 'Diagonal TR', nameCn: '对角右上', category: 'slide', icon: '↗️', defaultDuration: 0.5 },
  { type: 'slide-diagonal-bl', name: 'Diagonal BL', nameCn: '对角左下', category: 'slide', icon: '↙️', defaultDuration: 0.5 },
  { type: 'slide-diagonal-br', name: 'Diagonal BR', nameCn: '对角右下', category: 'slide', icon: '↘️', defaultDuration: 0.5 },

  // ========== 缩放转场 ==========
  { type: 'zoom-in', name: 'Zoom In', nameCn: '放大进入', category: 'zoom', icon: '🔍', defaultDuration: 0.5, description: '从小到大' },
  { type: 'zoom-out', name: 'Zoom Out', nameCn: '缩小退出', category: 'zoom', icon: '🔎', defaultDuration: 0.5, description: '从大到小' },
  { type: 'zoom-rotate-in', name: 'Zoom Rotate In', nameCn: '旋转放大', category: 'zoom', icon: '🌀', defaultDuration: 0.6, description: '旋转+放大' },
  { type: 'zoom-rotate-out', name: 'Zoom Rotate Out', nameCn: '旋转缩小', category: 'zoom', icon: '🔅', defaultDuration: 0.6, description: '旋转+缩小' },
  { type: 'zoom-bounce', name: 'Zoom Bounce', nameCn: '弹跳缩放', category: 'zoom', icon: '🎾', defaultDuration: 0.7, description: '弹性缩放' },

  // ========== 擦除转场 ==========
  { type: 'wipe-left', name: 'Wipe Left', nameCn: '左擦除', category: 'wipe', icon: '🧹', defaultDuration: 0.4 },
  { type: 'wipe-right', name: 'Wipe Right', nameCn: '右擦除', category: 'wipe', icon: '🧹', defaultDuration: 0.4 },
  { type: 'wipe-up', name: 'Wipe Up', nameCn: '上擦除', category: 'wipe', icon: '⬆️', defaultDuration: 0.4 },
  { type: 'wipe-down', name: 'Wipe Down', nameCn: '下擦除', category: 'wipe', icon: '⬇️', defaultDuration: 0.4 },
  { type: 'wipe-diagonal', name: 'Wipe Diagonal', nameCn: '对角擦除', category: 'wipe', icon: '📐', defaultDuration: 0.5 },
  { type: 'wipe-radial', name: 'Wipe Radial', nameCn: '径向擦除', category: 'wipe', icon: '🎯', defaultDuration: 0.5, description: '从中心扩散' },
  { type: 'wipe-clock', name: 'Wipe Clock', nameCn: '时钟擦除', category: 'wipe', icon: '🕐', defaultDuration: 0.6, description: '顺时针擦除' },

  // ========== 推拉转场 ==========
  { type: 'push-left', name: 'Push Left', nameCn: '左推', category: 'push', icon: '👈', defaultDuration: 0.5, description: '左侧推入' },
  { type: 'push-right', name: 'Push Right', nameCn: '右推', category: 'push', icon: '👉', defaultDuration: 0.5, description: '右侧推入' },
  { type: 'push-up', name: 'Push Up', nameCn: '上推', category: 'push', icon: '👆', defaultDuration: 0.5, description: '上方推入' },
  { type: 'push-down', name: 'Push Down', nameCn: '下推', category: 'push', icon: '👇', defaultDuration: 0.5, description: '下方推入' },

  // ========== 遮罩转场 ==========
  { type: 'iris-in', name: 'Iris In', nameCn: '圆形展开', category: 'mask', icon: '⭕', defaultDuration: 0.5, description: '从中心圆形展开' },
  { type: 'iris-out', name: 'Iris Out', nameCn: '圆形收缩', category: 'mask', icon: '⭕', defaultDuration: 0.5, description: '向中心圆形收缩' },
  { type: 'iris-star', name: 'Iris Star', nameCn: '星形遮罩', category: 'mask', icon: '⭐', defaultDuration: 0.6, description: '星形展开过渡' },
  { type: 'iris-heart', name: 'Iris Heart', nameCn: '心形遮罩', category: 'mask', icon: '❤️', defaultDuration: 0.6, description: '心形展开过渡' },
  { type: 'circle-crop', name: 'Circle Crop', nameCn: '圆形裁切', category: 'mask', icon: '🔵', defaultDuration: 0.5 },
  { type: 'square-crop', name: 'Square Crop', nameCn: '方形裁切', category: 'mask', icon: '🟦', defaultDuration: 0.5 },

  // ========== 模糊转场 ==========
  { type: 'blur', name: 'Blur', nameCn: '模糊过渡', category: 'blur', icon: '🌫️', defaultDuration: 0.6, description: '高斯模糊过渡' },
  { type: 'blur-zoom', name: 'Blur Zoom', nameCn: '模糊缩放', category: 'blur', icon: '🌀', defaultDuration: 0.6, description: '模糊+缩放' },
  { type: 'blur-spin', name: 'Blur Spin', nameCn: '模糊旋转', category: 'blur', icon: '🌪️', defaultDuration: 0.7, description: '模糊+旋转' },
  { type: 'pixelate', name: 'Pixelate', nameCn: '像素化', category: 'blur', icon: '🎮', defaultDuration: 0.5, description: '像素化过渡' },
  { type: 'pixel-blur', name: 'Pixel Blur', nameCn: '像素模糊', category: 'blur', icon: '📺', defaultDuration: 0.6, description: '像素风格模糊' },

  // ========== 特效转场 ==========
  { type: 'glitch', name: 'Glitch', nameCn: '故障效果', category: 'effect', icon: '⚡', defaultDuration: 0.3, description: '数字故障' },
  { type: 'glitch-digital', name: 'Glitch Digital', nameCn: '数字故障', category: 'effect', icon: '📺', defaultDuration: 0.4, description: '数字信号干扰' },
  { type: 'glitch-vhs', name: 'Glitch VHS', nameCn: 'VHS故障', category: 'effect', icon: '📼', defaultDuration: 0.5, description: '复古录像带效果' },
  { type: 'color-shift', name: 'Color Shift', nameCn: '色彩渐变', category: 'effect', icon: '🌈', defaultDuration: 0.6, description: 'RGB颜色偏移' },
  { type: 'invert-flash', name: 'Invert Flash', nameCn: '反色闪光', category: 'effect', icon: '💡', defaultDuration: 0.2, description: '反色闪烁切换' },
  { type: 'whip-pan', name: 'Whip Pan', nameCn: '甩镜头', category: 'effect', icon: '🎥', defaultDuration: 0.3, description: '快速甩动镜头' },
  { type: 'shake', name: 'Shake', nameCn: '震动', category: 'effect', icon: '📳', defaultDuration: 0.3, description: '画面震动切换' },

  // ========== 3D转场 ==========
  { type: 'flip-x', name: 'Flip X', nameCn: '水平翻转', category: '3d', icon: '↔️', defaultDuration: 0.6, description: '水平3D翻转' },
  { type: 'flip-y', name: 'Flip Y', nameCn: '垂直翻转', category: '3d', icon: '↕️', defaultDuration: 0.6, description: '垂直3D翻转' },
  { type: 'rotate-3d-left', name: 'Rotate 3D Left', nameCn: '3D左旋', category: '3d', icon: '🔄', defaultDuration: 0.7, description: '3D空间左旋转' },
  { type: 'rotate-3d-right', name: 'Rotate 3D Right', nameCn: '3D右旋', category: '3d', icon: '🔃', defaultDuration: 0.7, description: '3D空间右旋转' },
  { type: 'cube-left', name: 'Cube Left', nameCn: '立方体左', category: '3d', icon: '🎲', defaultDuration: 0.6, description: '立方体左旋转' },
  { type: 'cube-right', name: 'Cube Right', nameCn: '立方体右', category: '3d', icon: '🎲', defaultDuration: 0.6, description: '立方体右旋转' },
  { type: 'door-left', name: 'Door Left', nameCn: '开门左', category: '3d', icon: '🚪', defaultDuration: 0.6, description: '左侧开门效果' },
  { type: 'door-right', name: 'Door Right', nameCn: '开门右', category: '3d', icon: '🚪', defaultDuration: 0.6, description: '右侧开门效果' },

  // ========== 创意转场 ==========
  { type: 'spin', name: 'Spin', nameCn: '旋转', category: 'creative', icon: '💫', defaultDuration: 0.5, description: '简单旋转' },
  { type: 'spiral', name: 'Spiral', nameCn: '螺旋', category: 'creative', icon: '🌀', defaultDuration: 0.7, description: '螺旋旋转过渡' },
  { type: 'bounce', name: 'Bounce', nameCn: '弹跳', category: 'creative', icon: '⬆️', defaultDuration: 0.6, description: '弹跳进入' },
  { type: 'elastic', name: 'Elastic', nameCn: '弹性', category: 'creative', icon: '🎈', defaultDuration: 0.7, description: '弹性变形' },
  { type: 'split-h', name: 'Split H', nameCn: '水平分裂', category: 'creative', icon: '↔️', defaultDuration: 0.5, description: '左右分裂' },
  { type: 'split-v', name: 'Split V', nameCn: '垂直分裂', category: 'creative', icon: '↕️', defaultDuration: 0.5, description: '上下分裂' },
  { type: 'slice-h', name: 'Slice H', nameCn: '水平切片', category: 'creative', icon: '🥓', defaultDuration: 0.5, description: '水平切片切换' },
  { type: 'slice-v', name: 'Slice V', nameCn: '垂直切片', category: 'creative', icon: '🥓', defaultDuration: 0.5, description: '垂直切片切换' },
  { type: 'curtain', name: 'Curtain', nameCn: '幕布', category: 'creative', icon: '🎭', defaultDuration: 0.6, description: '幕布揭开效果' },
  { type: 'shatter', name: 'Shatter', nameCn: '破碎', category: 'creative', icon: '💔', defaultDuration: 0.5, description: '画面破碎' },
  { type: 'ripple', name: 'Ripple', nameCn: '涟漪', category: 'creative', icon: '💧', defaultDuration: 0.6, description: '水波涟漪' },
  { type: 'wave', name: 'Wave', nameCn: '波浪', category: 'creative', icon: '🌊', defaultDuration: 0.6, description: '波浪过渡' },
  { type: 'luma-fade', name: 'Luma Fade', nameCn: '亮度淡化', category: 'creative', icon: '🌙', defaultDuration: 0.5, description: '基于亮度的过渡' },
];

const CATEGORIES = [
  { key: 'all', label: '全部', count: PRESETS.length },
  { key: 'basic', label: '基础', count: PRESETS.filter(p => p.category === 'basic').length },
  { key: 'slide', label: '滑动', count: PRESETS.filter(p => p.category === 'slide').length },
  { key: 'zoom', label: '缩放', count: PRESETS.filter(p => p.category === 'zoom').length },
  { key: 'wipe', label: '擦除', count: PRESETS.filter(p => p.category === 'wipe').length },
  { key: 'push', label: '推拉', count: PRESETS.filter(p => p.category === 'push').length },
  { key: 'mask', label: '遮罩', count: PRESETS.filter(p => p.category === 'mask').length },
  { key: 'blur', label: '模糊', count: PRESETS.filter(p => p.category === 'blur').length },
  { key: 'effect', label: '特效', count: PRESETS.filter(p => p.category === 'effect').length },
  { key: '3d', label: '3D', count: PRESETS.filter(p => p.category === '3d').length },
  { key: 'creative', label: '创意', count: PRESETS.filter(p => p.category === 'creative').length },
];

export default function TransitionSelector() {
  const [selected, setSelected] = useState<TransitionType | null>(null);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = PRESETS.filter((p) => {
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSearch = !searchQuery || 
      p.nameCn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
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
          placeholder="搜索转场效果..."
          className="w-full px-2 py-1.5 bg-editor-bg border border-editor-border rounded-md text-xs
            focus:outline-none focus:border-editor-accent"
        />
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-1 flex-wrap p-2 border-b border-editor-border">
        {CATEGORIES.map((c) => (
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

      {/* 转场网格 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((preset) => (
            <button
              key={preset.type}
              onClick={() => setSelected(preset.type === selected ? null : preset.type)}
              className={`transition-preset flex flex-col items-center p-2 rounded-lg border transition-all ${
                selected === preset.type
                  ? 'border-editor-accent bg-editor-accent/20 shadow-sm'
                  : 'border-editor-border bg-editor-bg hover:border-editor-accent/50 hover:bg-editor-panel'
              }`}
              title={preset.description}
            >
              <span className="text-base mb-0.5">{preset.icon}</span>
              <span className="text-[9px] text-center leading-tight font-medium">
                {preset.nameCn}
              </span>
              <span className="text-[8px] text-editor-muted mt-0.5">{preset.defaultDuration}s</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-editor-muted text-xs">
            没有找到匹配的转场效果
          </div>
        )}
      </div>

      {/* 选中提示 */}
      {selected && (
        <div className="p-2 border-t border-editor-border bg-editor-accent/5">
          <div className="text-xs">
            <span className="text-editor-muted">已选择: </span>
            <span className="text-editor-accent font-medium">
              {PRESETS.find(p => p.type === selected)?.nameCn}
            </span>
          </div>
          <p className="text-[10px] text-editor-muted mt-0.5">
            {PRESETS.find(p => p.type === selected)?.description}
          </p>
        </div>
      )}
    </div>
  );
}

// 导出预设供其他组件使用
export { PRESETS };
export type { TransitionPreset };
