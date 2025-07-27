// 后台脚本 - 服务工作者
class XHSBackground {
    constructor() {
        this.init();
    }
    
    init() {
        // 监听扩展安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.onInstalled(details);
        });
        
        // 监听扩展图标点击事件
        chrome.action.onClicked.addListener((tab) => {
            this.onIconClicked(tab);
        });
        
        // 监听下载完成事件
        chrome.downloads.onChanged.addListener((downloadDelta) => {
            this.onDownloadChanged(downloadDelta);
        });
        
        // 监听标签页更新事件
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.onTabUpdated(tabId, changeInfo, tab);
        });
        
        console.log('X-Downloader 后台脚本已加载');
    }
    
    // 扩展安装事件
    onInstalled(details) {
        if (details.reason === 'install') {
            console.log('X-Downloader 扩展已安装');
            
            // 设置默认配置
            chrome.storage.local.set({
                maxNotes: 10,
                outputDir: '小红书笔记',
                downloadImages: true,
                downloadVideos: true,
                downloadText: true,
                autoScroll: true
            });
            
            // 打开欢迎页面
            chrome.tabs.create({
                url: 'https://www.xiaohongshu.com'
            });
        } else if (details.reason === 'update') {
            console.log('X-Downloader 扩展已更新到版本', chrome.runtime.getManifest().version);
        }
    }
    
    // 扩展图标点击事件
    onIconClicked(tab) {
        // 如果不在小红书页面，跳转到小红书
        if (!tab.url.includes('xiaohongshu.com')) {
            chrome.tabs.create({
                url: 'https://www.xiaohongshu.com'
            });
        } else {
            // 在小红书页面，显示popup
            chrome.action.setPopup({
                tabId: tab.id,
                popup: 'popup.html'
            });
        }
    }
    
    // 下载状态变化事件
    onDownloadChanged(downloadDelta) {
        if (downloadDelta.state && downloadDelta.state.current === 'complete') {
            console.log('下载完成:', downloadDelta.id);
            
            // 获取下载信息
            chrome.downloads.search({ id: downloadDelta.id }, (downloads) => {
                if (downloads.length > 0) {
                    const download = downloads[0];
                    console.log('下载文件:', download.filename);
                    
                    // 发送通知
                    this.showNotification('下载完成', `文件已保存到: ${download.filename}`);
                }
            });
        } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
            console.log('下载中断:', downloadDelta.id);
            
            // 发送错误通知
            this.showNotification('下载失败', '文件下载被中断，请重试');
        }
    }
    
    // 标签页更新事件
    onTabUpdated(tabId, changeInfo, tab) {
        // 当页面加载完成且是小红书页面时
        if (changeInfo.status === 'complete' && tab.url && tab.url.includes('xiaohongshu.com')) {
            console.log('检测到小红书页面:', tab.url);
            
            // 更新扩展图标状态
            // chrome.action.setIcon({
            //     tabId: tabId,
            //     path: {
            //         "16": "icons/icon.svg",
            //         "48": "icons/icon.svg",
            //         "128": "icons/icon.svg"
            //     }
            // });
            
            // 设置popup
            chrome.action.setPopup({
                tabId: tabId,
                popup: 'popup.html'
            });
        }
    }
    
    // 显示通知
    showNotification(title, message) {
        // 检查通知权限
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                title: title,
                message: message
            });
        }
    }
    
    // 处理来自content script的消息
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'download':
                    await this.handleDownload(message.data);
                    sendResponse({ success: true });
                    break;
                case 'notification':
                    this.showNotification(message.title, message.message);
                    sendResponse({ success: true });
                    break;
                default:
                    console.log('未知消息类型:', message.type);
                    sendResponse({ success: false, error: '未知消息类型' });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    // 处理下载请求
    async handleDownload(data) {
        try {
            const { url, filename } = data;
            
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: false
            });
            
            console.log('开始下载:', filename);
        } catch (error) {
            console.error('下载失败:', error);
        }
    }
}

// 初始化后台脚本
new XHSBackground();

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const background = new XHSBackground();
    background.handleMessage(message, sender, sendResponse);
    return true; // 保持消息通道开放，等待异步响应
}); 