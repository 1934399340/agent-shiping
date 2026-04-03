// ============================================
// Electron 服务导出
// ============================================

export { LocalAssetManager } from './LocalAssetManager.js';
export { RenderQueue } from './RenderQueue.js';
export { ProjectManager } from './ProjectManager.js';
export { CacheManager } from './CacheManager.js';
export { FFmpegService } from './FFmpegService.js';
export { 
  applyTransition, 
  applyTransitionsBetweenClips,
  getTransitionList,
  type TransitionType,
  type TransitionOptions,
  type TransitionContext,
} from './TransitionProcessor.js';
