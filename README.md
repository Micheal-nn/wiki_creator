# Wiki Creator

输入任意知识点，自动搜索学术、技术、通用多源信息，结合大模型生成由浅入深的 4 层金字塔结构 Wiki，图文结合深入浅出。

## 功能特性

- 🔍 **多源搜索聚合** - 4 种数据源
  - **Tavily** (通用搜索) - 需要 API Key
  - **Semantic Scholar** (学术论文) - 免费 API
  - **arXiv** (预印本论文) - 免费 API
  - **GLM5 知识库** (LLM 直接查询) - 需要 API Key
- 🧠 **智能 LLM 编排** - 知识类型判定 → 大纲生成 → 逐层填充 → 图表决策
- 📊 **图表渲染** - Mermaid 流程图 + html-to-image 信息图
- 📝 **4 层金字塔结构**:
  - Layer 1: 直觉层 (10 秒理解)
  - Layer 2: 原理层 (为什么能这样做)
  - Layer 3: 深入层 (完整理解)
  - Layer 4: 应用层 (怎么用)

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
