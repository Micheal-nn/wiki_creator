# Wiki Creator 设计文档

> 日期: 2026-04-02
> 状态: 已批准

## 1. 项目目标

输入一个不了解的知识点，系统通过全网搜索获取权威信息，结合大模型整理成结构化的讲解 Wiki，图文结合，深入浅出。

## 2. 核心需求

| 维度 | 选择 |
|---|---|
| 产品形态 | Web 应用，支持输入/编辑/导出 Markdown |
| 讲解风格 | 结构化拆解 + 问题驱动 + 可视化优先 + 费曼风格 |
| 图的形式 | 流程图 + AI 示意图 + 信息图/长图卡片，智能选择 |
| 搜索方式 | 搜索引擎 + 学术源 + LLM 质量筛选 + LLM 知识融合 |
| LLM | GLM5 API，用户自带 Key |
| 小红书 | Phase 2 实现（全套：图 + 文案 + 标签） |

## 3. 架构设计

### 3.1 精简架构：纯 Next.js 一体化

不依赖 Dify 等外部 AI 平台，LLM 编排逻辑用 TypeScript 代码实现。

```
┌───────────────────────────────────────────────────┐
│            Next.js 应用 (全栈)                     │
│                                                   │
│  前端:                                             │
│  ├─ Wiki 编辑器 (Tiptap)                          │
│  ├─ 设置页 (API Key/偏好)                          │
│  └─ 历史记录页                                     │
│                                                   │
│  后端 API Routes:                                  │
│  ├─ /api/search   → 搜索聚合                      │
│  ├─ /api/generate → Wiki 生成                      │
│  ├─ /api/export   → 导出 Markdown                  │
│  └─ /api/sections → 单章节操作                     │
│                                                   │
│  内部模块:                                         │
│  ├─ LLM 编排器 (TypeScript, 搜索→筛选→生成)       │
│  ├─ 搜索适配器 (多源统一接口)                      │
│  ├─ 图表渲染器 (Mermaid + html-to-image)           │
│  └─ Prompt 模板库                                  │
│                                                   │
│  数据: SQLite (单文件, Drizzle ORM)                │
└───────────────────────────────────────────────────┘

外部依赖 (纯 API 调用):
├─ GLM5 API (LLM)
├─ Tavily API (主搜索)
├─ Semantic Scholar API (学术论文, 免费)
├─ arXiv API (预印本, 免费)
└─ 可选: DALL-E API (AI 配图)
```

### 3.2 部署

- 开发: `npm run dev` 一键启动
- 生产: Docker 单容器 或 Vercel 一键部署
- 数据: SQLite 单文件，备份方便

### 3.3 未来扩展

| Phase | 功能 | 实现方式 |
|---|---|---|
| Phase 2 | 小红书全套（图 + 文案 + 标签） | Dify Workflow 或代码编排 |
| Phase 2 | 自建知识库 RAG | ChromaDB 向量数据库 |
| Phase 2 | MCP 工具协议 | MCP 客户端统一工具调用 |
| Phase 3 | 多用户 | SQLite → PostgreSQL |
| Phase 3 | Prompt 热更新 | 数据库存储 Prompt 模板 |

## 4. 核心工作流

### 4.1 Step 1: 多源权威信息收集 + LLM 知识融合

```
用户输入知识点
      │
      ▼
第一层：多源并行搜索（信息广度）
├─ 学术源: Semantic Scholar + arXiv + Wikipedia
├─ 技术源: Stack Overflow + 官方文档 + GitHub
└─ 通用源: Tavily/Bing 搜索引擎 + 知乎
      │
      ▼
第二层：LLM 质量筛选 + 可信度标注（信息精度）
├─ 去重合并
├─ 可信度评分 (1-5): 5=学术论文, 4=权威教材, 3=高赞社区, 2=普通博客, 1=无来源
├─ 保留 ≥ 3 分的信息源
└─ 标注类型: [定义] [原理] [类比] [应用] [误区]
      │
      ▼
第三层：LLM 自身知识融合（信息深度）
├─ 识别搜索盲区
├─ LLM 补充数学推导/物理直觉/历史脉络
└─ 标注来源: [搜索来源] vs [模型补充]
      │
      ▼
结构化素材包（带可信度+类型+来源标注）
```

### 4.2 Step 2: Wiki 内容生成（由浅入深金字塔结构）

```
Phase A: 知识点类型判定
├─ 数学原理型 → 公式推导 + 直觉解释
├─ 物理原理型 → 物理直觉 + 实验类比
├─ 架构/系统型 → 架构图 + 组件关系 + 数据流
├─ 逻辑/算法型 → 步骤拆解 + 复杂度分析
├─ 概念/理论型 → 定义 + 历史 + 多角度对比
└─ 实践/工具型 → 使用场景 + 操作步骤 + 最佳实践

Phase B: 4层金字塔内容生成
┌─ Layer 1: 直觉层 (10秒理解) ─────────────────┐
│  一句话定义 + 生活类比 + 概念图               │
└───────────────────────────────────────────────┘
                    ▼
┌─ Layer 2: 原理层 (为什么能这样做) ─────────────┐
│  核心逻辑 + 关键推导 + 原理图                 │
│  ├─ 数学原理: 公式推导(每步有注释)            │
│  ├─ 物理原理: 物理直觉 + 为什么是这个公式      │
│  ├─ 架构说明: 组件关系 + 数据流 + 设计决策     │
│  └─ 逻辑说明: 推理链条 + 前提假设              │
└───────────────────────────────────────────────┘
                    ▼
┌─ Layer 3: 深入层 (完整理解, 可折叠) ──────────┐
│  严格推导 + 边界情况 + 概念关系               │
│  ├─ 完整数学证明 (可折叠)                     │
│  ├─ 特殊情况与局限性                          │
│  ├─ 与相关概念的对比 (Venn图/表格)            │
│  └─ 历史背景: 为什么被发明/发现               │
└───────────────────────────────────────────────┘
                    ▼
┌─ Layer 4: 应用层 (怎么用) ─────────────────────┐
│  实际应用场景 + 代码示例 + 常见误区           │
│  ├─ 真实应用案例                              │
│  ├─ 代码/工具示例                             │
│  ├─ 常见误区与纠正                            │
│  └─ 延伸阅读推荐                              │
└───────────────────────────────────────────────┘

Phase C: 图表决策
├─ Layer 1 → 概念图/AI示意图
├─ Layer 2 → 流程图/架构图/推导图
├─ Layer 3 → 对比表/关系图
└─ Layer 4 → 信息图/应用场景图
+ 全文思维导图（概览入口）
```

### 4.3 Step 3: 用户编辑 & 导出

- 左右分栏编辑器：Markdown 源码 + 实时渲染预览
- 支持单章节重新生成
- 一键导出 Markdown 文件

## 5. 数据模型

### 5.1 users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| name | TEXT | 用户名 |
| api_key | TEXT | 加密存储的 GLM5 Key |
| api_provider | TEXT | 默认 glm5, 可选其他 |
| preferences | JSON | 讲解风格偏好 |
| created_at | TIMESTAMP | 创建时间 |

### 5.2 wikis

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| user_id | UUID FK | → users |
| topic | TEXT | 知识点名称 |
| knowledge_type | TEXT | 数学/物理/架构/逻辑/概念/实践 |
| status | ENUM | draft / generating / ready |
| outline | JSON | 大纲结构 |
| content | JSON | Tiptap 文档格式 |
| markdown | TEXT | 原始 Markdown |
| sources | JSON | 引用来源列表+可信度 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 5.3 wiki_sections

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| wiki_id | UUID FK | → wikis |
| layer | INT | 1-4, 金字塔层级 |
| title | TEXT | 章节标题 |
| content | JSON | Tiptap 文档格式 |
| markdown | TEXT | Markdown 内容 |
| image_urls | JSON | 本节配图 URL 列表 |
| image_types | JSON | 配图类型 |
| order | INT | 排序 |
| regenerations | INT | 重生成次数 |

### 5.4 search_results

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| wiki_id | UUID FK | → wikis |
| source_type | TEXT | academic / technical / general |
| source_name | TEXT | 来源平台名称 |
| url | TEXT | 原始链接 |
| title | TEXT | 标题 |
| snippet | TEXT | 关键段落 |
| credibility | INT | 1-5 可信度评分 |
| info_type | TEXT | 定义/原理/类比/应用/误区 |

## 6. 页面设计

### 6.1 页面地图

| 路由 | 页面 | 功能 |
|---|---|---|
| `/` | 首页 | 知识点输入 + 最近历史 |
| `/wiki/[id]` | Wiki 编辑器 | 大纲导航 + Tiptap 编辑 + 实时预览 |
| `/settings` | 设置 | API Key 管理 + 偏好配置 |
| `/history` | 历史记录 | 所有已生成的 Wiki 列表 |

### 6.2 核心页面：Wiki 编辑器

```
┌──────────────────────────────────────────────────────┐
│  Wiki: [知识点名]          [导出▼]  [设置]            │
├──────────────────────────────────────────────────────┤
│  ┌─ 大纲导航 ──┐  ┌─── 内容区（Tiptap 编辑器）───┐  │
│  │ 📊 思维导图 │  │                               │  │
│  │ ▸ Layer 1   │  │  ━━━ Layer 1: 直觉层 ━━━     │  │
│  │ ▸ Layer 2   │  │  [概念图] + 类比文字          │  │
│  │ ▸ Layer 3 ▶ │  │                               │  │
│  │ ▸ Layer 4   │  │  ━━━ Layer 2: 原理层 ━━━     │  │
│  │ ────────── │  │  [推导图] + 公式 + 解释       │  │
│  │ 📎 信息来源 │  │                               │  │
│  └─────────────┘  │  ━━━ Layer 3: 深入层 ▶ ━━━   │  │
│                   │  (可折叠)                      │  │
│                   │                               │  │
│                   │  ━━━ Layer 4: 应用层 ━━━     │  │
│                   │  [应用图] + 案例 + 代码       │  │
│                   └───────────────────────────────┘  │
│  ┌─ 生成进度 ──────────────────────────────────────┐ │
│  │  ✅搜索  ✅筛选  ✅大纲  ✅填充  ⏳图表渲染...   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 7. 技术选型

| 层级 | 技术 | 理由 |
|---|---|---|
| 前端框架 | Next.js 15 + React 19 | 全栈一体化，部署简单 |
| UI + 样式 | TailwindCSS + shadcn/ui | 组件成熟，自定义方便 |
| 编辑器 | Tiptap (ProseMirror) | Markdown 导入/导出、图片嵌入、可折叠区块 |
| 后端 | Next.js Route Handlers | 全栈统一语言 |
| LLM 编排 | TypeScript 代码实现 | 精简架构，无需外部平台 |
| LLM 模型 | GLM5 API | 用户自带 Key |
| 主搜索 | Tavily API | 为 AI 应用优化的搜索 |
| 学术搜索 | Semantic Scholar + arXiv API | 免费，论文级权威信息 |
| 流程图 | Mermaid.js | 流程图/时序图/架构图 |
| 信息图 | html-to-image | 信息图/卡片渲染 |
| AI 配图 | GLM5 图像生成 / DALL-E (可选) | 示意图/插画 |
| 数据库 | SQLite | 单文件，零运维 |
| ORM | Drizzle ORM | TypeScript 原生，轻量 |

## 8. Phase 划分

### Phase 1（当前）：核心 Wiki 生成

- [ ] 项目初始化 (Next.js + TailwindCSS + shadcn/ui)
- [ ] SQLite 数据库 + Drizzle ORM
- [ ] 搜索聚合模块 (Tavily + Semantic Scholar + arXiv)
- [ ] LLM 编排器 (GLM5 Prompt 链)
- [ ] Wiki 生成工作流 (Step 1 + Step 2)
- [ ] 图表渲染模块 (Mermaid + html-to-image)
- [ ] Wiki 编辑器页面 (Tiptap)
- [ ] 大纲导航 + 单章节重生成
- [ ] Markdown 导出
- [ ] 设置页 (API Key 管理)
- [ ] 信息溯源页面 (查看搜索来源)
- [ ] 历史记录页面

### Phase 2：扩展功能

- [ ] 小红书全套生成 (图 + 文案 + 标签)
- [ ] 自建知识库 (向量数据库 + RAG)
- [ ] MCP 工具协议接入
- [ ] Prompt 热更新 (数据库存储模板)
- [ ] 更多搜索源 (知乎、Reddit 等)

### Phase 3：生产化

- [ ] 多用户支持 (SQLite → PostgreSQL)
- [ ] 用户认证
- [ ] Docker Compose 部署
- [ ] 响应式设计 (移动端适配)
