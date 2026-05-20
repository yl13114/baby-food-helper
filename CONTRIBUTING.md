# 贡献指南

感谢你对宝宝辅食助手项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题
如果你发现了 bug 或有改进建议：

1. 先检查 [Issues](https://github.com/yl13114/baby-food-helper/issues) 确认是否已有相同问题
2. 如果没有，请创建新的 Issue，包含：
   - 清晰的问题描述
   - 复现步骤（如果是 bug）
   - 截图或错误信息（如果适用）
   - 你的浏览器和设备信息

### 提交代码

#### 1. Fork 项目
点击页面右上角的 Fork 按钮

#### 2. 克隆你的 Fork
```bash
git clone https://github.com/your-username/baby-food-helper.git
cd baby-food-helper
```

#### 3. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

分支命名规范：
- `feature/xxx` - 新功能
- `fix/xxx` - 修复 bug
- `docs/xxx` - 文档更新
- `style/xxx` - 样式调整

#### 4. 进行修改并测试
- 保持代码简洁清晰
- 确保功能正常工作
- 在不同设备上测试（特别是移动端）

#### 5. 提交代码
```bash
git add .
git commit -m "feat: 添加新功能描述"
```

提交信息规范：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 样式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

#### 6. 推送到你的 Fork
```bash
git push origin feature/your-feature-name
```

#### 7. 创建 Pull Request
- 访问原仓库的 Pull Requests 页面
- 点击 "New pull request"
- 选择你的分支
- 填写清晰的 PR 描述

## 开发环境

### 本地运行
```bash
# 克隆项目
git clone https://github.com/yl13114/baby-food-helper.git
cd baby-food-helper

# 启动本地服务器（选择任一方式）
python -m http.server 8080
# 或
npx serve .
# 或
php -S localhost:8080
```

### 代码规范
- 使用 2 空格缩进
- 保持代码简洁，避免过度注释
- 函数和变量命名清晰有意义
- 遵循 ES6+ 语法规范

## 功能建议

如果你有新功能建议：

1. 详细描述你的想法
2. 说明为什么这个功能对用户有帮助
3. 如果可能，提供设计草图或示例
4. 考虑实现的复杂度和可行性

## 数据贡献

### 添加新食材
如果你想添加新的食材数据：

1. 编辑 `data/food-nutrition.json`
2. 按照现有格式添加食材信息
3. 确保数据准确可靠
4. 添加数据来源说明

### 修正营养信息
如果你发现营养信息有误：

1. 提供可靠的数据来源
2. 说明具体的错误和正确值
3. 提交修改建议

## 社区行为准则

- 尊重每一位贡献者
- 保持友善和建设性的讨论
- 专注于技术问题
- 欢迎新手提问

## 联系方式

如有任何问题，可通过以下方式联系：
- 提交 Issue
- 发送邮件至项目维护者

感谢你的贡献！🎉
