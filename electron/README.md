# Electron桌面应用打包指南

## 快速开始

### 方式一：使用打包脚本（推荐）

**Windows用户**：
```bash
# 双击运行或在终端执行
build-electron.bat
```

**Linux/Mac用户**：
```bash
chmod +x build-electron.sh
./build-electron.sh
```

### 方式二：手动打包

```bash
# 1. 安装所有依赖
pnpm install

# 2. 构建前端和后端
pnpm --filter client build
pnpm --filter server build

# 3. 进入electron目录
cd electron

# 4. 安装electron依赖
pnpm install

# 5. 构建electron主进程
pnpm build

# 6. 打包成exe
pnpm dist
```

## 输出文件

打包完成后，在 `electron/release/` 目录下会生成：

- `AI视频编辑器 Setup 0.1.0.exe` - 安装程序
- `AI视频编辑器 0.1.0.exe` - 便携版（可选）

## 开发模式

如果想在开发模式下测试Electron：

```bash
# 终端1：启动后端
cd server && pnpm dev

# 终端2：启动前端
cd client && npx vite --port 3000 --host

# 终端3：启动Electron
cd electron && pnpm start
```

## 打包配置

### 修改应用图标

1. 准备一个 `.ico` 格式的图标文件（Windows）
2. 放到 `electron/assets/icon.ico`
3. 重新打包

### 修改应用名称和版本

编辑 `electron/package.json`：
```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "build": {
    "productName": "你的应用名称"
  }
}
```

### 打包配置说明

在 `electron/package.json` 的 `build` 字段中可以配置：

- `appId`: 应用唯一标识符
- `productName`: 应用显示名称
- `directories.output`: 输出目录
- `win.target`: Windows打包目标（nsis安装包、portable便携版等）
- `nsis`: NSIS安装程序配置

## 系统要求

### 开发环境
- Node.js >= 18
- pnpm >= 8
- TypeScript >= 5.0

### 打包后的应用
- Windows 10/11 (x64)
- 约500MB磁盘空间（包含Electron运行时）

## 常见问题

### 1. 打包失败：内存不足
解决方案：增加Node.js内存限制
```bash
set NODE_OPTIONS=--max-old-space-size=4096
pnpm dist
```

### 2. 杀毒软件误报
这是正常现象，因为应用未签名。解决方法：
- 添加到杀毒软件白名单
- 或者购买代码签名证书

### 3. 应用启动慢
首次启动需要解压资源，后续启动会更快。可以在打包时使用 `asar: false` 禁用压缩（但会增加体积）。

### 4. FFmpeg找不到
打包后的应用会自动包含FFmpeg路径。如果提示找不到：
- 确保FFmpeg已安装
- 或者在应用设置中手动指定FFmpeg路径

## 分发建议

### 安装包
- 适合普通用户
- 包含完整的安装向导
- 自动创建桌面快捷方式

### 便携版
- 适合高级用户
- 无需安装，直接运行
- 可以放在U盘随身携带

### 自动更新
如需自动更新功能，可以集成 `electron-updater`：
```bash
pnpm add electron-updater
```

## 进一步优化

### 减小体积
1. 启用代码压缩
2. 移除不必要的依赖
3. 使用webpack/vite打包优化

### 提升性能
1. 延迟加载非关键模块
2. 使用原生模块替代JS实现
3. 优化渲染进程内存使用

---

**打包完成后，可以在 `electron/release/` 目录找到安装包！**
