# 🍎 宝宝辅食助手

一个帮助新手爸妈科学喂养宝宝的 Web 应用，提供辅食计划、食材百科、成长记录等功能。

## ✨ 功能特性

### 📝 辅食计划
- 按月龄智能推荐每日辅食搭配
- 食材相克检测，避免不当搭配
- 支持自定义食材添加
- 一键生成每日辅食清单

### 📚 食材百科
- 丰富的食材营养价值信息
- 食材相生相克关系查询
- 推荐添加月龄与过敏风险提示
- 支持拼音搜索（如输入 "hongshu" 搜索红薯）

### 📅 辅食时间表
- 按月龄划分的辅食添加指南
- 从 6 个月到 24 个月的详细建议
- 月龄自动计算（输入宝宝生日即可）

### 📈 成长记录
- 记录宝宝身高、体重发育数据
- 自动计算 BMI 指数
- 生成发育曲线图表
- 支持多宝宝档案管理

### ✅ 排敏进度
- 追踪食材过敏测试状态
- 标记已通过/过敏/待测试
- 辅助科学排敏计划制定

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **样式**: 纯 CSS，响应式设计
- **数据存储**: LocalStorage（本地存储，无需后端）
- **PWA 支持**: Service Worker + Web App Manifest

## 🚀 快速开始

### 在线使用
直接访问：`https://yourusername.github.io/baby-food-helper/`

### 本地运行
1. 克隆仓库
```bash
git clone https://github.com/yl13114/baby-food-helper.git
cd baby-food-helper
```

2. 启动本地服务器
```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js
npx serve .

# 或使用 PHP
php -S localhost:8080
```

3. 打开浏览器访问 `http://localhost:8080`

## 📱 PWA 安装

本应用支持作为 PWA 安装到手机桌面：

1. 在手机浏览器中打开应用
2. 点击浏览器的"添加到主屏幕"选项
3. 即可像原生应用一样使用

## 📂 项目结构

```
baby-food-helper/
├── index.html              # 主页面
├── meal-planner.html       # 辅食计划页面
├── food-encyclopedia.html  # 食材百科页面
├── feeding-schedule.html   # 辅食时间表页面
├── growth-tracker.html     # 成长记录页面
├── allergy-tracker.html    # 排敏进度页面
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker
├── css/
│   └── style.css          # 全局样式
├── js/
│   ├── app.js             # 主应用逻辑
│   ├── storage.js         # 本地存储管理
│   ├── meal-planner.js    # 辅食计划逻辑
│   ├── encyclopedia.js    # 食材百科逻辑
│   ├── schedule.js        # 辅食时间表逻辑
│   ├── growth.js          # 成长记录逻辑
│   └── allergy-tracker.js # 排敏进度逻辑
└── data/
    ├── food-nutrition.json # 食材营养数据
    └── food-relations.json # 食材相克数据
```

## 🍼 数据来源

食材营养数据基于权威营养学资料整理，包括：
- 中国营养学会推荐的婴幼儿喂养指南
- 各类食材的标准营养成分表
- 常见食材过敏风险评估

## ⚠️ 免责声明

本应用提供的信息仅供参考，不构成医疗建议。宝宝的具体喂养方案请咨询儿科医生或专业营养师。

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

- 感谢所有为婴幼儿营养学研究做出贡献的专业人士
- 感谢开源社区的支持与帮助

---

**为每一位用心的父母点赞！** 👨‍👩‍👧‍👦
