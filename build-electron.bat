@echo off
REM AI视频编辑器 - Electron打包脚本 (Windows)

echo ========================================
echo   AI视频编辑器 - 桌面应用打包
echo ========================================
echo.

REM 设置Node内存限制
set NODE_OPTIONS=--max-old-space-size=4096

REM 1. 安装依赖
echo [1/6] 安装项目依赖...
call pnpm install

REM 2. 构建前端
echo [2/6] 构建前端应用...
cd client
call pnpm build
if %errorlevel% neq 0 (
    echo 前端构建失败！
    pause
    exit /b 1
)
cd ..

REM 3. 构建后端
echo [3/6] 构建后端服务...
cd server
call pnpm build
if %errorlevel% neq 0 (
    echo 后端构建失败！
    pause
    exit /b 1
)
cd ..

REM 4. 安装Electron依赖
echo [4/6] 安装Electron依赖...
cd electron
call pnpm install

REM 5. 构建Electron主进程
echo [5/6] 构建Electron主进程...
call pnpm build
if %errorlevel% neq 0 (
    echo Electron构建失败！
    pause
    exit /b 1
)

REM 6. 打包成exe
echo [6/6] 打包成exe文件...
call pnpm dist

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出文件：
echo   - release\AI视频编辑器-0.1.0-x64.exe (安装版)
echo   - release\AI视频编辑器-Portable-0.1.0.exe (便携版)
echo.
pause
