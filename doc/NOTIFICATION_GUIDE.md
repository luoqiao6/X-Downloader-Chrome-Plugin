# 通知系统使用指南

## 🎯 功能概述

新的通知系统替换了原来的 `alert` 弹窗，提供了更好的用户体验：

- ✅ **自动关闭**：通知会在指定时间后自动消失
- 🎨 **美观设计**：现代化的渐变色彩和动画效果
- 📱 **响应式**：适配不同屏幕尺寸
- 🖱️ **交互友好**：支持点击关闭
- 📊 **进度显示**：实时显示下载进度

## 🎨 通知类型

### 1. 信息通知 (info)
- **颜色**：蓝色渐变
- **图标**：ℹ️
- **用途**：显示一般信息，如"开始下载..."

### 2. 成功通知 (success)
- **颜色**：绿色渐变
- **图标**：✅
- **用途**：显示成功信息，如"下载完成！"

### 3. 警告通知 (warning)
- **颜色**：橙色渐变
- **图标**：⚠️
- **用途**：显示警告信息

### 4. 错误通知 (error)
- **颜色**：红色渐变
- **图标**：❌
- **用途**：显示错误信息，如"下载失败"

## 📋 使用示例

### 基本用法
```javascript
// 显示信息通知，3秒后自动关闭
this.showNotification('开始下载笔记...', 'info', 3000);

// 显示成功通知，4秒后自动关闭
this.showNotification('下载完成！', 'success', 4000);

// 显示错误通知，5秒后自动关闭
this.showNotification('下载失败: 网络错误', 'error', 5000);

// 显示不自动关闭的通知，需要点击关闭
this.showNotification('点击关闭此通知', 'warning', 0);
```

### 下载进度示例
```javascript
// 开始下载
this.showNotification('开始下载: 笔记标题...', 'info', 2000);

// 下载图片
this.showNotification('正在下载 5 张图片...', 'info', 2000);

// 显示进度
this.showNotification('图片下载进度: 2/5', 'info', 1500);

// 下载完成
this.showNotification('下载完成！共 8 个文件', 'success', 4000);
```

## 🧪 测试方法

### 1. 简单测试
在浏览器控制台运行：
```javascript
// 复制并粘贴 simple_notification_test.js 的内容
```

### 2. 完整测试
在浏览器控制台运行：
```javascript
// 复制并粘贴 test_notification.js 的内容
```

### 3. 手动测试
```javascript
// 确保插件已加载
if (window.xhsContentScript) {
    // 测试信息通知
    window.xhsContentScript.showNotification('测试信息', 'info', 2000);
    
    // 测试成功通知
    window.xhsContentScript.showNotification('测试成功', 'success', 2000);
    
    // 测试错误通知
    window.xhsContentScript.showNotification('测试错误', 'error', 2000);
}
```

## ⚙️ 技术特性

### 自动关闭
- 默认3秒后自动关闭
- 可自定义关闭时间
- 设置为0表示不自动关闭

### 点击关闭
- 点击通知任意位置可立即关闭
- 支持动画过渡效果

### 样式特性
- 固定定位在右上角
- 最高层级显示 (z-index: 999999)
- 响应式设计，最大宽度300px
- 文本自动换行

### 动画效果
- 从右侧滑入
- 从右侧滑出
- 平滑过渡动画

## 🔧 自定义配置

### 修改默认显示时间
```javascript
// 在 showNotification 方法中修改默认值
showNotification(message, type = 'info', duration = 3000) {
    // duration 参数控制显示时间（毫秒）
}
```

### 修改位置
```javascript
// 修改 styles 对象中的位置设置
const styles = {
    position: 'fixed',
    top: '20px',        // 距离顶部距离
    right: '20px',      // 距离右侧距离
    // ...
};
```

### 修改颜色
```javascript
// 在 switch 语句中修改颜色
switch (type) {
    case 'success':
        styles.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
        break;
    case 'error':
        styles.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
        break;
    // ...
}
```

## 🐛 故障排除

### 通知不显示
1. 检查插件是否正确加载
2. 确认 `window.xhsContentScript` 存在
3. 查看控制台是否有错误信息

### 通知位置不正确
1. 检查页面是否有其他固定定位元素
2. 确认 z-index 值足够高
3. 检查页面样式是否冲突

### 自动关闭不工作
1. 确认 duration 参数大于0
2. 检查是否有JavaScript错误
3. 确认页面没有阻止定时器

## 📝 更新日志

### v2.2.0
- ✅ 新增自定义通知系统
- ✅ 替换所有 alert 弹窗
- ✅ 添加自动关闭功能
- ✅ 支持点击关闭
- ✅ 添加下载进度显示
- ✅ 优化用户体验

---

**注意**：通知系统会自动移除已存在的通知，确保同时只显示一个通知，避免界面混乱。 