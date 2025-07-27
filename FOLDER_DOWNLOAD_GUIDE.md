# 📁 文件夹下载功能指南

## 🎯 新功能特性

### 1. 独立文件夹创建
- 每个笔记都会创建独立的文件夹
- 文件夹名称格式：`时间_标题`
- 例如：`2024-03-15_极简中式庭院寻一处简单静美之地`

### 2. 智能时间提取
- 自动提取笔记的发布时间或编辑时间
- 支持多种时间格式：
  - ISO格式：`2024-03-15`
  - 中文格式：`03-15`
  - 完整格式：`2024-03-15T10:30:00`

### 3. 文件过滤功能
- 自动过滤PDF等通用文件
- 排除网站政策、条款等无关文件
- 只下载笔记相关的图片和视频

## 📂 文件夹结构示例

```
小红书笔记/
├── 2024-03-15_极简中式庭院寻一处简单静美之地/
│   ├── note_info.txt          # 笔记信息文本
│   ├── image_1703123456789_abc123.jpg
│   ├── image_1703123456790_def456.png
│   └── video_1703123456791_ghi789.mp4
├── 2024-03-14_另一个笔记标题/
│   ├── note_info.txt
│   └── image_1703123456792_jkl012.jpg
└── ...
```

## 🧪 测试新功能

### 方法一：控制台测试
在弹出层页面打开控制台，粘贴以下代码：

```javascript
// 测试文件夹创建功能
console.log('🧪 开始测试文件夹创建功能...');

// 模拟笔记数据
const testNote = {
    title: '测试笔记标题 - 这是一个很长的标题用来测试文件夹名称长度限制',
    author: '测试作者',
    text: '这是测试笔记的内容',
    publishTime: '2024-03-15',
    formattedTime: '2024-03-15',
    images: [
        { url: 'https://example.com/image1.jpg' },
        { url: 'https://example.com/image2.png' },
        { url: 'https://example.com/document.pdf' }, // 应该被过滤
        { url: 'https://example.com/policy.pdf' }    // 应该被过滤
    ],
    videos: [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/document.pdf' }  // 应该被过滤
    ]
};

// 测试方法
const testMethods = {
    formatTimeForFolder(timeString) {
        try {
            let date;
            if (timeString.includes('T') || timeString.includes('-')) {
                date = new Date(timeString);
            } else {
                const parts = timeString.split(/[-/]/);
                if (parts.length === 2) {
                    const currentYear = new Date().getFullYear();
                    date = new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]));
                } else if (parts.length === 3) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    date = new Date();
                }
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
    },
    
    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
    },
    
    createFolderName(note) {
        const time = note.formattedTime || note.publishTime || this.formatTimeForFolder('');
        const title = this.sanitizeFilename(note.title);
        const shortTitle = title.substring(0, 50);
        return `${time}_${shortTitle}`;
    },
    
    filterMediaFiles(files, type) {
        return files.filter(file => {
            const url = file.url || file.src || '';
            const filename = url.split('/').pop().split('?')[0].toLowerCase();
            
            if (filename.endsWith('.pdf')) {
                console.log(`排除PDF文件: ${filename}`);
                return false;
            }
            
            const excludePatterns = [
                'policy', 'terms', 'privacy', 'cookie', 'agreement',
                'license', 'notice', 'readme', 'help', 'faq',
                'robots', 'sitemap', 'manifest', 'service-worker'
            ];
            
            for (const pattern of excludePatterns) {
                if (filename.includes(pattern)) {
                    console.log(`排除通用文件: ${filename}`);
                    return false;
                }
            }
            
            if (type === 'image') {
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
                const hasImageExt = imageExtensions.some(ext => filename.endsWith(ext));
                if (!hasImageExt && !url.includes('image') && !url.includes('img')) {
                    console.log(`排除非图片文件: ${filename}`);
                    return false;
                }
            } else if (type === 'video') {
                const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
                const hasVideoExt = videoExtensions.some(ext => filename.endsWith(ext));
                if (!hasVideoExt && !url.includes('video')) {
                    console.log(`排除非视频文件: ${filename}`);
                    return false;
                }
            }
            
            return true;
        });
    }
};

// 执行测试
console.log('\n📅 时间格式化测试:');
console.log('输入: "2024-03-15" -> 输出:', testMethods.formatTimeForFolder('2024-03-15'));
console.log('输入: "03-15" -> 输出:', testMethods.formatTimeForFolder('03-15'));

console.log('\n📁 文件夹名称创建测试:');
const folderName = testMethods.createFolderName(testNote);
console.log('文件夹名称:', folderName);

console.log('\n🖼️ 图片文件过滤测试:');
const filteredImages = testMethods.filterMediaFiles(testNote.images, 'image');
console.log('原始图片数量:', testNote.images.length);
console.log('过滤后图片数量:', filteredImages.length);

console.log('\n🎥 视频文件过滤测试:');
const filteredVideos = testMethods.filterMediaFiles(testNote.videos, 'video');
console.log('原始视频数量:', testNote.videos.length);
console.log('过滤后视频数量:', filteredVideos.length);

console.log('\n✅ 测试完成！');
```

### 方法二：实际下载测试
1. 在弹出层页面点击"下载笔记"按钮
2. 检查下载文件夹中的结构
3. 确认是否创建了独立文件夹
4. 验证是否过滤了PDF等通用文件

## 🔧 功能说明

### 时间提取逻辑
1. 优先查找页面中的时间元素
2. 支持多种时间选择器：
   - `.date`, `.time`, `.publish-time`
   - `[datetime]` 属性
   - 文本内容中的时间信息
3. 如果无法提取，使用当前时间

### 文件过滤规则
1. **PDF文件**：自动排除所有PDF文件
2. **通用文件**：排除包含以下关键词的文件：
   - policy, terms, privacy, cookie, agreement
   - license, notice, readme, help, faq
   - robots, sitemap, manifest, service-worker
3. **类型过滤**：
   - 图片：只保留常见图片格式
   - 视频：只保留常见视频格式

### 文件夹命名规则
1. 格式：`YYYY-MM-DD_标题`
2. 标题长度限制：最多50个字符
3. 特殊字符替换：`<>:"/\|?*` 替换为 `_`

## 🎉 使用建议

1. **测试新功能**：先在控制台运行测试代码
2. **检查下载结果**：确认文件夹结构正确
3. **反馈问题**：如果发现问题，请提供具体信息

## 📝 更新日志

- ✅ 添加独立文件夹创建功能
- ✅ 实现智能时间提取
- ✅ 添加文件过滤功能
- ✅ 优化文件夹命名规则
- ✅ 排除PDF等通用文件 