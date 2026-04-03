// ============================================
// 项目管理服务
// 项目保存、加载、自动保存、崩溃恢复
// ============================================

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface Project {
  id: string;
  name: string;
  tracks: any[];
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  createdAt: number;
  updatedAt: number;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
}

export class ProjectManager extends EventEmitter {
  private projectsDir: string = '';
  private autoSaveDir: string = '';
  private projects: Map<string, Project> = new Map();
  private currentProject: Project | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.projectsDir = path.join(userDataPath, 'projects');
    this.autoSaveDir = path.join(userDataPath, 'autosave');

    await Promise.all([
      fs.mkdir(this.projectsDir, { recursive: true }),
      fs.mkdir(this.autoSaveDir, { recursive: true }),
    ]);

    await this.loadProjectsIndex();
    await this.checkCrashRecovery();
    this.initialized = true;
    console.log('💾 项目管理器已初始化');
  }

  private async loadProjectsIndex(): Promise<void> {
    try {
      const files = await fs.readdir(this.projectsDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(this.projectsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const project: Project = JSON.parse(data);
          this.projects.set(project.id, project);
        } catch {}
      }
      
      console.log(`📂 已加载 ${this.projects.size} 个项目`);
    } catch {}
  }

  private async checkCrashRecovery(): Promise<void> {
    try {
      const files = await fs.readdir(this.autoSaveDir);
      const autoSaveFiles = files.filter(f => f.startsWith('autosave_') && f.endsWith('.json'));
      
      if (autoSaveFiles.length > 0) {
        console.log(`⚠️ 发现 ${autoSaveFiles.length} 个自动保存文件，可能需要恢复`);
      }
    } catch {}
  }

  async save(project: Project): Promise<{ success: boolean; path: string }> {
    const filePath = path.join(this.projectsDir, `${project.id}.json`);
    
    project.updatedAt = Date.now();
    
    await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
    
    this.projects.set(project.id, project);
    this.currentProject = project;
    
    return { success: true, path: filePath };
  }

  async load(projectId: string): Promise<Project | null> {
    const filePath = path.join(this.projectsDir, `${projectId}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const project: Project = JSON.parse(data);
      
      this.projects.set(project.id, project);
      this.currentProject = project;
      
      this.startAutoSave(project);
      
      return project;
    } catch {
      return null;
    }
  }

  async list(): Promise<Array<{
    id: string;
    name: string;
    updatedAt: number;
    createdAt: number;
    duration: number;
  }>> {
    const list = [];
    
    for (const project of this.projects.values()) {
      list.push({
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
        duration: project.duration,
      });
    }
    
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(projectId: string): Promise<boolean> {
    const filePath = path.join(this.projectsDir, `${projectId}.json`);
    
    try {
      await fs.unlink(filePath);
      this.projects.delete(projectId);
      
      if (this.currentProject?.id === projectId) {
        this.currentProject = null;
        this.stopAutoSave();
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async exportToFile(project: Project, filePath: string): Promise<boolean> {
    try {
      await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  async importFromFile(filePath: string): Promise<Project | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const project: Project = JSON.parse(data);
      
      project.id = crypto.randomUUID();
      project.createdAt = Date.now();
      project.updatedAt = Date.now();
      
      await this.save(project);
      
      return project;
    } catch {
      return null;
    }
  }

  private startAutoSave(project: Project): void {
    this.stopAutoSave();
    
    const interval = project.autoSaveInterval || 60000;
    
    if (project.autoSaveEnabled !== false) {
      this.autoSaveTimer = setInterval(async () => {
        if (this.currentProject) {
          await this.autoSave(this.currentProject);
        }
      }, interval);
    }
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private async autoSave(project: Project): Promise<void> {
    const fileName = `autosave_${project.id}_${Date.now()}.json`;
    const filePath = path.join(this.autoSaveDir, fileName);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
      this.emit('auto-saved', project.id);
      
      await this.cleanOldAutoSaves(project.id);
    } catch (err) {
      console.error('自动保存失败:', err);
    }
  }

  private async cleanOldAutoSaves(projectId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.autoSaveDir);
      const projectAutoSaves = files
        .filter(f => f.startsWith(`autosave_${projectId}_`))
        .sort()
        .reverse();
      
      for (let i = 5; i < projectAutoSaves.length; i++) {
        await fs.unlink(path.join(this.autoSaveDir, projectAutoSaves[i]));
      }
    } catch {}
  }

  async saveCurrentProject(): Promise<void> {
    if (this.currentProject) {
      await this.save(this.currentProject);
    }
    this.stopAutoSave();
  }

  async getAutoSaveFiles(): Promise<Array<{
    projectId: string;
    timestamp: number;
    path: string;
  }>> {
    try {
      const files = await fs.readdir(this.autoSaveDir);
      const result = [];
      
      for (const file of files) {
        if (!file.startsWith('autosave_') || !file.endsWith('.json')) continue;
        
        const match = file.match(/autosave_([^_]+)_(\d+)\.json/);
        if (match) {
          result.push({
            projectId: match[1],
            timestamp: parseInt(match[2]),
            path: path.join(this.autoSaveDir, file),
          });
        }
      }
      
      return result.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  async recoverFromAutoSave(filePath: string): Promise<Project | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const project: Project = JSON.parse(data);
      
      project.id = crypto.randomUUID();
      project.updatedAt = Date.now();
      
      await this.save(project);
      
      return project;
    } catch {
      return null;
    }
  }

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  setCurrentProject(project: Project): void {
    this.currentProject = project;
    this.startAutoSave(project);
  }
}
