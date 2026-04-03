const packager = require('electron-packager');

async function main() {
  console.log('开始离线打包...');
  
  try {
    const appPaths = await packager({
      dir: '.',
      name: 'AI视频编辑器',
      platform: 'win32',
      arch: 'x64',
      out: 'release',
      overwrite: true,
      asar: false,
      // 使用本地缓存的electron
      download: {
        cacheRoot: './electron-cache',
        mirrorOptions: {
          mirror: 'https://npmmirror.com/mirrors/electron/'
        }
      },
      ignore: [
        'node_modules',
        'release',
        'src',
        '*.ts',
        'tsconfig.json',
        'pack.js',
        'build.js',
        'pack-offline.js'
      ]
    });
    
    console.log('✅ 打包完成！');
    console.log('📁 输出路径:', appPaths);
  } catch (err) {
    console.error('❌ 打包失败:', err.message);
    console.log('\n💡 提示: 如果网络问题持续，请尝试:');
    console.log('   1. 设置ELECTRON_MIRROR环境变量');
    console.log('   2. 手动下载electron后放到electron-cache目录');
    process.exit(1);
  }
}

main();
