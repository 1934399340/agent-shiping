const packager = require('electron-packager');
const path = require('path');

async function main() {
  console.log('开始打包...');
  
  try {
    const appPaths = await packager({
      dir: '.',
      name: 'AI视频编辑器',
      platform: 'win32',
      arch: 'x64',
      out: 'release',
      overwrite: true,
      asar: false,
      ignore: [
        'node_modules',
        'release',
        'src',
        '*.ts',
        'tsconfig.json',
        'pack.js',
        'build.js'
      ]
    });
    
    console.log('打包完成！');
    console.log('输出路径:', appPaths);
  } catch (err) {
    console.error('打包失败:', err);
    process.exit(1);
  }
}

main();
