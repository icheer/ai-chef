# 智能食谱生成器

基于AI技术的智能食谱生成器，用户只需输入家中现有食材，AI即可生成个性化、创意且实用的食谱。

## 技术栈

- **Cloudflare Workers**: 前后端一体化部署
- **Vue 3**: 前端框架 (Options API)
- **Gemini API**: AI模型集成
- **localStorage**: 数据持久化
- **SweetAlert2**: 用户界面提示
- **html2canvas**: 食谱分享功能

## 项目结构

```
smart-recipe-generator/
├── worker.js              # 主Worker服务
├── static/               # 静态资源目录
│   ├── index.html        # 主页面
│   ├── styles.css        # 样式文件
│   └── app.js            # 前端逻辑
├── prompts/
│   └── cook-prompt.md    # AI提示词模板
├── wrangler.toml         # Cloudflare配置
└── README.md
```

## 功能特点

- 🍳 **零浪费厨房**: 充分利用现有食材
- 🤖 **AI驱动**: 智能食谱生成
- 📱 **移动优先**: 响应式设计
- 💾 **数据持久化**: 自动保存用户数据
- 📤 **一键分享**: 生成精美食谱图片

## 开发状态

项目正在按照开发路线图进行实施：
- ✅ 项目结构初始化
- 🔄 正在开发基础架构
- ⏳ 待开发UI界面
- ⏳ 待集成AI功能

## 部署

使用 Cloudflare Workers 进行部署：

```bash
npx wrangler deploy
```

## 环境配置

需要在Cloudflare Workers中配置以下环境变量：
- `GEMINI_API_KEYS`: Gemini API密钥列表
- `GEMINI_BASE_URL`: Gemini API基础URL
