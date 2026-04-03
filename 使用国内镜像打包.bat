@echo off
chcp 65001 >nul
echo ========================================
echo   AI视频编辑器 - 使用国内镜像打包
echo ========================================
echo.

cd /d "%~dp0electron"

:: 设置国内镜像
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

echo [1/2] 构建Electron主进程...
call npx tsc
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)

echo.
echo [2/2] 打包应用程序（使用国内镜像）...
call node pack-offline.js

if %errorlevel% neq 0 (
    echo.
    echo 打包失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
pause
