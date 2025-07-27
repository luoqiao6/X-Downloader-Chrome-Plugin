# 远程仓库设置指南

## 创建远程仓库

如果您想在GitHub、GitLab或其他平台创建远程仓库，请按以下步骤操作：

### GitHub 设置

1. **创建新仓库**
   ```bash
   # 在GitHub上创建新仓库，不要初始化README
   # 仓库名建议：x-downloader-chrome-extension
   ```

2. **添加远程仓库**
   ```bash
   git remote add origin https://github.com/yourusername/x-downloader-chrome-extension.git
   ```

3. **推送代码**
   ```bash
   git branch -M main
   git push -u origin main
   ```

### GitLab 设置

1. **创建新项目**
   ```bash
   # 在GitLab上创建新项目
   ```

2. **添加远程仓库**
   ```bash
   git remote add origin https://gitlab.com/yourusername/x-downloader-chrome-extension.git
   ```

3. **推送代码**
   ```bash
   git branch -M main
   git push -u origin main
   ```

## 本地仓库信息

当前仓库包含以下内容：

### 核心文件
- `manifest.json` - Chrome扩展配置
- `content.js` - 主要功能脚本
- `background.js` - 后台脚本
- `popup.html/js` - 弹出窗口

### 文档
- `README.md` - 项目说明
- `INSTALL_GUIDE.md` - 安装指南
- `VIDEO_EXTRACTION_GUIDE.md` - 视频提取指南
- 其他详细文档

### 工具脚本
- `install.sh` - 安装脚本
- `create_icons.py` - 图标生成脚本
- `verify_installation.py` - 安装验证脚本

## 版本信息

- **当前版本**: v1.0.0
- **最后更新**: 2025-07-27
- **主要功能**: 完整的Chrome扩展，支持小红书笔记下载

## 注意事项

1. 确保`.gitignore`文件正确配置，避免提交不必要的文件
2. 定期更新README.md以反映最新功能
3. 使用有意义的提交信息
4. 考虑添加版本标签：`git tag v1.0.0` 