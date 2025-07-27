# 视频提取功能增强指南

## 概述

本次更新增强了Chrome扩展的视频提取功能，主要解决了以下问题：
- 处理`blob:` URL类型的视频
- 从全局JavaScript状态中提取视频URL
- 从页面脚本标签中提取视频数据
- 从video元素的各种属性中获取真实视频URL

## 新增功能

### 1. 全局状态视频提取
- 检查`window.__INITIAL_STATE__`中的视频URL
- 搜索其他可能的全局变量（`window.xhsData`, `window.noteData`等）
- 递归搜索嵌套对象中的视频URL

### 2. Blob URL处理
- 检测`blob:`类型的视频URL
- 从video元素的各种数据属性中获取真实URL
- 从父元素中查找原始视频URL

### 3. 脚本标签解析
- 解析页面中的所有`<script>`标签
- 使用正则表达式匹配视频URL模式
- 支持多种视频URL格式

## 使用方法

### 1. 重新加载扩展
1. 打开Chrome扩展管理页面 (`chrome://extensions/`)
2. 找到"X-Downloader"扩展
3. 点击刷新按钮重新加载扩展

### 2. 测试视频提取
1. 打开一个包含视频的小红书笔记页面
2. 打开开发者工具 (F12)
3. 在Console中运行以下命令：

```javascript
// 测试增强的视频提取功能
if (window.xhsContentScript && window.xhsContentScript.extractNoteDetailVideos) {
    const videos = window.xhsContentScript.extractNoteDetailVideos();
    console.log('提取到的视频:', videos);
} else {
    console.log('扩展未正确加载');
}
```

### 3. 使用测试脚本
在Console中运行以下代码来加载测试脚本：

```javascript
// 加载测试脚本
const script = document.createElement('script');
script.src = chrome.runtime.getURL('test_enhanced_video_extraction.js');
document.head.appendChild(script);
```

## 测试步骤

### 步骤1: 检查页面状态
1. 打开包含视频的小红书笔记
2. 在Console中检查全局状态：
```javascript
console.log('全局状态:', window.__INITIAL_STATE__);
```

### 步骤2: 检查Video元素
1. 在Console中检查video元素：
```javascript
const videos = document.querySelectorAll('video');
console.log('Video元素数量:', videos.length);
videos.forEach((v, i) => {
    console.log(`Video ${i}:`, {
        src: v.src,
        dataset: v.dataset,
        attributes: {
            'data-original-src': v.getAttribute('data-original-src'),
            'data-video-url': v.getAttribute('data-video-url')
        }
    });
});
```

### 步骤3: 测试视频提取
1. 运行视频提取功能：
```javascript
const extractedVideos = window.xhsContentScript.extractNoteDetailVideos();
console.log('提取结果:', extractedVideos);
```

### 步骤4: 测试下载
1. 点击笔记中的下载按钮
2. 检查下载的文件是否包含视频

## 调试信息

扩展会在Console中输出详细的调试信息：

```
开始提取视频文件...
尝试从全局状态中提取视频URL...
检查window.__INITIAL_STATE__...
在window.__INITIAL_STATE__.note.video_url中找到视频URL: https://...
找到 1 个video元素
检查video元素 1: <video>
找到video src: blob:https://www.xiaohongshu.com/...
检测到blob URL，尝试获取真实视频URL...
从data-original-src属性找到真实视频URL: https://...
```

## 常见问题

### Q: 视频仍然无法下载
A: 请检查Console中的调试信息，确认：
1. 是否找到了video元素
2. 是否检测到blob URL
3. 是否成功提取到真实视频URL

### Q: 下载的文件不是视频
A: 检查PDF过滤功能是否正常工作：
```javascript
// 测试PDF检测
const testUrl = "https://example.com/video.pdf";
console.log('是否为PDF:', window.xhsContentScript.isPDFFile(testUrl));
```

### Q: 扩展没有响应
A: 重新加载扩展并检查Console是否有错误信息

## 技术细节

### 视频URL模式
扩展支持以下视频URL模式：
- `"video_url": "https://..."`
- `"videoUrl": "https://..."`
- `"src": "https://...mp4"`
- `"url": "https://...mp4"`
- `"media_url": "https://..."`
- `"mediaUrl": "https://..."`

### 支持的文件格式
- MP4
- AVI
- MOV
- WMV
- FLV
- WebM

### 数据属性支持
扩展会检查以下数据属性：
- `data-original-src`
- `data-real-src`
- `data-video-url`
- `data-video-src`
- `data-media-url`
- `data-media-src`

## 更新日志

### v1.2.0 (当前版本)
- ✅ 新增全局状态视频提取
- ✅ 新增blob URL处理
- ✅ 新增脚本标签解析
- ✅ 增强调试信息输出
- ✅ 优化PDF过滤逻辑

### v1.1.0
- ✅ 修复弹出层下载按钮问题
- ✅ 新增自定义通知系统
- ✅ 优化文件过滤功能

### v1.0.0
- ✅ 基础下载功能
- ✅ 图片和视频提取
- ✅ 文件夹创建和命名 