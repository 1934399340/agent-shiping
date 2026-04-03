const { build } = require('electron-builder');

build({
  targets: require('electron-builder').Platform.WINDOWS.createTarget(),
  config: {
    appId: 'com.ai.videoeditor',
    productName: 'AI视频编辑器',
    directories: {
      output: 'release',
      buildResources: 'build'
    },
    files: [
      'dist/**/*',
      {
        from: '../client/dist',
        to: 'app',
        filter: ['**/*']
      }
    ],
    extraResources: [
      {
        from: '../server',
        to: 'server',
        filter: ['dist/**/*', 'package.json', '.env']
      },
      {
        from: '../shared',
        to: 'shared',
        filter: ['**/*']
      }
    ],
    win: {
      target: [
        {
          target: 'nsis',
          arch: ['x64']
        },
        {
          target: 'portable',
          arch: ['x64']
        }
      ],
      artifactName: '${productName}-${version}-${arch}.${ext}'
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'AI视频编辑器'
    },
    portable: {
      artifactName: '${productName}-Portable-${version}.${ext}'
    },
    asar: false
  }
}).then(() => {
  console.log('打包完成！');
}).catch((err) => {
  console.error('打包失败:', err);
  process.exit(1);
});
