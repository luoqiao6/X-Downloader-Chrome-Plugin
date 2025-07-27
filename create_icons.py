#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建Chrome插件图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, text="XD"):
    """创建图标"""
    # 创建画布
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景
    draw.ellipse([0, 0, size-1, size-1], fill=(102, 126, 234, 255))
    
    # 添加文字
    try:
        # 尝试使用系统字体
        font_size = size // 3
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
    except:
        # 使用默认字体
        font = ImageFont.load_default()
    
    # 计算文字位置
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    # 绘制文字
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

def main():
    """主函数"""
    # 创建icons目录
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # 创建不同尺寸的图标
    sizes = [16, 48, 128]
    
    for size in sizes:
        icon = create_icon(size)
        filename = f"{icons_dir}/icon{size}.png"
        icon.save(filename, "PNG")
        print(f"创建图标: {filename}")
    
    print("所有图标创建完成！")

if __name__ == '__main__':
    main() 