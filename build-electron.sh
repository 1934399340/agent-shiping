#!/bin/bash

# AI视频编辑器 - Electron打包脚本

echo "🚀 开始打包AI视频编辑器桌面应用..."

# 1. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 2. 构建前端和后端
echo "🔨 构建前端和后端..."
pnpm --filter client build
pnpm --filter server build

# 3. 安装Electron依赖
echo "⚡ 安装Electron依赖..."
cd electron
pnpm install

# 4. 构建Electron主进程
echo "🏗️ 构建Electron主进程..."
pnpm build

# 5. 打包成exe
echo "🎁 打包成exe文件..."
pnpm dist

echo "✅ 打包完成！"
echo "📁 输出目录：electron/release/"
