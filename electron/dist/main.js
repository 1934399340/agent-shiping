"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
let mainWindow = null;
let serverProcess = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        title: 'AI视频编辑器',
        show: false,
    });
    // 开发环境加载本地服务器
    // 生产环境加载打包后的文件
    const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产环境加载本地打包的HTML文件
        const indexPath = path.join(__dirname, '../app/index.html');
        mainWindow.loadFile(indexPath);
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// 选择文件对话框
electron_1.ipcMain.handle('select-file', async (event, options) => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: options?.filters || [
            { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
            { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
            { name: '音频文件', extensions: ['mp3', 'wav', 'aac', 'ogg', 'm4a'] },
            { name: '所有文件', extensions: ['*'] },
        ],
    });
    return result.filePaths;
});
// 选择文件夹对话框
electron_1.ipcMain.handle('select-folder', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    return result.filePaths;
});
// 保存文件对话框
electron_1.ipcMain.handle('save-file', async (event, defaultName) => {
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: [
            { name: '视频文件', extensions: ['mp4', 'mov', 'webm'] },
        ],
    });
    return result.filePath;
});
// 应用生命周期
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
