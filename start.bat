@echo off
REM AI视频编辑器 - 一键启动脚本

echo ========================================
echo   AI视频编辑器 - 正在启动...
echo ========================================
echo.

REM 检查pnpm是否安装
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到pnpm，请先安装pnpm
    echo 安装命令: npm install -g pnpm
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    call pnpm install
    echo.
)

REM 启动后端服务（新窗口）
echo [1/2] 启动后端服务 (端口3001)...
start "AI视频编辑器 - 后端服务" cmd /k "cd server && pnpm dev"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端服务（新窗口）
echo [2/2] 启动前端服务 (端口3000)...
start "AI视频编辑器 - 前端服务" cmd /k "cd client && npx vite --port 3000 --host"

echo.
echo ========================================
echo   服务启动完成！
echo ========================================
echo.
echo 后端服务: http://localhost:3001
echo 前端服务: http://localhost:3000
echo.
echo 浏览器将自动打开，如果没有打开请手动访问：
echo http://localhost:3000
echo.
echo 关闭此窗口不会停止服务
echo 要停止服务请关闭对应的命令行窗口
echo.

REM 等待3秒后自动打开浏览器
timeout /t 3 /nobreak >nul
start http://localhost:3000

pause
