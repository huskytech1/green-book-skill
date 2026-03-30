const path = require('path');

module.exports = [
  {
    coverTitle: "示例科技新闻\n请替换正式内容",
    headerTitle: "示例科技新闻\n生成小绿书卡片",
    summary: "这是一条用于演示 green-book 技能的数据样例，方便你在正式生成前确认字段格式、标题断行和摘要长度是否符合要求。发布前请将其替换为真实新闻内容，并补充准确的英文视觉关键词；若你已有本地配图，也可填写 uploadedImage 绝对路径，直接生成正式封面、内页图片与插图缓存。",
    visualKeywords: "technology news briefing, editorial illustration, clipboard design, futuristic interface, green book layout",
    filename: "sample-news",
    uploadedImage: path.join(__dirname, '..', 'assets', 'cover-template.png')
  }
];
