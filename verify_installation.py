#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证Chrome插件安装文件
"""

import os
import json

def verify_installation():
    """验证插件安装文件"""
    print("🎀 X-Downloader Chrome 插件安装验证")
    print("=" * 50)
    
    # 必要文件列表
    required_files = [
        "manifest.json",
        "popup.html", 
        "popup.js",
        "content.js",
        "background.js"
    ]
    
    # 检查文件存在性
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
        else:
            print(f"✅ {file}")
    
    if missing_files:
        print(f"\n❌ 缺少文件: {missing_files}")
        return False
    
    # 验证manifest.json格式
    try:
        with open("manifest.json", "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        # 检查必要字段
        required_fields = ["manifest_version", "name", "version", "permissions"]
        for field in required_fields:
            if field not in manifest:
                print(f"❌ manifest.json 缺少字段: {field}")
                return False
        
        print(f"✅ manifest.json 格式正确 (版本: {manifest.get('version', 'unknown')})")
        
    except json.JSONDecodeError as e:
        print(f"❌ manifest.json 格式错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 读取manifest.json失败: {e}")
        return False
    
    # 检查文件大小
    print("\n📊 文件大小统计:")
    total_size = 0
    for file in required_files:
        size = os.path.getsize(file)
        total_size += size
        print(f"   {file}: {size:,} bytes")
    
    print(f"   总计: {total_size:,} bytes")
    
    # 检查icons目录
    if os.path.exists("icons"):
        print("✅ icons 目录存在")
        icons = os.listdir("icons")
        if icons:
            print(f"   包含文件: {', '.join(icons)}")
        else:
            print("   ⚠️  icons 目录为空")
    else:
        print("⚠️  icons 目录不存在 (可选)")
    
    print("\n🎉 验证完成！插件文件完整，可以正常安装。")
    print("\n📋 安装步骤:")
    print("1. 打开 Chrome 浏览器")
    print("2. 访问 chrome://extensions/")
    print("3. 启用开发者模式")
    print("4. 点击'加载已解压的扩展程序'")
    print("5. 选择当前目录")
    
    return True

if __name__ == "__main__":
    verify_installation() 