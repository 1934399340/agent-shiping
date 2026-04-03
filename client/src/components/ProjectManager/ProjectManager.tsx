import { useState, useEffect } from 'react';
import { Save, FolderOpen, Download, Trash2, Clock, X, FileVideo } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import type { Project } from '@/types';

const API_BASE = '/api';

interface ProjectMeta {
  id: string;
  name: string;
  filename: string;
  updatedAt: number;
  createdAt: number;
}

export function useProjectManager() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const project = useEditorStore((s) => s.project);
  
  // 保存到服务器
  const saveToServer = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/project/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (data.success) {
        alert('项目保存成功！');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
    setSaving(false);
  };
  
  // 保存到本地
  const saveToLocal = () => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 从本地加载
  const loadFromLocal = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string);
        useEditorStore.setState({ project });
        localStorage.setItem('ai-video-editor-project', JSON.stringify(project));
        alert('项目加载成功！');
      } catch {
        alert('加载失败: 文件格式无效');
      }
    };
    reader.readAsText(file);
  };
  
  // 自动保存到localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('ai-video-editor-project', JSON.stringify(project));
    }, 30000); // 每30秒自动保存
    
    return () => clearInterval(timer);
  }, [project]);
  
  // 恢复上次项目
  const restoreLastProject = () => {
    const saved = localStorage.getItem('ai-video-editor-project');
    if (saved) {
      try {
        const project = JSON.parse(saved);
        useEditorStore.setState({ project });
        return true;
      } catch {}
    }
    return false;
  };
  
  return {
    saving,
    loading,
    saveToServer,
    saveToLocal,
    loadFromLocal,
    restoreLastProject,
  };
}

export function ProjectListModal({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/project/list`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('加载项目列表失败:', err);
    }
    setLoading(false);
  };
  
  const loadProject = async (filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/project/load/${filename}`);
      const data = await res.json();
      if (data.project) {
        useEditorStore.setState({ project: data.project });
        localStorage.setItem('ai-video-editor-project', JSON.stringify(data.project));
        onClose();
        alert('项目加载成功！');
      }
    } catch {
      alert('加载失败');
    }
  };
  
  const deleteProject = async (filename: string) => {
    if (!confirm('确定删除此项目？')) return;
    
    try {
      await fetch(`${API_BASE}/project/delete/${filename}`, { method: 'DELETE' });
      setProjects(projects.filter((p) => p.filename !== filename));
    } catch {
      alert('删除失败');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-editor-panel rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-editor-border">
          <h2 className="text-lg font-semibold">打开项目</h2>
          <button onClick={onClose} className="p-1 hover:bg-editor-bg rounded">
            <X size={18} className="text-editor-muted" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-8 text-editor-muted">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-editor-muted">
              <FileVideo size={40} className="mx-auto mb-3 opacity-30" />
              <p>暂无保存的项目</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.filename}
                  className="flex items-center gap-3 p-3 bg-editor-bg rounded-lg hover:bg-editor-bg/80 cursor-pointer group"
                >
                  <FileVideo size={20} className="text-editor-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-editor-muted flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => loadProject(p.filename)}
                    className="px-3 py-1.5 bg-editor-accent/20 text-editor-accent rounded text-xs
                      hover:bg-editor-accent/30 transition-colors"
                  >
                    打开
                  </button>
                  <button
                    onClick={() => deleteProject(p.filename)}
                    className="p-1.5 text-editor-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
