// 弹出窗口脚本
class XHSPopup {
    constructor() {
        this.isDownloading = false;
        this.currentTab = null;
        this.init();
    }
    
    async init() {
        // 获取当前标签页
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tabs[0];
        
        // 检查是否在小红书页面
        if (!this.currentTab.url.includes('xiaohongshu.com')) {
            this.showStatus('请在小红书页面使用此插件', 'error');
            this.disableInputs();
            return;
        }
        
        // 绑定事件
        this.bindEvents();
        
        // 加载保存的设置
        this.loadSettings();
        
        // 显示页面信息
        this.updatePageInfo();
    }
    
    bindEvents() {
        // 开始下载按钮
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startDownload();
        });
        
        // 停止下载按钮
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopDownload();
        });
        
        // 保存设置
        document.getElementById('maxNotes').addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('outputDir').addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('downloadImages').addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('downloadVideos').addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('downloadText').addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('autoScroll').addEventListener('change', () => {
            this.saveSettings();
        });
    }
    
    async loadSettings() {
        try {
            const settings = await chrome.storage.local.get([
                'maxNotes', 'outputDir', 'downloadImages', 'downloadVideos', 
                'downloadText', 'autoScroll'
            ]);
            
            if (settings.maxNotes) {
                document.getElementById('maxNotes').value = settings.maxNotes;
            }
            if (settings.outputDir) {
                document.getElementById('outputDir').value = settings.outputDir;
            }
            if (settings.downloadImages !== undefined) {
                document.getElementById('downloadImages').checked = settings.downloadImages;
            }
            if (settings.downloadVideos !== undefined) {
                document.getElementById('downloadVideos').checked = settings.downloadVideos;
            }
            if (settings.downloadText !== undefined) {
                document.getElementById('downloadText').checked = settings.downloadText;
            }
            if (settings.autoScroll !== undefined) {
                document.getElementById('autoScroll').checked = settings.autoScroll;
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }
    
    async saveSettings() {
        try {
            const settings = {
                maxNotes: parseInt(document.getElementById('maxNotes').value) || 10,
                outputDir: document.getElementById('outputDir').value || '小红书笔记',
                downloadImages: document.getElementById('downloadImages').checked,
                downloadVideos: document.getElementById('downloadVideos').checked,
                downloadText: document.getElementById('downloadText').checked,
                autoScroll: document.getElementById('autoScroll').checked
            };
            
            await chrome.storage.local.set(settings);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }
    
    async updatePageInfo() {
        try {
            // 向内容脚本发送消息获取页面信息
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'getPageInfo'
            });
            
            if (response && response.success) {
                this.showStatus(`检测到 ${response.noteCount} 个笔记`, 'info');
            } else {
                this.showStatus('正在分析页面内容...', 'info');
            }
        } catch (error) {
            console.error('获取页面信息失败:', error);
        }
    }
    
    async startDownload() {
        if (this.isDownloading) {
            return;
        }
        
        // 获取用户设置
        const options = {
            maxNotes: parseInt(document.getElementById('maxNotes').value) || 10,
            outputDir: document.getElementById('outputDir').value || '小红书笔记',
            downloadImages: document.getElementById('downloadImages').checked,
            downloadVideos: document.getElementById('downloadVideos').checked,
            downloadText: document.getElementById('downloadText').checked,
            autoScroll: document.getElementById('autoScroll').checked
        };
        
        // 验证设置
        if (options.maxNotes < 1 || options.maxNotes > 100) {
            this.showStatus('笔记数量应在1-100之间', 'error');
            return;
        }
        
        if (!options.downloadImages && !options.downloadVideos && !options.downloadText) {
            this.showStatus('请至少选择一种下载内容', 'error');
            return;
        }
        
        try {
            this.isDownloading = true;
            this.updateUI('downloading');
            
            // 保存设置
            await this.saveSettings();
            
            // 向内容脚本发送下载命令
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'startDownload',
                options: options
            });
            
            if (response && response.success) {
                this.showStatus('开始下载...', 'info');
                this.startProgressMonitoring();
            } else {
                throw new Error(response?.error || '下载启动失败');
            }
            
        } catch (error) {
            console.error('启动下载失败:', error);
            this.showStatus(`下载失败: ${error.message}`, 'error');
            this.updateUI('idle');
        }
    }
    
    async stopDownload() {
        try {
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'stopDownload'
            });
            
            this.showStatus('下载已停止', 'info');
            this.updateUI('idle');
            
        } catch (error) {
            console.error('停止下载失败:', error);
        }
    }
    
    async startProgressMonitoring() {
        // 监听来自内容脚本的进度更新
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'progress') {
                this.updateProgress(message.data);
            } else if (message.type === 'complete') {
                this.onDownloadComplete(message.data);
            } else if (message.type === 'error') {
                this.showStatus(`下载错误: ${message.error}`, 'error');
                this.updateUI('idle');
            }
        });
    }
    
    updateProgress(data) {
        const { current, total, downloadedNotes, downloadedImages, downloadedVideos } = data;
        
        // 更新进度条
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progress = total > 0 ? (current / total) * 100 : 0;
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `下载中... ${current}/${total}`;
        
        // 更新统计信息
        document.getElementById('totalNotes').textContent = total;
        document.getElementById('downloadedNotes').textContent = downloadedNotes;
        document.getElementById('downloadedImages').textContent = downloadedImages;
        document.getElementById('downloadedVideos').textContent = downloadedVideos;
        
        // 显示统计面板
        document.getElementById('stats').style.display = 'block';
    }
    
    onDownloadComplete(data) {
        const { totalNotes, totalImages, totalVideos } = data;
        
        this.showStatus(`下载完成！共下载 ${totalNotes} 个笔记`, 'success');
        this.updateUI('idle');
        
        // 更新最终统计
        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('downloadedNotes').textContent = totalNotes;
        document.getElementById('downloadedImages').textContent = totalImages;
        document.getElementById('downloadedVideos').textContent = totalVideos;
    }
    
    updateUI(state) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const progressContainer = document.getElementById('progressContainer');
        
        if (state === 'downloading') {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            progressContainer.style.display = 'block';
            this.disableInputs();
        } else {
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            progressContainer.style.display = 'none';
            this.enableInputs();
        }
    }
    
    disableInputs() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);
    }
    
    enableInputs() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.disabled = false);
    }
    
    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// 初始化弹出窗口
document.addEventListener('DOMContentLoaded', () => {
    new XHSPopup();
}); 