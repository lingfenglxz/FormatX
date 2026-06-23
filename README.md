# FormatX

离线 Windows JSON/XML 格式化工具。支持格式化、压缩、复制、明暗主题、左侧编辑器与右侧结构树同步。

## 功能

- JSON、XML 格式化与压缩
- 单一编辑器，处理结果原地替换
- JSON 树展开与键/值编辑同步
- 深色、明亮、跟随系统主题
- 本地运行，不上传文本

## 开发

```powershell
npm.cmd install
npm.cmd test -- --run
npm.cmd run tauri dev
```

## 构建 Windows 安装包

```powershell
npm.cmd run tauri build
```

产物位于 `src-tauri/target/release/bundle/`。发布版本见 [Releases](https://github.com/lingfenglxz/FormatX/releases)。
