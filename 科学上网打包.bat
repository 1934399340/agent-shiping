@echo off
chcp 65001 >nul
echo ========================================
echo   AI视频编辑器 - 科学上网打包
echo ========================================
echo.
echo 请确保已经开启科学上网工具（Clash/V2Ray等）
echo.
pause

cd /d "%~dp0electron"

echo [1/2] 构建Electron主进程...
call npx tsc
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)

echo.
echo [2/2] 打包应用程序...
echo 正在从GitHub下载Electron，请确保科学上网已开启...
echo.

call node pack.js

if %errorlevel% neq 0 (
    echo.
    echo 打包失败！可能原因：
    echo  1. 科学上网未开启或不稳定
    echo  2. 网络连接问题
    echo.
    echo 请尝试：
    echo  - 检查科学上网工具是否正常工作
    echo  - 使用手动复制打包.bat（无需下载）
    pause
    exit /b 1
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出目录: electron\release\AI视频编辑器-win32-x64\
echo 可执行文件: AI视频编辑器.exe
echo.

:: 打开输出目录
if exist "release\AI视频编辑器-win32-x64" (
    start "" "release\AI视频编辑器-win32-x64"
)

pause
