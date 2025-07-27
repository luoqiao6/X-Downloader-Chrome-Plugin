#!/bin/bash

# X-Downloader Chrome 插件安装脚本

echo "🎀 X-Downloader Chrome 插件安装脚本"
echo "=================================="

# 检查是否在正确的目录
if [ ! -f "manifest.json" ]; then
    echo "❌ 错误: 请在 chrome_extension 目录中运行此脚本"
    exit 1
fi

# 创建简单图标的函数
create_simple_icons() {
    mkdir -p icons
    
    # 创建简单的SVG图标
    cat > icons/icon.svg << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="60" fill="#667eea"/>
  <text x="64" y="75" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">XD</text>
</svg>
EOF
    
    echo "✅ 创建了SVG图标文件"
}

# 创建图标（如果不存在）
if [ ! -d "icons" ] || [ ! -f "icons/icon16.png" ]; then
    echo "📝 创建图标文件..."
    
    # 检查是否有Python和PIL
    if command -v python3 &> /dev/null; then
        if python3 -c "import PIL" &> /dev/null; then
            python3 create_icons.py
        else
            echo "⚠️  警告: 未安装PIL库，将创建简单的图标文件"
            create_simple_icons
        fi
    else
        echo "⚠️  警告: 未找到Python3，将创建简单的图标文件"
        create_simple_icons
    fi
fi

# 检查文件完整性
echo "🔍 检查文件完整性..."
required_files=("manifest.json" "popup.html" "popup.js" "content.js" "background.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ 缺少必要文件:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo "✅ 所有必要文件都存在"

# 创建打包文件
echo "📦 创建插件打包文件..."
if command -v zip &> /dev/null; then
    zip -r x-downloader.zip . -x "*.git*" "README.md" "install.sh" "create_icons.py"
    echo "✅ 创建了 x-downloader.zip"
else
    echo "⚠️  警告: 未找到zip命令，跳过打包"
fi

# 显示安装说明
echo ""
echo "🎉 插件文件准备完成！"
echo ""
echo "📋 安装步骤："
echo "1. 打开Chrome浏览器"
echo "2. 在地址栏输入: chrome://extensions/"
echo "3. 打开右上角的'开发者模式'开关"
echo "4. 点击'加载已解压的扩展程序'"
echo "5. 选择当前目录: $(pwd)"
echo "6. 插件安装完成！"
echo ""
echo "📱 使用方法："
echo "1. 登录小红书账号"
echo "2. 打开要下载的用户主页"
echo "3. 点击浏览器工具栏中的插件图标"
echo "4. 配置下载选项并开始下载"
echo ""
echo "📁 文件结构："
ls -la
echo ""
echo "✨ 安装完成！请按照上述步骤在Chrome中安装插件。" 