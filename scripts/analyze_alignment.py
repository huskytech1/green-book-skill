#!/usr/bin/env python3
import sys
from PIL import Image


def analyze_alignment(image_path):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    print(f"图片尺寸: {width}x{height}")

    # 1. 找到数字 "01" 的位置 (在 x=194, y=500-600)
    # 扫描范围 y=450-700 找白色像素
    print("\n=== 找数字 '01' ===")
    num_y_values = []
    for y in range(450, 700):
        for x in range(180, 260):
            pixel = img.getpixel((x, y))
            r, g, b = pixel
            if r > 240 and g > 240 and b > 240:
                num_y_values.append(y)
                break

    if num_y_values:
        num_top = min(num_y_values)
        num_bottom = max(num_y_values)
        num_center = (num_top + num_bottom) / 2
        print(f"数字区域: top={num_top}, bottom={num_bottom}, center={num_center:.1f}")

    # 2. 找到真正的标题文字位置 (x=640, 应该在 y=500-600 附近)
    print("\n=== 找标题文字 (x=640) ===")
    text_y_values = []
    for y in range(400, 900):  # 扫描这个范围
        pixel = img.getpixel((640, y))
        r, g, b = pixel
        if r < 70 and g < 70 and b < 70:  # 黑色文字
            text_y_values.append(y)

    if text_y_values:
        # 找到第一行的顶部
        # 按 y 值分组找连续区域
        text_top = min(text_y_values)
        text_bottom = max(text_y_values)
        text_center = (text_top + text_bottom) / 2
        print(f"标题文字区域: top={text_top}, bottom={text_bottom}")

        # 3. 计算偏差
        if num_center and text_top:
            offset = text_top - num_center
            print(f"\n=== 对齐分析 ===")
            print(f"文字顶部: y={text_top}")
            print(f"数字中心: y={num_center:.1f}")
            print(f"偏差 (文字顶部 - 数字中心): {offset:.1f}px")

            # 调整建议
            # 用户说偏高约半个字 (约20px在1x = 40px在2x)
            # 如果 offset 是负数(文字在数字上方)，需要增加 top 值(下移)
            adjustment_2x = offset + 40  # 补偿偏高
            adjustment_1x = int(adjustment_2x / 2)

            print(f"\n=== 建议调整 ===")
            print(f"当前 CSS top: 293")
            print(f"建议新 top 值: {293 + adjustment_1x}")
    else:
        print("找不到标题文字")


if __name__ == "__main__":
    image_path = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "/Users/huskytech/Downloads/智造三点三 0304V2/01-cover.png"
    )
    analyze_alignment(image_path)
