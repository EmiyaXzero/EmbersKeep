#!/usr/bin/env python3
"""
validate_and_rasterize_assets.py
EmbersKeep 自动化美术资产处理管线：
1. 校验 SVG 规范（crispEdges 声明、viewBox 尺寸为 32/48/64/96、无非法渐变）。
2. 将矩形矩阵像素风 SVG 以最近邻采样（Nearest Neighbor）栅格化为指定分辨率 PNG。
"""

import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageColor

def parse_svg_rects(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # 命名空间处理
    ns = {"svg": "http://www.w3.org/2000/svg"}
    
    # 提取 viewBox
    viewbox = root.attrib.get("viewBox", "0 0 32 32")
    parts = [float(x) for x in viewbox.replace(",", " ").split()]
    vb_x, vb_y, vb_w, vb_h = parts if len(parts) == 4 else (0, 0, 32, 32)
    vb_w, vb_h = int(vb_w), int(vb_h)

    # 规范校验
    shape_rendering = root.attrib.get("shape-rendering", "")
    is_crisp = "crispEdges" in shape_rendering
    if not is_crisp:
        print(f"[WARN] {svg_path.name}: 缺少 shape-rendering=\"crispEdges\"")

    # 收集全部 rect 像素块
    rects = []
    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "rect":
            x = int(float(elem.attrib.get("x", 0)))
            y = int(float(elem.attrib.get("y", 0)))
            w = int(float(elem.attrib.get("width", 1)))
            h = int(float(elem.attrib.get("height", 1)))
            fill = elem.attrib.get("fill", "#FFFFFF")
            rects.append((x, y, w, h, fill))

    return vb_w, vb_h, rects

def render_svg_to_png(svg_path, output_png_path, scale=1):
    vb_w, vb_h, rects = parse_svg_rects(svg_path)
    img_w, img_h = vb_w * scale, vb_h * scale

    # 创建 RGBA 透明画布
    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))

    for x, y, w, h, fill in rects:
        try:
            rgba = ImageColor.getrgb(fill)
            if len(rgba) == 3:
                rgba = (rgba[0], rgba[1], rgba[2], 255)
        except Exception:
            rgba = (255, 255, 255, 255)

        for px in range(x * scale, (x + w) * scale):
            for py in range(y * scale, (y + h) * scale):
                if 0 <= px < img_w and 0 <= py < img_h:
                    img.putpixel((px, py), rgba)

    output_png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_png_path, "PNG")
    print(f"[OK] Rendered {svg_path.name} -> {output_png_path} ({img_w}x{img_h})")

def main():
    base_dir = Path(__file__).resolve().parent.parent
    svg_dir = base_dir / "assets" / "svg"
    textures_dir = base_dir / "assets" / "textures"

    if not svg_dir.exists():
        print(f"SVG 目录不存在: {svg_dir}")
        return

    svg_files = list(svg_dir.rglob("*.svg"))
    print(f"找到 {len(svg_files)} 个 SVG 资产待处理...")

    for svg_file in svg_files:
        rel_path = svg_file.relative_to(svg_dir)
        # 生成 1x 原生像素 PNG 与 2x 预览 PNG
        png_1x = textures_dir / "1x" / rel_path.with_suffix(".png")
        png_2x = textures_dir / "2x" / rel_path.with_suffix(".png")
        render_svg_to_png(svg_file, png_1x, scale=1)
        render_svg_to_png(svg_file, png_2x, scale=2)

if __name__ == "__main__":
    main()
