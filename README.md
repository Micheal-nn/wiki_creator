# Wiki Creator

输入任意知识点，自动搜索学术、技术、通用多源信息，结合大模型生成由浅入深的 4 层金字塔结构 Wiki，图文结合深入浅出。

<img width="1906" height="974" alt="image" src="https://github.com/user-attachments/assets/517317fd-5d23-464c-89ec-b2874e6575fd" />
<img width="3784" height="1951" alt="image-2" src="https://github.com/user-attachments/assets/ac075c37-cea0-4a57-8701-a5144c75c27c" />
<img width="3805" height="1945" alt="image-1" src="https://github.com/user-attachments/assets/b497f7a8-e3bf-4664-8c68-9ec59e7d13c9" />


## 核心特性

### 🔍 多源权威信息聚合

4 种数据源并行搜索，智能聚合策略：

| 数据源 | 类型 | 说明 |
|--------|------|------|
| **Tavily** | 通用搜索 | 为 AI 应用优化的搜索引擎 |
| **Semantic Scholar** | 学术论文 | 学术论文数据库，高可信度 |
| **arXiv** | 预印本论文 | 最新研究前沿 |
| **GLM5 知识库** | LLM 知识 | 智谱 AI 大模型直接知识查询 |

**聚合策略**：
- 每种数据源贡献 top 20 结果（按可信度排序）
- 最大 80 条参考来源
- 中英文智能翻译（中文术语自动翻译为英文搜索学术 API）
- 失败来源显示警告，不阻塞流程

### 📝 4 层金字塔知识结构

渐进式理解，从直觉到深度：

```
┌─────────────────────────────────────────────┐
│ Layer 1: 直觉层 (10秒理解)                  │
│ 一句话定义 + 生活类比 + 概念图               │
└─────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ Layer 2: 原理层 (为什么能这样做)             │
│ 核心逻辑 + 关键推导 + 原理图                 │
└─────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ Layer 3: 深入层 (完整理解，可折叠)           │
│ 完整推导 + 边界情况 + 概念关系对比           │
└─────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ Layer 4: 应用层 (怎么用)                    │
│ 实际应用场景 + 代码示例 + 常见误区           │
└─────────────────────────────────────────────┘
```

### 🧠 智能知识分类

系统自动识别知识点类型，针对性生成内容：

| 类型 | 特点 | 侧重点 |
|------|------|--------|
| 数学原理型 | 公式、定理 | 公式推导 + 直觉解释 |
| 物理原理型 | 物理定律 | 物理直觉 + 实验类比 |
| 架构/系统型 | 软件架构 | 组件关系 + 数据流 |
| 逻辑/算法型 | 算法、数据结构 | 步骤拆解 + 复杂度分析 |
| 概念/理论型 | 抽象概念 | 定义 + 历史 + 多角度对比 |
| 实践/工具型 | 工具、框架 | 使用场景 + 最佳实践 |

### 📊 图表可视化

智能图表选择，仅在关键理解点添加：

| 类型 | 使用场景 | 渲染方式 |
|------|----------|----------|
| Mermaid 流程图 | 执行步骤、系统架构、决策分支 | 客户端 mermaid.js |
| Mermaid 思维导图 | 概念层级、知识结构 | 客户端 mermaid.js |

### 🌐 中英文智能翻译

- 输入中文知识点时，自动调用 LLM 翻译为英文
- 学术 API（Semantic Scholar、arXiv）优先使用英文查询，获取更精准结果
- 翻译失败时自动回退到中文查询，确保流程不中断

### ✨ 现代加载动画

生成过程中显示：
- 脉冲动画图标
- 步骤文字淡入淡出
- 流动进度条
- 波浪呼吸圆点

## 快速开始（3 步）

### 步骤 1: 安装依赖

```bash
npm install
```

### 步骤 2: 配置 API Key

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 API Key：

```env
# Tavily Search API (必需 - 通用搜索)
TAVILY_API_KEY=tvly-your-key-here

# GLM5 API (必需 - LLM 生成 + LLM 知识查询)
GLM5_API_KEY=your-glm5-key-here
GLM5_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

**获取 API Key:**
| API | 用途 | 获取地址 | 是否免费 |
|-----|------|----------|----------|
| **Tavily** | 通用搜索 | https://tavily.com/ | ✅ 免费额度 |
| **GLM5** | LLM 生成 | https://open.bigmodel.cn/ | ✅ 免费额度 |
| Semantic Scholar | 学术论文 | 无需 Key | ✅ 免费公开 API |
| arXiv | 预印本论文 | 无需 Key | ✅ 免费公开 API |

### 步骤 3: 启动服务

```bash
npm run dev
```

浏览器打开 http://localhost:3000 开始使用！

**完成！** 🎉

---

## 部署到 Vercel

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/wiki-creator)

### 手动部署步骤

1. **Fork 或 Clone 本项目到 GitHub**

2. **在 Vercel 创建新项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 导入你的 GitHub 仓库

3. **配置环境变量**
   
   在 Vercel 项目设置中添加环境变量：
   
   | 变量名 | 说明 | 必需 |
   |--------|------|------|
   | `TAVILY_API_KEY` | Tavily 搜索 API | ✅ |
   | `GLM5_API_KEY` | 智谱 AI API Key | ✅ |
   | `GLM5_BASE_URL` | GLM5 API 地址 | ❌ |
   
   或者在用户首次访问时通过网页设置页面输入。

4. **部署**
   - Vercel 会自动检测 Next.js 并部署
   - 部署完成后访问分配的域名即可使用

### 注意事项

- **数据库**: Vercel 使用临时文件系统，SQLite 数据库会在每次部署时重置。如需持久化数据，建议：
  - 迁移到 Vercel Postgres / Neon / PlanetScale
  - 或使用本地部署方案
  
- **API 超时**: Wiki 生成使用 SSE 流式响应，支持长时间运行（最长 5 分钟）

---

## 数据源说明

Wiki Creator 使用 4 种数据源进行知识搜索：

| 数据源 | 类型 | 需要 Key | 说明 |
|--------|------|----------|------|
| **Tavily** | `general` | ✅ 是 | 通用搜索引擎，覆盖广泛 |
| **Semantic Scholar** | `academic` | ❌ 否 | 学术论文数据库，高可信度 |
| **arXiv** | `academic` | ❌ 否 | 预印本论文，最新研究 |
| **GLM5 知识库** | `llm` | ✅ 是 | LLM 直接知识查询 |

**注意**: 
- Semantic Scholar 和 arXiv 使用公开 API，无需配置 Key
- 如果某些数据源无法访问（网络问题），系统会自动跳过并继续使用其他数据源

---

## 常见问题

**Q: 提示 "API key required"**
A: 检查 `.env.local` 中 `TAVILY_API_KEY` 和 `GLM5_API_KEY` 是否正确配置

**Q: 只有"通用来源"，没有学术来源**
A: 
1. 检查网络是否能访问 `api.semanticscholar.org` 和 `export.arxiv.org`
2. 查看终端日志中的 `[Search]` 开头的消息，了解各数据源的搜索状态
3. 某些网络环境可能需要代理才能访问学术 API

**Q: 数据库错误**
A: 删除 `data/wiki-creator.db` 后重新运行 `npm run dev`

**Q: 端口被占用**
A: 修改端口：`npm run dev -- -p 3001`

**Q: Windows 上出现 Turbopack panic 错误**
A: 这是 Tailwind CSS v4 + Turbopack 在 Windows 上的已知兼容性问题。项目已默认使用 webpack 模式 (`next dev --webpack`)。如需使用 Turbopack，可运行 `npm run dev:turbo`，但在 Windows 上可能不稳定。

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `TAVILY_API_KEY` | Tavily 搜索 API | 是 |
| `GLM5_API_KEY` | 智谱 AI API Key | 是 |
| `GLM5_BASE_URL` | GLM5 API 地址 | 否 |
| `DATABASE_PATH` | SQLite 数据库路径 | 否 |

## 可用的 npm 脚本

```bash
npm run dev          # 启动开发服务器
npm run build       # 构建生产版本
npm run start       # 启动生产服务器
npm run db:push     # 推送数据库 schema
npm run db:studio   # 打开数据库可视化工具
```

## 技术栈

- **框架**: Next.js 16 + React 19
- **样式**: TailwindCSS + shadcn/ui (Light Mode)
- **数据库**: SQLite + Drizzle ORM
- **LLM**: GLM5 (智谱 AI)
- **搜索**: Tavily + Semantic Scholar + arXiv + GLM5
- **图表**: Mermaid.js

## License

MIT
