@echo off
chcp 65001 >nul
echo ========================================
echo   AI视频编辑器 - 简化打包
echo ========================================
echo.

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
:: 使用electron-packager打包
call npx electron-packager . "AI视频编辑器" ^
  --platform=win32 ^
  --arch=x64 ^
  --out=release ^
  --overwrite ^
  --asar=false ^
  --ignore="node_modules" ^
  --ignore="release" ^
  --ignore="src" ^
  --ignore="*.ts" ^
  --ignore="tsconfig.json"

if %errorlevel% neq 0 (
    echo.
    echo 打包失败！错误代码: %errorlevel%
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
