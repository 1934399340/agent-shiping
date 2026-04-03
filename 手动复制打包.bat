@echo off
chcp 65001 >nul
echo ========================================
echo   AI视频编辑器 - 手动复制打包
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 构建前端...
cd client
call pnpm build
cd ..

echo.
echo [2/4] 构建后端...
cd server
call pnpm build
cd ..

echo.
echo [3/4] 构建Electron主进程...
cd electron
call npx tsc
cd ..

echo.
echo [4/4] 复制文件创建exe...

:: 创建输出目录
set "OUTPUT_DIR=electron\release\AI视频编辑器-win32-x64"
if exist "%OUTPUT_DIR%" rmdir /S /Q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"

:: 复制electron核心文件
echo  - 复制Electron运行时...
xcopy /E /I /Q "electron\node_modules\electron\dist\*" "%OUTPUT_DIR%\" >nul

:: 创建resources/app目录
mkdir "%OUTPUT_DIR%\resources\app"

:: 复制Electron主进程代码
echo  - 复制主进程代码...
xcopy /E /I /Q "electron\dist\*" "%OUTPUT_DIR%\resources\app\" >nul

:: 复制前端文件到app目录
echo  - 复制前端页面...
mkdir "%OUTPUT_DIR%\resources\app\app"
xcopy /E /I /Q "client\dist\*" "%OUTPUT_DIR%\resources\app\app\" >nul

:: 复制package.json
copy "electron\package.json" "%OUTPUT_DIR%\resources\app\" >nul

:: 修复package.json的入口路径（从dist/main.js改为main.js）
powershell -Command "(Get-Content '%OUTPUT_DIR%\resources\app\package.json') -replace '\"main\": \"dist/main.js\"', '\"main\": \"main.js\"' | Set-Content '%OUTPUT_DIR%\resources\app\package.json'"

:: 重命名exe
echo  - 重命名可执行文件...
ren "%OUTPUT_DIR%\electron.exe" "AI视频编辑器.exe"

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出目录: %OUTPUT_DIR%
echo 可执行文件: AI视频编辑器.exe
echo.

:: 打开输出目录
start "" "%OUTPUT_DIR%"

pause
