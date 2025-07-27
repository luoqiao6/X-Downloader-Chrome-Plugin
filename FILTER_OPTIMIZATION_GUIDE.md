# 图片过滤优化指南

## 🎯 问题描述

用户反馈下载的文件中包含了一些不需要的内容：
- 多张小的PNG格式图片（7-8KB），这些不是笔记正文内容
- PDF文件（1.8MB），应该被过滤掉

## ✅ 优化方案

### 1. 增强PNG过滤逻辑

#### 尺寸过滤
```javascript
// 检查URL中的尺寸信息
const sizeMatch = url.match(/(\d+)x(\d+)/);
if (sizeMatch) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    
    // 如果尺寸小于200x200，很可能是图标
    if (width < 200 || height < 200) {
        console.log(`❌ 排除小尺寸PNG图标: ${filename} (${width}x${height})`);
        return false;
    }
}
```

#### 关键词过滤
```javascript
// 检查文件名是否包含图标相关关键词
const iconKeywords = ['icon', 'logo', 'avatar', 'emoji', 'button', 'badge'];
const hasIconKeyword = iconKeywords.some(keyword => 
    filename.includes(keyword) || url.includes(keyword)
);

if (hasIconKeyword) {
    console.log(`❌ 排除图标类PNG: ${filename}`);
    return false;
}
```

#### 容器过滤
```javascript
// 检查是否来自笔记的主要容器
const noteContainerKeywords = [
    'note-container', 'media-container', 'slider-container', 
    'img-container', 'swiper-slide'
];
const isFromNoteContainer = noteContainerKeywords.some(keyword => 
    url.includes(keyword) || file.element?.closest(`[class*="${keyword}"]`)
);

if (!isFromNoteContainer) {
    console.log(`❌ 排除非笔记容器的PNG: ${filename}`);
    return false;
}
```

### 2. 增强PDF过滤逻辑

#### 严格PDF检查
```javascript
// 严格排除PDF文件（无论类型）
if (filename.endsWith('.pdf') || url.toLowerCase().includes('.pdf')) {
    console.log(`❌ 排除PDF文件: ${filename}`);
    return false;
}
```

#### 通用文件过滤
```javascript
// 排除明显的通用文件
const excludePatterns = [
    'policy.pdf', 'terms.pdf', 'privacy.pdf', 'cookie.pdf', 'agreement.pdf',
    'license.pdf', 'notice.pdf', 'readme.pdf', 'help.pdf', 'faq.pdf',
    'robots.txt', 'sitemap.xml', 'manifest.json', 'service-worker.js'
];

for (const pattern of excludePatterns) {
    if (filename === pattern) {
        console.log(`❌ 排除通用文件: ${filename}`);
        return false;
    }
}
```

### 3. 优化图片提取逻辑

#### 优先提取主要图片
```javascript
// 优先查找笔记的主要图片容器
const mainImageContainers = [
    '.slider-container',
    '.media-container', 
    '.img-container',
    '.swiper-slide',
    '[class*="slider"]',
    '[class*="media"]'
];
```

#### 尺寸检查
```javascript
// 检查图片尺寸（如果可用）
const width = img.naturalWidth || img.width;
const height = img.naturalHeight || img.height;

// 排除小尺寸图片（小于200x200）
if (width && height && (width < 200 || height < 200)) {
    console.log(`跳过小尺寸图片: ${img.src} (${width}x${height})`);
    return;
}
```

## 🧪 测试方法

### 1. 简单测试
```javascript
// 在控制台运行
// 复制 simple_filter_test.js 的内容
```

### 2. 完整测试
```javascript
// 在控制台运行
// 复制 test_image_filter.js 的内容
```

### 3. 手动测试
```javascript
// 确保插件已加载
if (window.xhsContentScript) {
    // 创建测试数据
    const testImages = [
        {
            url: 'https://sns-webpic-qc.xhscdn.com/icon_32x32.png',
            alt: '小图标'
        },
        {
            url: 'https://sns-webpic-qc.xhscdn.com/video_1753588604063_9qm7mu.pdf',
            alt: 'PDF文件'
        },
        {
            url: 'https://sns-webpic-qc.xhscdn.com/202507262354/04155a1257f3929bd35a5f56997db3fa/1040g2sg31ei67hik0s6g5plstdm7c6r0ivtv3qg!nd_dft_wlteh_webp_3',
            alt: '主要图片'
        }
    ];
    
    // 执行过滤
    const filteredImages = window.xhsContentScript.filterMediaFiles(testImages, 'image');
    console.log('过滤结果:', filteredImages);
}
```

## 📊 过滤规则总结

### 图片过滤规则
1. **尺寸过滤**：排除小于200x200的图片
2. **关键词过滤**：排除包含icon、logo、avatar等关键词的图片
3. **容器过滤**：只保留来自笔记主要容器的图片
4. **扩展名过滤**：只保留图片格式文件

### PDF过滤规则
1. **扩展名检查**：排除所有.pdf文件
2. **URL检查**：排除URL中包含.pdf的文件
3. **通用文件检查**：排除政策、条款等通用PDF文件

### 优先级规则
1. **主要图片内容**：优先保留包含sns-webpic、note-slider-img等关键词的图片
2. **容器来源**：优先保留来自slider-container、media-container等容器的图片
3. **尺寸大小**：优先保留大尺寸图片

## 🔧 自定义配置

### 修改尺寸阈值
```javascript
// 在过滤逻辑中修改尺寸阈值
if (width < 200 || height < 200) {
    // 可以调整为其他值，如 100x100 或 300x300
}
```

### 添加新的排除关键词
```javascript
// 在 iconKeywords 数组中添加新的关键词
const iconKeywords = ['icon', 'logo', 'avatar', 'emoji', 'button', 'badge', 'new_keyword'];
```

### 修改容器选择器
```javascript
// 在 mainImageContainers 数组中添加新的选择器
const mainImageContainers = [
    '.slider-container',
    '.media-container', 
    '.img-container',
    '.swiper-slide',
    '[class*="slider"]',
    '[class*="media"]',
    '.new-container'  // 添加新的容器选择器
];
```

## 📝 更新日志

### v2.3.0
- ✅ 增强PNG图片过滤逻辑
- ✅ 添加尺寸检查（排除小于200x200的图片）
- ✅ 添加关键词过滤（排除图标类图片）
- ✅ 添加容器来源检查
- ✅ 增强PDF文件过滤
- ✅ 优化图片提取优先级
- ✅ 添加详细的过滤日志

## 🎯 预期效果

优化后的过滤逻辑应该能够：
- ❌ 过滤掉小的PNG图标文件（7-8KB）
- ❌ 过滤掉PDF文件
- ✅ 保留笔记正文中的主要图片内容
- ✅ 保留WebP格式的主要图片
- ✅ 保留大尺寸的图片内容

---

**注意**：如果仍有不需要的文件被下载，请检查其URL特征，可以在过滤逻辑中添加更具体的排除条件。 