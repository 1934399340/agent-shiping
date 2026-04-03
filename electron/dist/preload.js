"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 暴露安全的API给渲染进程
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: (options) => electron_1.ipcRenderer.invoke('select-file', options),
    selectFolder: () => electron_1.ipcRenderer.invoke('select-folder'),
    saveFile: (defaultName) => electron_1.ipcRenderer.invoke('save-file', defaultName),
});
