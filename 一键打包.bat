@echo off
chcp 65001 >nul
echo ========================================
echo   AI视频编辑器 - 一键打包工具
echo ========================================
echo.

REM 设置Node内存限制
set NODE_OPTIONS=--max-old-space-size=4096

echo [1/5] 检查并安装依赖...
cd /d "%~dp0"
call pnpm install
if %errorlevel% neq 0 (
    echo 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)

echo.
echo [2/5] 构建前端应用...
cd client
call pnpm build
if %errorlevel% neq 0 (
    echo 前端构建失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [3/5] 构建后端服务...
cd server
call pnpm build
if %errorlevel% neq 0 (
    echo 后端构建失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [4/5] 构建Electron主进程...
cd electron
call pnpm build
if %errorlevel% neq 0 (
    echo Electron构建失败！
    pause
    exit /b 1
)

echo.
echo [5/5] 打包成exe文件...
call pnpm exec electron-packager . "AI视频编辑器" --platform=win32 --arch=x64 --out=release-final --overwrite --asar=false --ignore="node_modules" --ignore="release" --ignore="release-build" --ignore="release-final"
if %errorlevel% neq 0 (
    echo 打包失败！尝试使用备用方案...
    call pnpm add -D @electron/packager
    call pnpm exec @electron/packager . "AI视频编辑器" --platform=win32 --arch=x64 --out=release-final --overwrite
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出目录：electron\release-final\
echo.

REM 打开输出目录
if exist "release-final\AI视频编辑器-win32-x64" (
    echo 正在打开输出目录...
    start "" "release-final\AI视频编辑器-win32-x64"
) else (
    echo 请检查 electron\release-final\ 目录
)

echo.
pause
