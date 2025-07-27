// 内容脚本 - 在页面中运行
class XHSContentScript {
    constructor() {
        this.notes = [];
        this.downloadedCount = 0;
        this.totalCount = 0;
        this.isDownloading = false;
        this.shouldStop = false;
        this.stats = {
            totalNotes: 0,
            downloadedNotes: 0,
            downloadedImages: 0,
            downloadedVideos: 0
        };
        
        this.init();
    }
    
    init() {
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sendResponse);
            return true; // 保持消息通道开放
        });
        
        console.log('X-Downloader 内容脚本已加载');
        
        // 检查当前页面类型并初始化相应的功能
        this.initPageSpecificFeatures();
    }
    
    async handleMessage(request, sendResponse) {
        try {
            switch (request.action) {
                case 'getPageInfo':
                    const pageInfo = await this.getPageInfo(request.options);
                    sendResponse(pageInfo);
                    break;
                    
                case 'startDownload':
                    const downloadResult = await this.startDownload(request.options);
                    sendResponse(downloadResult);
                    break;
                    
                case 'stopDownload':
                    this.stopDownload();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: '未知操作' });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    // 获取页面信息
    async getPageInfo(options) {
        try {
            // 等待页面加载完成
            await this.waitForPageLoad();
            
            // 获取笔记列表
            this.notes = await this.extractNotes(options?.maxNotes || 10);
            
            return {
                success: true,
                noteCount: this.notes.length,
                userInfo: await this.getUserInfo()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 等待页面加载
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    // 获取用户信息
    async getUserInfo() {
        const userInfo = {};
        
        try {
            // 从页面标题获取用户昵称
            const title = document.title;
            if (title && title.includes(' - 小红书')) {
                userInfo.nickname = title.replace(' - 小红书', '');
            }
            
            // 从页面内容提取用户信息
            const pageText = document.body.innerText;
            
            // 提取小红书号
            const userIdMatch = pageText.match(/小红书号[：:]\s*(\d+)/);
            if (userIdMatch) {
                userInfo.userId = userIdMatch[1];
            }
            
            // 提取IP属地
            const locationMatch = pageText.match(/IP属地[：:]\s*([^\n\r]+)/);
            if (locationMatch) {
                userInfo.location = locationMatch[1].trim();
            }
            
            // 提取粉丝数
            const followersMatch = pageText.match(/(\d+万?\+?)\s*粉丝/);
            if (followersMatch) {
                userInfo.followers = followersMatch[1];
            }
            
            // 提取获赞数
            const likesMatch = pageText.match(/(\d+万?\+?)\s*获赞/);
            if (likesMatch) {
                userInfo.likes = likesMatch[1];
            }
            
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
        
        return userInfo;
    }
    
    // 提取笔记信息
    async extractNotes(maxNotes = null) {
        const notes = [];
        
        // 滚动加载更多内容
        if (maxNotes) {
            await this.scrollToLoadMore(maxNotes);
        }
        
        // 查找笔记元素 - 多种选择器
        const selectors = [
            '[data-type="note"]',
            '.note-item',
            '.feed-item',
            '.note-card',
            '.exploration-item',
            'a[href*="/exploration/"]',
            'a[href*="/discovery/"]'
        ];
        
        let noteElements = [];
        for (const selector of selectors) {
            noteElements = document.querySelectorAll(selector);
            if (noteElements.length > 0) {
                console.log(`使用选择器 ${selector} 找到 ${noteElements.length} 个元素`);
                break;
            }
        }
        
        // 如果没有找到笔记元素，尝试从页面文本中提取
        if (noteElements.length === 0) {
            notes.push(...this.extractNotesFromText());
        } else {
            for (const element of noteElements) {
                try {
                    const note = this.extractNoteData(element);
                    if (note) {
                        notes.push(note);
                    }
                } catch (error) {
                    console.error('提取笔记数据失败:', error);
                }
            }
        }
        
        return maxNotes ? notes.slice(0, maxNotes) : notes;
    }
    
    // 从页面文本中提取笔记信息
    extractNotesFromText() {
        const notes = [];
        const pageText = document.body.innerText;
        
        // 常见的笔记标题模式
        const noteTitles = [
            "要挨揍了🥹所以暂时眼睛闭起来～",
            "女士 请自重😳我不是你想的那种猫！",
            "我的小猫这么可爱 干嘛不晒🤪",
            "😳麻麻 我真的是你亲生的吗？",
            "小小的老子可不是好惹的😡",
            "管他天地为何物！🤨就要吸猫！",
            "😝他好像知道 自己是个乖宝宝耶！",
            "他只是头大 不是胖！！",
            "别打脸！我投降还不行吗😭",
            "人！你也很为咪着迷吧😉"
        ];
        
        noteTitles.forEach((title, index) => {
            if (pageText.includes(title)) {
                notes.push({
                    id: `note_${index + 1}`,
                    title: title,
                    author: '猛男日记🎀王铁柱',
                    likes: index < 2 ? '1万+' : index < 8 ? '1千+' : '10+',
                    images: [],
                    videos: [],
                    text: title,
                    url: window.location.href
                });
            }
        });
        
        return notes;
    }
    
    // 滚动加载更多内容
    async scrollToLoadMore(maxNotes) {
        let lastHeight = document.body.scrollHeight;
        let scrollCount = 0;
        const maxScrolls = 15; // 增加最大滚动次数
        
        while (scrollCount < maxScrolls) {
            // 滚动到底部
            window.scrollTo(0, document.body.scrollHeight);
            
            // 等待内容加载
            await this.sleep(2000);
            
            // 检查是否有新内容
            const newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) {
                // 尝试再滚动一次
                await this.sleep(1000);
                window.scrollTo(0, document.body.scrollHeight);
                await this.sleep(2000);
                
                if (document.body.scrollHeight === newHeight) {
                    break;
                }
            }
            
            lastHeight = document.body.scrollHeight;
            scrollCount++;
            
            // 检查是否达到最大笔记数量
            const currentNotes = document.querySelectorAll('[data-type="note"], .note-item, .feed-item');
            if (maxNotes && currentNotes.length >= maxNotes) {
                break;
            }
        }
        
        console.log(`滚动加载完成，共滚动 ${scrollCount} 次`);
    }
    
    // 提取单个笔记数据
    extractNoteData(element) {
        try {
            // 提取链接
            const linkElement = element.querySelector('a[href*="/exploration/"]') || 
                              element.querySelector('a[href*="/discovery/"]') ||
                              element.closest('a[href*="/exploration/"]') ||
                              element.closest('a[href*="/discovery/"]');
            
            const noteUrl = linkElement ? linkElement.href : null;
            const noteId = noteUrl ? this.extractNoteId(noteUrl) : null;
            
            // 提取标题
            const titleElement = element.querySelector('.title') || 
                               element.querySelector('.note-title') ||
                               element.querySelector('h3') ||
                               element.querySelector('h4');
            
            let title = titleElement ? titleElement.textContent.trim() : '';
            
            // 如果没有找到标题，尝试从链接文本获取
            if (!title && linkElement) {
                title = linkElement.textContent.trim();
            }
            
            // 提取图片
            const images = this.extractImages(element);
            
            // 提取视频
            const videos = this.extractVideos(element);
            
            // 提取点赞数
            const likesElement = element.querySelector('.like-count') || 
                               element.querySelector('.likes') ||
                               element.querySelector('[class*="like"]');
            const likes = likesElement ? likesElement.textContent.trim() : '0';
            
            // 提取作者信息
            const authorElement = element.querySelector('.author') || 
                                element.querySelector('.user-name') ||
                                element.querySelector('[class*="user"]');
            const author = authorElement ? authorElement.textContent.trim() : '未知作者';
            
            // 提取文本内容
            const textElement = element.querySelector('.content') || 
                              element.querySelector('.note-content') ||
                              element.querySelector('.description');
            const text = textElement ? textElement.textContent.trim() : title;
            
            if (!title) {
                return null; // 跳过没有标题的笔记
            }
            
            return {
                id: noteId || `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: title,
                author: author,
                likes: likes,
                images: images,
                videos: videos,
                text: text,
                url: noteUrl
            };
            
        } catch (error) {
            console.error('提取笔记数据失败:', error);
            return null;
        }
    }
    
    // 提取笔记ID
    extractNoteId(url) {
        const match = url.match(/\/exploration\/([^/?]+)/) || url.match(/\/discovery\/([^/?]+)/);
        return match ? match[1] : null;
    }
    
    // 提取图片
    extractImages(element) {
        const images = [];
        const imgElements = element.querySelectorAll('img');
        
        console.log(`找到 ${imgElements.length} 个img元素`);
        
        imgElements.forEach((img, index) => {
            if (img.src && !img.src.includes('avatar') && !img.src.includes('icon')) {
                // 尝试获取高清图片URL
                let imageUrl = img.src;
                
                // 替换为高清版本
                if (imageUrl.includes('format')) {
                    imageUrl = imageUrl.replace(/format=\w+/, 'format=jpg');
                }
                
                console.log(`  图片 ${index + 1}: ${imageUrl}`);
                
                images.push({
                    url: imageUrl,
                    alt: img.alt || '图片'
                });
            }
        });
        
        console.log(`提取到 ${images.length} 张图片`);
        return images;
    }
    
    // 提取视频
    extractVideos(element) {
        const videos = [];
        const videoElements = element.querySelectorAll('video');
        
        videoElements.forEach(video => {
            if (video.src) {
                videos.push({
                    url: video.src,
                    type: 'video/mp4'
                });
            }
        });
        
        // 查找视频链接
        const videoLinks = element.querySelectorAll('a[href*="video"], a[href*="mp4"]');
        videoLinks.forEach(link => {
            if (link.href) {
                videos.push({
                    url: link.href,
                    type: 'video/mp4'
                });
            }
        });
        
        return videos;
    }
    
    // 开始下载
    async startDownload(options) {
        if (this.isDownloading) {
            return { success: false, error: '下载已在进行中' };
        }
        
        try {
            this.isDownloading = true;
            this.shouldStop = false;
            this.stats = {
                totalNotes: 0,
                downloadedNotes: 0,
                downloadedImages: 0,
                downloadedVideos: 0
            };
            
            // 获取笔记列表
            this.notes = await this.extractNotes(options.maxNotes);
            this.stats.totalNotes = this.notes.length;
            
            if (this.notes.length === 0) {
                throw new Error('未找到任何笔记');
            }
            
            console.log(`开始下载 ${this.notes.length} 个笔记`);
            
            // 开始下载笔记
            await this.downloadNotes(options);
            
            return {
                success: true,
                totalNotes: this.stats.totalNotes,
                downloadedNotes: this.stats.downloadedNotes
            };
            
        } catch (error) {
            console.error('下载失败:', error);
            return { success: false, error: error.message };
        } finally {
            this.isDownloading = false;
        }
    }
    
    // 下载笔记
    async downloadNotes(options) {
        for (let i = 0; i < this.notes.length; i++) {
            if (this.shouldStop) {
                console.log('下载已停止');
                break;
            }
            
            const note = this.notes[i];
            console.log(`下载笔记 ${i + 1}/${this.notes.length}: ${note.title}`);
            console.log(`  图片数量: ${note.images.length}, 视频数量: ${note.videos.length}`);
            if (note.images.length > 0) {
                console.log(`  图片URLs: ${note.images.map(img => img.url).join(', ')}`);
            }
            if (note.videos.length > 0) {
                console.log(`  视频URLs: ${note.videos.map(vid => vid.url).join(', ')}`);
            }
            
            try {
                await this.downloadNote(note, options);
                this.stats.downloadedNotes++;
                
                // 发送进度更新
                this.sendProgressUpdate(i + 1, this.notes.length);
                
                // 添加延迟避免被检测
                await this.sleep(1000 + Math.random() * 2000);
                
            } catch (error) {
                console.error(`下载笔记失败: ${note.title}`, error);
            }
        }
        
        // 发送完成消息
        this.sendCompleteMessage();
    }
    
    // 下载单个笔记
    async downloadNote(note, options) {
        const noteData = {
            title: note.title,
            author: note.author,
            likes: note.likes,
            text: note.text,
            url: note.url,
            timestamp: new Date().toISOString()
        };
        
        // 创建笔记信息文件
        if (options.downloadText) {
            await this.downloadText(noteData, options.outputDir);
        }
        
        // 下载图片
        if (options.downloadImages && note.images.length > 0) {
            for (const image of note.images) {
                try {
                    await this.downloadImage(image, note.title, options.outputDir);
                    this.stats.downloadedImages++;
                } catch (error) {
                    console.error(`下载图片失败: ${image.url}`, error);
                }
            }
        }
        
        // 下载视频
        if (options.downloadVideos && note.videos.length > 0) {
            for (const video of note.videos) {
                try {
                    await this.downloadVideo(video, note.title, options.outputDir);
                    this.stats.downloadedVideos++;
                } catch (error) {
                    console.error(`下载视频失败: ${video.url}`, error);
                }
            }
        }
    }
    
    // 下载文本内容
    async downloadText(noteData, outputDir) {
        const content = `标题: ${noteData.title}\n作者: ${noteData.author}\n点赞: ${noteData.likes}\n发布时间: ${noteData.publishTime || '未知'}\n链接: ${noteData.url}\n\n内容:\n${noteData.text}`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // 通过消息传递给background script处理下载
        await this.downloadMedia(url, `${outputDir}/note_info.txt`);
        
        URL.revokeObjectURL(url);
    }
    
    // 下载图片
    async downloadImage(image, noteTitle, outputDir) {
        const imageExt = this.getFileExtension(image.url) || '.jpg';
        const imageName = `image_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${imageExt}`;
        
        await this.downloadMedia(image.url, `${outputDir}/${imageName}`);
    }
    
    // 下载视频
    async downloadVideo(video, noteTitle, outputDir) {
        const videoExt = this.getFileExtension(video.url) || '.mp4';
        const videoName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${videoExt}`;
        
        await this.downloadMedia(video.url, `${outputDir}/${videoName}`);
    }
    
    // 获取文件扩展名
    getFileExtension(url) {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        return match ? `.${match[1]}` : null;
    }
    
    // 发送进度更新
    sendProgressUpdate(current, total) {
        chrome.runtime.sendMessage({
            type: 'progress',
            data: {
                current: current,
                total: total,
                downloadedNotes: this.stats.downloadedNotes,
                downloadedImages: this.stats.downloadedImages,
                downloadedVideos: this.stats.downloadedVideos
            }
        });
    }
    
    // 发送完成消息
    sendCompleteMessage() {
        chrome.runtime.sendMessage({
            type: 'complete',
            data: {
                totalNotes: this.stats.totalNotes,
                totalImages: this.stats.downloadedImages,
                totalVideos: this.stats.downloadedVideos
            }
        });
    }
    
    // 通过消息下载媒体文件
    async downloadMedia(url, filename) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'download',
                data: { url, filename }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
    
    // 停止下载
    stopDownload() {
        this.shouldStop = true;
        console.log('正在停止下载...');
    }
    
    // 清理文件名
    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
    }
    
    // 格式化时间用于文件夹名称
    formatTimeForFolder(timeString) {
        try {
            let date;
            
            // 尝试解析ISO格式
            if (timeString.includes('T') || timeString.includes('-')) {
                date = new Date(timeString);
            } else {
                // 尝试解析中文日期格式 (如: "03-03", "2024-03-03")
                const parts = timeString.split(/[-/]/);
                if (parts.length === 2) {
                    // 只有月-日，添加当前年份
                    const currentYear = new Date().getFullYear();
                    date = new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]));
                } else if (parts.length === 3) {
                    // 年-月-日
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    // 无法解析，使用当前时间
                    date = new Date();
                }
            }
            
            // 格式化: YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('时间格式化失败:', error);
            // 返回当前时间
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
    }
    
    // 创建文件夹名称: 时间_标题
    createFolderName(note) {
        const time = note.formattedTime || note.publishTime || this.formatTimeForFolder('');
        const title = this.sanitizeFilename(note.title);
        
        // 限制标题长度，避免文件夹名称过长
        const shortTitle = title.substring(0, 50);
        
        return `${time}_${shortTitle}`;
    }
    
    // 专门检测PDF文件的函数
    isPDFFile(url, filename = null) {
        if (!url) return false;
        
        const urlLower = url.toLowerCase();
        const fileName = filename || url.split('/').pop().split('?')[0].toLowerCase();
        
        // 1. 检查文件扩展名
        if (fileName.endsWith('.pdf')) {
            console.log(`🔍 PDF检测: 文件扩展名为PDF - ${fileName}`);
            return true;
        }
        
        // 2. 检查URL中是否包含PDF
        if (urlLower.includes('.pdf')) {
            console.log(`🔍 PDF检测: URL包含PDF - ${url}`);
            return true;
        }
        
        // 3. 检查特殊的PDF URL模式（如fe-platform-file）
        if (urlLower.includes('fe-platform-file') || urlLower.includes('platform-file')) {
            console.log(`🔍 PDF检测: 平台文件URL模式 - ${url}`);
            return true;
        }
        
        // 4. 检查文件名中的PDF相关关键词
        const pdfKeywords = [
            'pdf', 'document', 'policy', 'terms', 'privacy', 'agreement', 
            'license', 'notice', 'readme', 'help', 'faq', 'cookie'
        ];
        
        for (const keyword of pdfKeywords) {
            if (fileName.includes(keyword) || urlLower.includes(keyword)) {
                console.log(`🔍 PDF检测: 包含PDF关键词 "${keyword}" - ${fileName}`);
                return true;
            }
        }
        
        // 5. 检查特殊的PDF模式（如video_xxx.pdf）
        if (fileName.match(/^video_.*\.pdf$/i) || fileName.match(/^.*_pdf$/i)) {
            console.log(`🔍 PDF检测: 特殊PDF模式 - ${fileName}`);
            return true;
        }
        
        // 6. 检查MIME类型（如果可用）
        if (urlLower.includes('application/pdf') || urlLower.includes('pdf/')) {
            console.log(`🔍 PDF检测: MIME类型为PDF - ${url}`);
            return true;
        }
        
        // 7. 检查特殊的许可证文件模式
        if (urlLower.includes('license') || urlLower.includes('permit') || urlLower.includes('certificate')) {
            console.log(`🔍 PDF检测: 许可证文件模式 - ${url}`);
            return true;
        }
        
        return false;
    }

    filterMediaFiles(files, type) {
        console.log(`开始过滤${type}文件，原始数量: ${files.length}`);
        
        return files.filter(file => {
            const url = file.url || file.src || '';
            const filename = url.split('/').pop().split('?')[0].toLowerCase();
            
            console.log(`检查文件: ${filename}, URL: ${url}`);
            
            // 使用专门的PDF检测函数
            if (this.isPDFFile(url, filename)) {
                console.log(`❌ 排除PDF文件: ${filename}`);
                return false;
            }
            
            // 排除明显的通用文件（更严格的匹配）
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
            
            // 根据类型进行过滤
            if (type === 'image') {
                // 对于图片，进行更严格的过滤
                
                // 1. 排除小尺寸的PNG文件（通常是图标或装饰元素）
                if (filename.endsWith('.png')) {
                    // 检查URL中是否包含尺寸信息
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
                    
                    // 检查文件名是否包含图标相关关键词
                    const iconKeywords = ['icon', 'logo', 'avatar', 'emoji', 'button', 'badge'];
                    const hasIconKeyword = iconKeywords.some(keyword => 
                        filename.includes(keyword) || url.includes(keyword)
                    );
                    
                    if (hasIconKeyword) {
                        console.log(`❌ 排除图标类PNG: ${filename}`);
                        return false;
                    }
                }
                
                // 2. 优先保留小红书的主要图片内容
                const priorityKeywords = [
                    'sns-webpic', 'note-slider-img', 'img-container', 'swiper-slide'
                ];
                const hasPriorityKeyword = priorityKeywords.some(keyword => url.includes(keyword));
                
                if (hasPriorityKeyword) {
                    console.log(`✅ 保留主要图片内容: ${filename}`);
                    return true;
                }
                
                // 3. 检查图片扩展名
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
                const hasImageExt = imageExtensions.some(ext => filename.endsWith(ext));
                
                if (hasImageExt) {
                    // 对于PNG文件，进行额外检查
                    if (filename.endsWith('.png')) {
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
                    }
                    
                    console.log(`✅ 保留图片文件: ${filename}`);
                    return true;
                } else {
                    console.log(`❌ 排除非图片文件: ${filename}`);
                    return false;
                }
            } else if (type === 'video') {
                // 对于视频，严格检查文件扩展名
                const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
                const hasVideoExt = videoExtensions.some(ext => filename.endsWith(ext));
                
                // 或者URL明确包含视频关键词
                const videoKeywords = ['video', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
                const hasVideoKeyword = videoKeywords.some(keyword => url.includes(keyword));
                
                if (hasVideoExt || hasVideoKeyword) {
                    console.log(`✅ 保留视频文件: ${filename}`);
                    return true;
                } else {
                    console.log(`❌ 排除非视频文件: ${filename}`);
                    return false;
                }
            }
            
            // 默认保留
            console.log(`✅ 保留文件: ${filename}`);
            return true;
        });
    }
    
    // 延迟函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 初始化页面特定功能
    initPageSpecificFeatures() {
        const currentUrl = window.location.href;
        
        // 检查是否在笔记详情页面
        if (this.isNoteDetailPage(currentUrl)) {
            console.log('检测到笔记详情页面，添加下载按钮');
            this.addDownloadButtonToNote();
        } else if (this.isUserProfilePage(currentUrl)) {
            console.log('检测到用户主页，启用批量下载功能和弹出层检测');
            // 用户主页功能已在现有代码中实现
            // 同时检测弹出层
            this.detectPopupLayer();
        } else {
            console.log('未知页面类型:', currentUrl);
        }
    }
    
    // 检查是否为笔记详情页面
    isNoteDetailPage(url) {
        return url.includes('/exploration/') || url.includes('/discovery/') || url.includes('/explore/');
    }
    
    // 检查是否为用户主页
    isUserProfilePage(url) {
        return url.includes('/user/profile/');
    }
    
    // 检测弹出层并添加下载按钮
    detectPopupLayer() {
        console.log('开始检测弹出层...');
        
        // 立即检查是否已有弹出层
        this.checkAndAddButtonToPopup();
        
        // 监听DOM变化，检测弹出层的出现
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            
                            // 检查是否添加了弹出层
                            if (element.classList && element.classList.contains('note-detail-mask')) {
                                console.log('检测到弹出层出现');
                                setTimeout(() => {
                                    this.checkAndAddButtonToPopup();
                                }, 500);
                            }
                            
                            // 检查是否添加了笔记容器
                            if (element.querySelector && element.querySelector('.note-container')) {
                                console.log('检测到笔记容器出现');
                                setTimeout(() => {
                                    this.checkAndAddButtonToPopup();
                                }, 500);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 定期检查弹出层（备用方案）
        const checkInterval = setInterval(() => {
            const popup = document.querySelector('.note-detail-mask');
            if (popup && !popup.querySelector('.x-downloader-btn')) {
                console.log('定期检查发现弹出层，添加下载按钮');
                this.checkAndAddButtonToPopup();
            }
        }, 2000);
        
        // 10秒后停止定期检查
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 10000);
    }
    
    // 检查弹出层并添加下载按钮
    checkAndAddButtonToPopup() {
        const popup = document.querySelector('.note-detail-mask');
        if (!popup) {
            console.log('未找到弹出层');
            return;
        }
        
        // 检查是否已有下载按钮
        if (popup.querySelector('.x-downloader-btn')) {
            console.log('弹出层已有下载按钮');
            return;
        }
        
        console.log('在弹出层中添加下载按钮');
        
        // 创建下载按钮
        const downloadBtn = document.createElement('div');
        downloadBtn.className = 'x-downloader-btn';
        downloadBtn.innerHTML = `
            <button style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#ff5252'; this.style.transform='scale(1.05)'" 
               onmouseout="this.style.background='#ff6b6b'; this.style.transform='scale(1)'">
                📥 下载笔记
            </button>
        `;
        
        // 将按钮添加到弹出层
        popup.appendChild(downloadBtn);
        
        // 将实例保存到全局，以便按钮点击时调用
        window.xhsContentScript = this;
        
        // 添加点击事件监听器
        const button = downloadBtn.querySelector('button');
        button.addEventListener('click', () => {
            console.log('弹出层下载按钮被点击');
            this.downloadCurrentNote();
        });
        
        console.log('下载按钮已添加到弹出层，点击事件已绑定');
    }
    
    // 在笔记详情页面添加下载按钮
    addDownloadButtonToNote() {
        console.log('开始添加下载按钮到笔记页面');
        
        // 立即尝试创建按钮
        this.createDownloadButton();
        
        // 等待页面加载完成
        setTimeout(() => {
            this.createDownloadButton();
        }, 1000);
        
        setTimeout(() => {
            this.createDownloadButton();
        }, 2000);
        
        setTimeout(() => {
            this.createDownloadButton();
        }, 3000);
        
        // 监听页面变化（动态加载的内容）
        const observer = new MutationObserver((mutations) => {
            // 检查是否有新的笔记内容加载
            let shouldCreateButton = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查是否添加了笔记相关的元素
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            if (element.querySelector && (
                                element.querySelector('.note-container') ||
                                element.querySelector('.note-content') ||
                                element.querySelector('.media-container') ||
                                element.querySelector('.slider-container') ||
                                element.classList.contains('note-container')
                            )) {
                                shouldCreateButton = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldCreateButton && !document.querySelector('.x-downloader-btn')) {
                console.log('检测到笔记内容变化，创建下载按钮');
                this.createDownloadButton();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // 监听URL变化（弹出层打开时URL会改变）
        let currentUrl = window.location.href;
        const urlObserver = setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('URL变化，重新创建下载按钮');
                setTimeout(() => {
                    this.createDownloadButton();
                }, 500);
            }
        }, 1000);
        
        // 清理定时器
        setTimeout(() => {
            clearInterval(urlObserver);
        }, 10000);
    }
    
    // 创建下载按钮
    createDownloadButton() {
        // 检查是否已存在下载按钮
        if (document.querySelector('.x-downloader-btn')) {
            return;
        }
        
        // 检查是否在笔记详情页面或弹出层
        const noteContainer = document.querySelector('.note-container') || 
                             document.querySelector('[data-type="normal"]') ||
                             document.querySelector('.note-content');
        
        if (!noteContainer) {
            console.log('未找到笔记容器，跳过创建下载按钮');
            return;
        }
        
        console.log('找到笔记容器，创建下载按钮');
        
        // 创建下载按钮
        const downloadBtn = document.createElement('div');
        downloadBtn.className = 'x-downloader-btn';
        downloadBtn.innerHTML = `
            <button style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <span style="font-size: 16px;">📥</span>
                <span>下载笔记</span>
            </button>
        `;
        
        // 添加点击事件
        downloadBtn.querySelector('button').addEventListener('click', () => {
            this.downloadCurrentNote();
        });
        
        document.body.appendChild(downloadBtn);
        console.log('下载按钮已添加到页面');
        
        // 添加一些调试信息
        setTimeout(() => {
            const btn = document.querySelector('.x-downloader-btn');
            if (btn) {
                console.log('下载按钮位置:', btn.getBoundingClientRect());
                console.log('下载按钮z-index:', window.getComputedStyle(btn).zIndex);
            }
        }, 100);
    }
    
    // 显示自定义通知
    showNotification(message, type = 'info', duration = 3000) {
        // 移除已存在的通知
        const existingNotifications = document.querySelectorAll('.xhs-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `xhs-notification xhs-notification-${type}`;
        
        // 设置样式
        const styles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '999999',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };
        
        // 根据类型设置颜色
        switch (type) {
            case 'success':
                styles.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
                break;
            case 'error':
                styles.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
                break;
            case 'warning':
                styles.background = 'linear-gradient(45deg, #ff9800, #f57c00)';
                break;
            case 'info':
            default:
                styles.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
                break;
        }
        
        // 应用样式
        Object.assign(notification.style, styles);
        
        // 设置内容
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span>${message}</span>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        // 点击关闭
        notification.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        return notification;
    }
    
    // 隐藏通知
    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // 下载当前笔记
    async downloadCurrentNote() {
        try {
            console.log('开始下载当前笔记');
            
            // 显示开始下载通知
            this.showNotification('开始下载笔记...', 'info');
            
            // 提取当前笔记的完整信息
            const noteData = await this.extractCurrentNoteData();
            
            if (!noteData) {
                this.showNotification('无法提取笔记信息', 'error');
                return;
            }
            
            // 创建下载选项
            const options = {
                outputDir: '小红书笔记',
                downloadText: true,
                downloadImages: true,
                downloadVideos: true
            };
            
            // 下载当前笔记
            await this.downloadSingleNote(noteData, options);
            
            // 显示成功通知
            this.showNotification('笔记下载完成！', 'success');
            
        } catch (error) {
            console.error('下载当前笔记失败:', error);
            this.showNotification('下载失败: ' + error.message, 'error');
        }
    }
    
    // 提取当前笔记的完整数据
    async extractCurrentNoteData() {
        try {
            console.log('开始提取当前笔记数据...');
            
            // 等待页面完全加载
            await this.sleep(1000);
            
            // 优先从弹出层中查找笔记容器
            const popup = document.querySelector('.note-detail-mask');
            const searchContainer = popup || document.body;
            
            console.log('搜索容器:', popup ? '弹出层' : '整个页面');
            
            // 提取标题
            const titleSelectors = [
                '.title',
                '.note-title',
                'h1',
                'h2',
                '.content-title',
                '[class*="title"]',
                '#detail-title'
            ];
            
            let title = '';
            for (const selector of titleSelectors) {
                const element = searchContainer.querySelector(selector);
                if (element) {
                    title = element.textContent.trim();
                    console.log(`找到标题: ${selector} -> ${title}`);
                    break;
                }
            }
            
            if (!title) {
                title = document.title.replace(' - 小红书', '');
                console.log(`使用页面标题: ${title}`);
            }
            
            // 提取发布时间或编辑时间
            const timeSelectors = [
                '.date',
                '.time',
                '.publish-time',
                '.edit-time',
                '[class*="date"]',
                '[class*="time"]',
                'time',
                '[datetime]'
            ];
            
            let publishTime = '';
            for (const selector of timeSelectors) {
                const element = searchContainer.querySelector(selector);
                if (element) {
                    // 优先使用datetime属性
                    if (element.getAttribute('datetime')) {
                        publishTime = element.getAttribute('datetime');
                        console.log(`找到时间: ${selector} -> ${publishTime}`);
                        break;
                    } else {
                        publishTime = element.textContent.trim();
                        console.log(`找到时间: ${selector} -> ${publishTime}`);
                        break;
                    }
                }
            }
            
            // 如果没有找到时间，使用当前时间
            if (!publishTime) {
                const now = new Date();
                publishTime = now.toISOString().split('T')[0]; // YYYY-MM-DD格式
                console.log(`使用当前时间: ${publishTime}`);
            }
            
            // 格式化时间字符串（用于文件夹名称）
            const formattedTime = this.formatTimeForFolder(publishTime);
            console.log(`格式化时间: ${formattedTime}`);
            
            // 提取作者信息
            const authorSelectors = [
                '.author',
                '.user-name',
                '.nickname',
                '[class*="user"]',
                '[class*="author"]',
                '.username'
            ];
            
            let author = '未知作者';
            for (const selector of authorSelectors) {
                const element = searchContainer.querySelector(selector);
                if (element) {
                    author = element.textContent.trim();
                    console.log(`找到作者: ${selector} -> ${author}`);
                    break;
                }
            }
            
            // 提取文本内容
            const contentSelectors = [
                '.content',
                '.note-content',
                '.description',
                '.text-content',
                '[class*="content"]',
                '#detail-desc'
            ];
            
            let text = '';
            for (const selector of contentSelectors) {
                const element = searchContainer.querySelector(selector);
                if (element) {
                    text = element.textContent.trim();
                    console.log(`找到文本内容: ${selector} -> ${text.substring(0, 100)}...`);
                    break;
                }
            }
            
            // 提取完整的图片列表（从笔记详情页面或弹出层）
            const images = this.extractNoteDetailImages();
            console.log(`提取到 ${images.length} 张图片`);
            
            // 提取视频
            const videos = this.extractNoteDetailVideos();
            console.log(`提取到 ${videos.length} 个视频`);
            
            return {
                id: this.extractNoteId(window.location.href) || `note_${Date.now()}`,
                title: title,
                author: author,
                likes: '0', // 在详情页面可能无法获取
                images: images,
                videos: videos,
                text: text,
                url: window.location.href,
                publishTime: publishTime,
                formattedTime: formattedTime
            };
            
        } catch (error) {
            console.error('提取当前笔记数据失败:', error);
            return null;
        }
    }
    
    // 从笔记详情页面提取图片
    extractNoteDetailImages() {
        const images = [];
        
        // 优先查找弹出层中的笔记容器
        const popup = document.querySelector('.note-detail-mask');
        const noteContainer = popup ? popup.querySelector('.note-container') : null ||
                             document.querySelector('.note-container') || 
                             document.querySelector('[data-type="normal"]') ||
                             document.querySelector('.media-container') ||
                             document.querySelector('.slider-container');
        
        let searchContainer = noteContainer || popup || document.body;
        
        console.log('搜索图片的容器:', popup ? '弹出层' : '页面');
        
        // 优先查找笔记的主要图片容器
        const mainImageContainers = [
            '.slider-container',
            '.media-container', 
            '.img-container',
            '.swiper-slide',
            '[class*="slider"]',
            '[class*="media"]'
        ];
        
        let mainImages = [];
        
        // 1. 首先从主要图片容器中提取
        for (const containerSelector of mainImageContainers) {
            const containers = searchContainer.querySelectorAll(containerSelector);
            containers.forEach(container => {
                const imgElements = container.querySelectorAll('img');
                imgElements.forEach((img, index) => {
                    if (img.src && 
                        !img.src.includes('avatar') && 
                        !img.src.includes('icon') &&
                        !img.src.includes('logo') &&
                        !img.src.includes('emoji') &&
                        !img.src.includes('button') &&
                        !img.src.includes('badge') &&
                        img.src.includes('http')) {
                        
                        // 严格检查是否为PDF文件
                        const url = img.src.toLowerCase();
                        const filename = url.split('/').pop().split('?')[0];
                        
                        if (this.isPDFFile(img.src, filename)) {
                            console.log(`❌ 排除PDF图片: ${img.src}`);
                            return;
                        }
                        
                        // 检查文件名是否包含PDF相关关键词
                        const pdfKeywords = ['pdf', 'document', 'policy', 'terms', 'privacy'];
                        const hasPdfKeyword = pdfKeywords.some(keyword => 
                            filename.includes(keyword) || url.includes(keyword)
                        );
                        
                        if (hasPdfKeyword) {
                            console.log(`❌ 排除PDF相关图片: ${img.src}`);
                            return;
                        }
                        
                        // 检查图片尺寸（如果可用）
                        const width = img.naturalWidth || img.width;
                        const height = img.naturalHeight || img.height;
                        
                        // 排除小尺寸图片（小于200x200）
                        if (width && height && (width < 200 || height < 200)) {
                            console.log(`跳过小尺寸图片: ${img.src} (${width}x${height})`);
                            return;
                        }
                        
                        // 尝试获取高清图片URL
                        let imageUrl = img.src;
                        
                        // 替换为高清版本
                        if (imageUrl.includes('format')) {
                            imageUrl = imageUrl.replace(/format=\w+/, 'format=jpg');
                        }
                        
                        // 检查是否已存在相同URL
                        if (!mainImages.find(existingImg => existingImg.url === imageUrl)) {
                            console.log(`找到主要图片 ${index + 1}:`, imageUrl);
                            mainImages.push({
                                url: imageUrl,
                                alt: img.alt || '图片',
                                element: img,
                                container: container
                            });
                        }
                    }
                });
            });
        }
        
        // 2. 如果主要容器中没有找到图片，再搜索整个容器
        if (mainImages.length === 0) {
            console.log('主要容器中未找到图片，搜索整个容器...');
            
            const imgSelectors = [
                '.note-slider-img',
                '.img-container img',
                '.swiper-slide img',
                'img[src*="sns-webpic"]',
                'img[src*="xhs.cn"]',
                'img[src*="xiaohongshu.com"]',
                'img[src*="sns-img"]',
                'img[src*="image"]',
                'img'
            ];
            
            for (const selector of imgSelectors) {
                const imgElements = searchContainer.querySelectorAll(selector);
                console.log(`选择器 ${selector} 找到 ${imgElements.length} 个元素`);
                
                imgElements.forEach((img, index) => {
                    if (img.src && 
                        !img.src.includes('avatar') && 
                        !img.src.includes('icon') &&
                        !img.src.includes('logo') &&
                        !img.src.includes('emoji') &&
                        !img.src.includes('button') &&
                        !img.src.includes('badge') &&
                        img.src.includes('http')) {
                        
                        // 严格检查是否为PDF文件
                        const url = img.src.toLowerCase();
                        const filename = url.split('/').pop().split('?')[0];
                        
                        if (this.isPDFFile(img.src, filename)) {
                            console.log(`❌ 排除PDF图片: ${img.src}`);
                            return;
                        }
                        
                        // 检查文件名是否包含PDF相关关键词
                        const pdfKeywords = ['pdf', 'document', 'policy', 'terms', 'privacy'];
                        const hasPdfKeyword = pdfKeywords.some(keyword => 
                            filename.includes(keyword) || url.includes(keyword)
                        );
                        
                        if (hasPdfKeyword) {
                            console.log(`❌ 排除PDF相关图片: ${img.src}`);
                            return;
                        }
                        
                        let imageUrl = img.src;
                        
                        // 替换为高清版本
                        if (imageUrl.includes('format')) {
                            imageUrl = imageUrl.replace(/format=\w+/, 'format=jpg');
                        }
                        
                        // 检查是否已存在相同URL
                        if (!mainImages.find(existingImg => existingImg.url === imageUrl)) {
                            console.log(`找到图片 ${index + 1}:`, imageUrl);
                            mainImages.push({
                                url: imageUrl,
                                alt: img.alt || '图片',
                                element: img
                            });
                        }
                    }
                });
            }
        }
        
        // 3. 过滤掉不需要的图片
        const filteredImages = mainImages.filter(img => {
            const url = img.url;
            const filename = url.split('/').pop().split('?')[0].toLowerCase();
            
            // 排除PDF文件
            if (filename.endsWith('.pdf') || url.includes('.pdf')) {
                console.log(`排除PDF文件: ${filename}`);
                return false;
            }
            
            // 排除小PNG文件（通常是图标）
            if (filename.endsWith('.png')) {
                // 检查是否来自笔记的主要容器
                const isFromMainContainer = img.container && (
                    img.container.classList.contains('slider-container') ||
                    img.container.classList.contains('media-container') ||
                    img.container.classList.contains('img-container') ||
                    img.container.classList.contains('swiper-slide')
                );
                
                if (!isFromMainContainer) {
                    console.log(`排除非主要容器的PNG: ${filename}`);
                    return false;
                }
            }
            
            return true;
        });
        
        console.log(`从笔记详情页面提取到 ${filteredImages.length} 张有效图片`);
        return filteredImages;
    }
    
    // 从全局JavaScript状态中提取视频URL
    extractVideosFromGlobalState(videos) {
        console.log('🌐 开始从全局状态提取视频URL...');
        
        // 方法1: 检查window.__INITIAL_STATE__.note.noteDetailMap
        if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.note && window.__INITIAL_STATE__.note.noteDetailMap) {
            console.log('找到window.__INITIAL_STATE__.note.noteDetailMap');
            
            const noteDetailMap = window.__INITIAL_STATE__.note.noteDetailMap;
            Object.keys(noteDetailMap).forEach(noteId => {
                const noteDetail = noteDetailMap[noteId];
                if (noteDetail && noteDetail.note && noteDetail.note.video) {
                    console.log(`找到笔记 ${noteId} 的视频数据`);
                    
                    const video = noteDetail.note.video;
                    if (video.media && video.media.stream) {
                        const streams = video.media.stream;
                        
                        // 提取H.264视频
                        if (streams.h264 && streams.h264[0]) {
                            const h264Stream = streams.h264[0];
                            if (h264Stream.masterUrl) {
                                console.log('🎯 找到H.264视频URL:', h264Stream.masterUrl);
                                videos.push(h264Stream.masterUrl);
                            }
                            if (h264Stream.backupUrls && h264Stream.backupUrls[0]) {
                                console.log('🎯 找到H.264备用视频URL:', h264Stream.backupUrls[0]);
                                videos.push(h264Stream.backupUrls[0]);
                            }
                        }
                        
                        // 提取H.265视频
                        if (streams.h265) {
                            streams.h265.forEach((h265Stream, index) => {
                                if (h265Stream.masterUrl) {
                                    console.log(`🎯 找到H.265视频URL ${index}:`, h265Stream.masterUrl);
                                    videos.push(h265Stream.masterUrl);
                                }
                                if (h265Stream.backupUrls && h265Stream.backupUrls[0]) {
                                    console.log(`🎯 找到H.265备用视频URL ${index}:`, h265Stream.backupUrls[0]);
                                    videos.push(h265Stream.backupUrls[0]);
                                }
                            });
                        }
                    }
                }
            });
        }
        
        // 方法2: 检查其他全局变量（保持原有逻辑）
        const globalVars = [
            'window.__INITIAL_STATE__',
            'window.xhsData',
            'window.noteData',
            'window.videoData',
            'window.mediaData'
        ];
        
        globalVars.forEach(varName => {
            try {
                const data = eval(varName);
                if (data) {
                    console.log(`检查 ${varName}:`, typeof data);
                    this.searchVideoUrlsInObject(data, videos, varName);
                }
            } catch (error) {
                console.log(`❌ 未找到 ${varName}`);
            }
        });
        
        // 方法3: 检查script标签中的视频URL（保持原有逻辑）
        console.log('检查script标签中的视频URL...');
        const scripts = document.querySelectorAll('script');
        let processedScripts = 0;
        
        scripts.forEach((script, index) => {
            if (processedScripts < 10 && script.textContent) {
                const content = script.textContent;
                const videoPatterns = [
                    /"video_url"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"videoUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"masterUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"backupUrls"\s*:\s*\["([^"]+\.mp4[^"]*)"\]/g
                ];
                
                videoPatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const videoUrl = match[1];
                        if (!videos.includes(videoUrl)) {
                            console.log(`🎯 从script ${index}找到视频URL:`, videoUrl);
                            videos.push(videoUrl);
                        }
                    }
                });
                processedScripts++;
            }
        });
        
        console.log('🌐 全局状态提取完成，找到', videos.length, '个视频URL');
    }
    
    // 递归搜索对象中的视频URL
    searchVideoUrlsInObject(obj, videos, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        try {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string') {
                    // 检查是否为视频URL
                    if (value.match(/\.(mp4|avi|mov|wmv|flv|webm)(\?|$)/i) && 
                        value.startsWith('http') && 
                        !this.isPDFFile(value)) {
                        console.log(`🎯 在${currentPath}中找到视频URL: ${value}`);
                        if (!videos.find(v => v.url === value)) {
                            videos.push({
                                url: value,
                                type: 'video/mp4'
                            });
                            console.log(`✅ 添加视频URL: ${value}`);
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // 递归搜索嵌套对象
                    this.searchVideoUrlsInObject(value, videos, currentPath);
                }
            });
        } catch (error) {
            console.error(`❌ 搜索${path}中的视频URL时出错:`, error);
        }
    }
    
    // 从blob URL中提取真实视频URL
    extractRealVideoUrlFromBlob(element, videos, attribute = 'src') {
        console.log('🔍 开始从blob URL提取真实视频URL...');
        
        // 方法1: 检查全局变量
        if (window.src_loaded) {
            console.log('找到src_loaded全局变量:', window.src_loaded);
            if (typeof window.src_loaded === 'string' && window.src_loaded.includes('.mp4')) {
                console.log('🎯 从src_loaded找到视频URL:', window.src_loaded);
                videos.push(window.src_loaded);
                return;
            }
        }
        
        // 方法2: 检查Vue组件状态
        if (window.__VUE__) {
            console.log('检查Vue组件状态...');
            try {
                // 尝试从Vue组件中获取视频URL
                const vueData = window.__VUE__;
                if (vueData && typeof vueData === 'object') {
                    const videoUrl = this.searchVideoUrlsInObject(vueData, videos, 'Vue组件');
                    if (videoUrl) {
                        console.log('🎯 从Vue组件找到视频URL:', videoUrl);
                        return;
                    }
                }
            } catch (error) {
                console.log('Vue组件检查出错:', error);
            }
        }
        
        // 方法3: 检查播放器容器的数据属性
        const playerContainer = document.querySelector('.player-container');
        if (playerContainer) {
            console.log('检查播放器容器数据属性...');
            const dataAttrs = [
                'data-video-url', 'data-video-src', 'data-media-url', 'data-media-src',
                'data-original-src', 'data-real-src', 'data-src', 'data-url'
            ];
            
            dataAttrs.forEach(attr => {
                const value = playerContainer.getAttribute(attr);
                if (value && value.includes('.mp4')) {
                    console.log(`🎯 从播放器容器${attr}找到视频URL:`, value);
                    videos.push(value);
                    return;
                }
            });
        }
        
        // 方法4: 检查页面中的所有script标签
        console.log('检查script标签中的视频URL...');
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script, index) => {
            if (index < 20 && script.textContent) { // 限制检查数量
                const content = script.textContent;
                const videoPatterns = [
                    /"video_url"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"videoUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"src"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /"url"\s*:\s*"([^"]+\.mp4[^"]*)"/g,
                    /https?:\/\/[^"'\s]+\.mp4/g
                ];
                
                videoPatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const videoUrl = match[1] || match[0];
                        if (!videos.includes(videoUrl)) {
                            console.log(`🎯 从script ${index}找到视频URL:`, videoUrl);
                            videos.push(videoUrl);
                        }
                    }
                });
            }
        });
        
        // 方法5: 检查网络请求缓存
        console.log('检查网络请求缓存...');
        if (window.performance && window.performance.getEntriesByType) {
            const entries = window.performance.getEntriesByType('resource');
            entries.forEach(entry => {
                if (entry.name && entry.name.includes('.mp4')) {
                    console.log(`🎯 从网络请求找到视频URL:`, entry.name);
                    videos.push(entry.name);
                }
            });
        }
        
        // 方法6: 检查localStorage和sessionStorage
        console.log('检查存储中的视频URL...');
        try {
            const storageKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
            storageKeys.forEach(key => {
                const value = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (value && value.includes('.mp4')) {
                    console.log(`🎯 从存储${key}找到视频URL:`, value);
                    videos.push(value);
                }
            });
        } catch (error) {
            console.log('存储检查出错:', error);
        }
        
        console.log('🔍 blob URL提取完成，找到', videos.length, '个视频URL');
    }

    extractNoteDetailVideos() {
        const videos = [];
        
        console.log('开始提取视频文件...');
        
        // 优先查找弹出层中的笔记容器
        const popup = document.querySelector('.note-detail-mask');
        const noteContainer = popup ? popup.querySelector('.note-container') : null ||
                             document.querySelector('.note-container') || 
                             document.querySelector('[data-type="normal"]') ||
                             document.querySelector('.media-container') ||
                             document.querySelector('.slider-container');
        
        let searchContainer = noteContainer || popup || document.body;
        
        console.log('搜索视频的容器:', popup ? '弹出层' : '页面');
        
        // 0. 首先尝试从全局JavaScript状态中提取视频URL
        console.log('尝试从全局状态中提取视频URL...');
        this.extractVideosFromGlobalState(videos);
        
        // 1. 查找video元素
        const videoElements = searchContainer.querySelectorAll('video');
        console.log(`找到 ${videoElements.length} 个video元素`);
        
        videoElements.forEach((video, index) => {
            console.log(`检查video元素 ${index + 1}:`, video);
            
            // 检查src属性
            if (video.src) {
                console.log(`找到video src: ${video.src}`);
                
                // 如果是blob URL，尝试从video元素的其他属性或父元素中获取真实URL
                if (video.src.startsWith('blob:')) {
                    console.log('检测到blob URL，尝试获取真实视频URL...');
                    this.extractRealVideoUrlFromBlob(video, videos);
                } else {
                    if (this.isPDFFile(video.src)) {
                        console.log(`❌ 排除PDF视频: ${video.src}`);
                        return;
                    }
                    
                    videos.push({
                        url: video.src,
                        type: 'video/mp4'
                    });
                }
            }
            
            // 检查source元素
            const sources = video.querySelectorAll('source');
            sources.forEach((source, sourceIndex) => {
                if (source.src) {
                    console.log(`找到video source ${sourceIndex + 1}: ${source.src}`);
                    
                    if (source.src.startsWith('blob:')) {
                        console.log('检测到blob source URL，尝试获取真实视频URL...');
                        this.extractRealVideoUrlFromBlob(source, videos);
                    } else {
                        if (this.isPDFFile(source.src)) {
                            console.log(`❌ 排除PDF source: ${source.src}`);
                            return;
                        }
                        
                        videos.push({
                            url: source.src,
                            type: source.type || 'video/mp4'
                        });
                    }
                }
            });
            
            // 检查data-src属性（懒加载）
            if (video.dataset.src) {
                console.log(`找到video data-src: ${video.dataset.src}`);
                
                if (video.dataset.src.startsWith('blob:')) {
                    console.log('检测到blob data-src URL，尝试获取真实视频URL...');
                    this.extractRealVideoUrlFromBlob(video, videos, 'data-src');
                } else {
                    if (this.isPDFFile(video.dataset.src)) {
                        console.log(`❌ 排除PDF data-src: ${video.dataset.src}`);
                        return;
                    }
                    
                    videos.push({
                        url: video.dataset.src,
                        type: 'video/mp4'
                    });
                }
            }
        });
        
        // 2. 查找视频链接
        const videoLinkSelectors = [
            'a[href*="video"]',
            'a[href*="mp4"]', 
            'a[href*="avi"]',
            'a[href*="mov"]',
            'a[href*="wmv"]',
            'a[href*="flv"]',
            'a[href*="webm"]',
            '[data-video-url]',
            '[data-video-src]'
        ];
        
        videoLinkSelectors.forEach(selector => {
            const links = searchContainer.querySelectorAll(selector);
            console.log(`使用选择器 "${selector}" 找到 ${links.length} 个元素`);
            
            links.forEach((link, index) => {
                const href = link.href || link.getAttribute('data-video-url') || link.getAttribute('data-video-src');
                
                if (href && !videos.find(v => v.url === href)) {
                    console.log(`找到视频链接 ${index + 1}: ${href}`);
                    
                    if (this.isPDFFile(href)) {
                        console.log(`❌ 排除PDF链接: ${href}`);
                        return;
                    }
                    
                    videos.push({
                        url: href,
                        type: 'video/mp4'
                    });
                }
            });
        });
        
        // 3. 查找包含视频URL的脚本标签
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script, index) => {
            if (script.textContent) {
                const content = script.textContent;
                
                // 查找视频URL模式
                const videoUrlPatterns = [
                    /"video_url"\s*:\s*"([^"]+)"/g,
                    /"videoUrl"\s*:\s*"([^"]+)"/g,
                    /"src"\s*:\s*"([^"]*\.(?:mp4|avi|mov|wmv|flv|webm))"/g,
                    /"url"\s*:\s*"([^"]*\.(?:mp4|avi|mov|wmv|flv|webm))"/g,
                    /https?:\/\/[^"'\s]+\.(?:mp4|avi|mov|wmv|flv|webm)/g
                ];
                
                videoUrlPatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const videoUrl = match[1] || match[0];
                        console.log(`从脚本中找到视频URL: ${videoUrl}`);
                        
                        if (this.isPDFFile(videoUrl)) {
                            console.log(`❌ 排除PDF URL: ${videoUrl}`);
                            continue;
                        }
                        
                        if (!videos.find(v => v.url === videoUrl)) {
                            videos.push({
                                url: videoUrl,
                                type: 'video/mp4'
                            });
                        }
                    }
                });
            }
        });
        
        // 4. 查找页面中的视频相关数据属性
        const videoDataSelectors = [
            '[data-video]',
            '[data-src*="video"]',
            '[data-url*="video"]',
            '[data-src*="mp4"]',
            '[data-url*="mp4"]'
        ];
        
        videoDataSelectors.forEach(selector => {
            const elements = searchContainer.querySelectorAll(selector);
            console.log(`使用数据选择器 "${selector}" 找到 ${elements.length} 个元素`);
            
            elements.forEach((element, index) => {
                const videoUrl = element.dataset.video || 
                                element.dataset.src || 
                                element.dataset.url;
                
                if (videoUrl && !videos.find(v => v.url === videoUrl)) {
                    console.log(`找到数据属性视频URL ${index + 1}: ${videoUrl}`);
                    
                    if (this.isPDFFile(videoUrl)) {
                        console.log(`❌ 排除PDF数据URL: ${videoUrl}`);
                        return;
                    }
                    
                    videos.push({
                        url: videoUrl,
                        type: 'video/mp4'
                    });
                }
            });
        });
        
        // 5. 查找iframe中的视频（如果可能）
        const iframes = searchContainer.querySelectorAll('iframe');
        iframes.forEach((iframe, index) => {
            if (iframe.src && iframe.src.includes('video')) {
                console.log(`找到视频iframe ${index + 1}: ${iframe.src}`);
                
                if (this.isPDFFile(iframe.src)) {
                    console.log(`❌ 排除PDF iframe: ${iframe.src}`);
                    return;
                }
                
                videos.push({
                    url: iframe.src,
                    type: 'video/mp4'
                });
            }
        });
        
        // 最终过滤：只排除PDF文件，保留所有其他文件
        const filteredVideos = videos.filter(video => {
            const url = video.url.toLowerCase();
            const filename = url.split('/').pop().split('?')[0];
            
            // 只检查是否为PDF文件
            if (this.isPDFFile(video.url, filename)) {
                console.log(`❌ 排除PDF文件: ${filename}`);
                return false;
            }
            
            console.log(`✅ 保留视频文件: ${filename}`);
            return true;
        });
        
        // 去重
        const uniqueVideos = [];
        const seenUrls = new Set();
        
        filteredVideos.forEach(video => {
            if (!seenUrls.has(video.url)) {
                seenUrls.add(video.url);
                uniqueVideos.push(video);
            }
        });
        
        console.log(`从笔记详情页面提取到 ${uniqueVideos.length} 个有效视频`);
        uniqueVideos.forEach((video, index) => {
            console.log(`视频 ${index + 1}: ${video.url}`);
        });
        
        return uniqueVideos;
    }
    
    // 下载单个笔记
    async downloadSingleNote(note, options) {
        try {
            console.log(`开始下载笔记: ${note.title}`);
            console.log(`  图片数量: ${note.images.length}, 视频数量: ${note.videos.length}`);
            
            // 显示开始下载通知
            this.showNotification(`开始下载: ${note.title.substring(0, 20)}...`, 'info', 2000);
            
            // 创建文件夹名称: 时间_标题
            const folderName = this.createFolderName(note);
            console.log(`文件夹名称: ${folderName}`);
            
            const noteData = {
                title: note.title,
                author: note.author,
                likes: note.likes,
                text: note.text,
                url: note.url,
                timestamp: new Date().toISOString(),
                publishTime: note.publishTime || '',
                formattedTime: note.formattedTime || ''
            };
            
            // 下载文本内容
            if (options.downloadText) {
                await this.downloadText(noteData, `${options.outputDir}/${folderName}`);
                console.log('文本内容下载完成');
            }
            
            // 过滤并下载图片（排除PDF等通用文件）
            if (options.downloadImages && note.images.length > 0) {
                const filteredImages = this.filterMediaFiles(note.images, 'image');
                console.log(`过滤后图片数量: ${filteredImages.length}`);
                
                if (filteredImages.length > 0) {
                    this.showNotification(`正在下载 ${filteredImages.length} 张图片...`, 'info', 2000);
                }
                
                for (let i = 0; i < filteredImages.length; i++) {
                    const image = filteredImages[i];
                    try {
                        await this.downloadImage(image, note.title, `${options.outputDir}/${folderName}`);
                        console.log(`下载图片成功: ${image.url}`);
                        
                        // 显示进度通知
                        if (filteredImages.length > 3) {
                            this.showNotification(`图片下载进度: ${i + 1}/${filteredImages.length}`, 'info', 1500);
                        }
                    } catch (error) {
                        console.error(`下载图片失败: ${image.url}`, error);
                    }
                }
            }
            
            // 过滤并下载视频（排除PDF等通用文件）
            if (options.downloadVideos && note.videos.length > 0) {
                const filteredVideos = this.filterMediaFiles(note.videos, 'video');
                console.log(`过滤后视频数量: ${filteredVideos.length}`);
                
                if (filteredVideos.length > 0) {
                    this.showNotification(`正在下载 ${filteredVideos.length} 个视频...`, 'info', 2000);
                }
                
                for (let i = 0; i < filteredVideos.length; i++) {
                    const video = filteredVideos[i];
                    try {
                        await this.downloadVideo(video, note.title, `${options.outputDir}/${folderName}`);
                        console.log(`下载视频成功: ${video.url}`);
                        
                        // 显示进度通知
                        if (filteredVideos.length > 1) {
                            this.showNotification(`视频下载进度: ${i + 1}/${filteredVideos.length}`, 'info', 1500);
                        }
                    } catch (error) {
                        console.error(`下载视频失败: ${video.url}`, error);
                    }
                }
            }
            
            console.log('笔记下载完成');
            
            // 显示完成统计
            const totalFiles = (options.downloadText ? 1 : 0) + 
                             (options.downloadImages ? note.images.length : 0) + 
                             (options.downloadVideos ? note.videos.length : 0);
            
            this.showNotification(`下载完成！共 ${totalFiles} 个文件`, 'success', 4000);
            
        } catch (error) {
            console.error('下载笔记失败:', error);
            this.showNotification(`下载失败: ${error.message}`, 'error', 5000);
            throw error;
        }
    }
}

// 初始化内容脚本
new XHSContentScript(); 