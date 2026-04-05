import type { KnowledgeType, SearchResult } from "@/types";
import type { ChatMessage } from "./client";

/**
 * Check if source diversity requirement is met
 * Returns { met: boolean, sourcesUsed: string[], warning?: string }
 */
export function checkSourceDiversity(
  sourceCounts: Record<string, number>
): { met: boolean; sourcesUsed: string[]; count: number; warning?: string } {
  const sourcesUsed = Object.keys(sourceCounts);
  const count = sourcesUsed.length;
  const MIN_SOURCES = 3;

  if (count >= MIN_SOURCES) {
    return { met: true, sourcesUsed, count };
  }

  return {
    met: false,
    sourcesUsed,
    count,
    warning: `当前仅使用 ${count} 个来源（${sourcesUsed.join(", ")}），建议至少使用 ${MIN_SOURCES} 个来源以确保信息多样性`,
  };
}

/**
 * Core Wiki Architect System Prompt
 * Based on wiki_prompt.md requirements
 */
const WIKI_ARCHITECT_ROLE = `你是一名精通**分层知识体系搭建、费曼学习法、第一性原理、金字塔原理**的专业领域Wiki架构师。

核心任务是生成一套结构严谨、逻辑闭环、覆盖全学习层级的标准化Wiki文档。
该Wiki必须同时满足「零基础小白、入门进阶者、资深专业人士」三类人群的学习需求，彻底消除信息壁垒，同时保证专业深度，杜绝泛泛而谈的无效内容。`;

/**
 * Core Methodology Rules
 */
const METHODOLOGY_RULES = `
# 核心方法论强制执行规则

## 1. 金字塔原理执行规则
- 结论先行：每一层级、每一章节开篇必须先给出核心结论/中心论点，再展开细节论证
- 以上统下：下层内容100%支撑上层论点，不出现脱离上层主题的发散内容
- 归类分组：同属性、同层级的知识点必须归为同一模块，杜绝跨层级、跨类别混乱堆砌
- 逻辑递进：内容严格遵循「从整体到局部、从通俗到专业、从表象到本质」的递进顺序，严禁反向跳跃

## 2. 费曼学习法执行规则
- 所有专业术语首次出现，必须附带1句无行业黑话的通俗解释
- 所有抽象概念必须匹配1个大众可感知的生活化类比，杜绝无落地场景的纯理论表述
- 所有复杂逻辑必须拆解为可理解、可复现的极简步骤，用案例替代说教
- 全程避免"专家口吻"的自嗨式表述，用"给外行讲明白"的逻辑组织语言

## 3. 第一性原理执行规则
- 所有知识点必须追溯至**不可再拆分的底层核心公理/规则/本质逻辑**，拒绝二手知识搬运、表象归纳
- 讲透「为什么是这样」，而非仅说明「是什么」，拆解清楚该知识点的底层约束与核心逻辑起点
- 所有结论必须有底层原理支撑，不出现无依据的经验之谈，同时明确区分「客观事实」与「行业共识/最佳实践」`;

/**
 * Output Format Requirements
 */
const OUTPUT_FORMAT_RULES = `
# 输出格式与规范
1. 全程使用Markdown格式排版，严格遵循分级标题（# 主标题、## 一级层级、### 二级模块、#### 三级细节），结构清晰，可直接用于Wiki站点部署
2. 每个层级、每个模块之间必须有明确的分隔，核心信息、关键结论、重点术语必须加粗标注
3. 专业术语首次出现必须附带通俗解释，全文术语解释保持统一，不出现前后矛盾的表述
4. 对比类内容必须使用表格呈现，流程类内容必须使用有序列表，并列类内容必须使用无序列表，提升可读性`;

/**
 * Markdown Formatting Rules for Clean Rendering
 */
const MARKDOWN_FORMATTING_RULES = `
# Markdown 格式规范（严格遵守，确保正确渲染）

## 1. 标题格式
- 使用 # ## ### #### 表示不同层级标题
- 标题前后必须有空行
- 标题内容不能包含特殊符号（如 # * _ 等）
✅ 正确：
## 核心概念

### 什么是递归

❌ 错误：
##核心概念
### 什么是#递归

## 2. 加粗和强调
- 加粗使用 **双星号** 包围（前后无空格）
- 斜体使用 *单星号* 包围
- 不要混用 __下划线__ 和 **星号**
✅ 正确：这是**核心概念**的解释
❌ 错误：这是 ** 核心概念** 的解释
❌ 错误：这是__核心概念__的解释

## 3. 代码块格式
- 行内代码使用 \`单个反引号\`
- 代码块必须使用三个反引号包裹，并指定语言
- 代码块前后必须有空行
- 代码块内不要有空行
✅ 正确：
\`\`\`python
def hello():
    print("Hello")
\`\`\`

❌ 错误：
\`\`\`
def hello():
    print("Hello")
\`\`\`
（缺少语言标识）

## 4. 列表格式
- 无序列表使用 - 或 * 开头，后跟一个空格
- 有序列表使用 1. 2. 3. 开头，后跟一个空格
- 嵌套列表使用 2 或 4 个空格缩进
✅ 正确：
- 第一项
- 第二项
  - 嵌套项

❌ 错误：
-第一项
-第二项

## 5. 表格格式
- 表格必须使用标准 Markdown 表格语法
- 表头与内容之间必须有分隔行
- 每列对齐使用 | 分隔
✅ 正确：
| 特性 | 优点 | 缺点 |
|------|------|------|
| 速度快 | 效率高 | 内存占用大 |
| 简单易用 | 学习曲线平缓 | 功能有限 |

❌ 错误：
|特性|优点|缺点|
|特性1|优点1|缺点1|
（缺少分隔行）

## 6. 数学公式格式
- 行内公式使用 $公式$
- 块级公式使用 $$公式$$（独立成行）
- 公式内不要有多余空格
✅ 正确：
质能方程：$E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

❌ 错误：
质能方程：$ E = mc^2 $（公式内多余空格）

## 7. 引用块
- 使用 > 开头表示引用
- 引用块前后必须有空行
✅ 正确：
> 这是一段引用文字

## 8. 折叠内容
- 使用 HTML 注释标记可折叠区域
- fold:start 和 fold:end 必须成对出现
✅ 正确：
<!-- fold:start -->
这里的内容默认折叠
<!-- fold:end -->

## 9. 空行规范
- 段落之间必须有空行
- 列表前后必须有空行
- 代码块前后必须有空行
- 表格前后必须有空行

## 10. 禁止的格式
- 不要使用 HTML 标签（除了折叠标记）
- 不要使用 ~~删除线~~
- 不要使用 === 或 --- 作为标题下划线
- 不要在段落开头使用缩进空格`;

/**
 * Chart generation guidelines
 */
const CHART_GENERATION_GUIDELINES = `
# 图表生成规则

## 何时生成图表
仅在以下情况生成图表，避免过度可视化（每个章节最多1-2个图表）：
1. **流程/步骤** → 使用 Mermaid 流程图
2. **概念层级/知识结构** → 使用 Mermaid 思维导图
3. **抽象概念的可视化** → 使用 AI 配图（谨慎使用，仅当纯文字难以表达时）

## Mermaid 语法规范（严格遵守）

### 节点标签规则
- 节点标签用引号包裹: A["节点名称"]
- 标签内不要使用特殊符号（引号、换行、方括号、竖线|）
- **禁止使用竖线|字符** - 竖线会破坏Mermaid解析，改用其他符号如"-"或":"代替
- 中文标签必须用引号: A["量子计算基础"]

### 正确示例
\`\`\`mermaid
graph TD
  A["概念介绍"] --> B["核心原理"]
  B --> C["实际应用"]
\`\`\`

### 错误示例（避免）
\`\`\`mermaid
graph TD
  A[概念介绍1] --> B[核心原理]  ❌ 缺少引号
  A["量子态|ψ⟩"] --> B  ❌ 禁止使用竖线|
\`\`\`

## 图表类型选择

### Mermaid 流程图 (mermaid)
用于展示：
- 执行步骤、工作流程
- 系统架构、组件关系
- 决策分支、条件判断

\`\`\`mermaid
graph TD
  A["输入数据"] --> B["处理数据"]
  B --> C{"是否完成?"}
  C -->|是| D["输出结果"]
  C -->|否| B
\`\`\`

### Mermaid 思维导图 (mindmap)
用于展示：
- 概念层级
- 知识结构
- 多维度分类

\`\`\`mermaid
mindmap
  root(("核心概念"))
    子概念A
      细节1
      细节2
    子概念B
      细节3
\`\`\`

### AI 配图 (ai-image)
用于展示（仅在内容确实需要视觉辅助时使用）：
- 抽象概念的可视化
- 物理现象、实验装置
- 历史场景

## 输出格式
在内容末尾输出（可选）：
CHART_JSON: {"charts":[{"type":"mermaid|mindmap|ai-image","description":"图表描述","mermaidCode":"mermaid代码(仅type为mermaid/mindmap时)"}]}`;

/**
 * Classifies a topic into a knowledge type category.
 */
export function knowledgeTypeClassification(topic: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a knowledge classifier. Given a topic, classify it into exactly ONE of these categories:
- "mathematical": Math principles, formulas, theorems, proofs
- "physical": Physics, chemistry, biology principles and laws
- "architectural": System design, software architecture, infrastructure
- "logical": Algorithms, data structures, logical reasoning
- "conceptual": Abstract concepts, theories, frameworks, ideas
- "practical": Tools, libraries, frameworks, how-to guides

Respond with ONLY the category name in lowercase, nothing else.`,
    },
    {
      role: "user",
      content: `Classify this topic: "${topic}"`,
    },
  ];
}

/**
 * Filters and scores search results for quality and relevance.
 */
export function searchResultFilter(
  topic: string,
  results: SearchResult[]
): ChatMessage[] {
  const resultSummaries = results
    .map(
      (r, i) =>
        `[${i}] [${r.sourceType}] "${r.title}" (from ${r.sourceName})\n   ${r.snippet.slice(0, 200)}`
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are an information quality analyst. Given a topic and a list of search results, evaluate each result.

For each result, respond with a JSON array where each element has:
- "index": the result index number
- "keep": true/false (whether to keep this result)
- "credibility": 1-5 score (5=most credible)
- "infoType": one of "definition", "principle", "analogy", "application", "misconception"
- "reason": brief reason for your decision

Scoring guide:
- 5: Academic paper, official spec, authoritative textbook
- 4: Well-known author blog, preprint, official docs
- 3: High-voted community answer, quality tutorial
- 2: Random blog, unverified information
- 1: Contradictory, outdated, or no source

Remove duplicates and low-quality results. Keep results with score >= 3.

Respond with ONLY the JSON array, no other text.`,
    },
    {
      role: "user",
      content: `Topic: "${topic}"\n\nSearch results:\n${resultSummaries}`,
    },
  ];
}

/**
 * Source diversity requirements constant
 */
const SOURCE_DIVERSITY_REQUIREMENT = `
# 信息来源多样性要求（中等约束）

## 必须满足的条件
生成 Wiki 时必须使用以下至少 **3 个** 信息来源类型：
1. **通用搜索 (Tavily/general)** - 提供广泛的知识覆盖和最新信息
2. **学术论文 (Semantic Scholar/academic)** - 提供权威的学术观点和研究成果
3. **预印本论文 (arXiv/preprint)** - 提供前沿研究和最新进展
4. **LLM 知识库 (llm)** - 补充常识性知识和填补信息空白

## 例外情况
仅在以下情况允许使用少于 3 个来源：
- 某个来源确实无法搜到相关信息（如非常小众的主题）
- 某个来源 API 不可用或超时
- 主题本身不适用于某种来源（如纯概念不适用于 arXiv）

## 检查清单
生成内容前必须确认：
- [ ] 是否使用了至少 3 种来源？
- [ ] 是否平衡了各来源的使用比例？
- [ ] 是否在来源不足时用 LLM 知识进行了补充？
- [ ] 是否在内容中标注了信息来源？`;

/**
 * Identifies blind spots in search results and supplements with LLM knowledge.
 */
export function knowledgeFusion(
  topic: string,
  filteredResults: SearchResult[],
  sourceCounts?: Record<string, number>
): ChatMessage[] {
  const resultSummary = filteredResults
    .map(
      (r) =>
        `[${r.infoType}] "${r.title}" (${r.sourceName}, credibility: ${r.credibility})\n   ${r.snippet.slice(0, 150)}`
    )
    .join("\n\n");

  // Build source diversity info
  const sourceInfo = sourceCounts 
    ? `\n\n## 当前搜索来源统计\n${Object.entries(sourceCounts)
        .map(([type, count]) => `- ${type}: ${count} 条结果`)
        .join("\n")}\n\n来源数量: ${Object.keys(sourceCounts).length}/4`
    : "";

  return [
    {
      role: "system",
      content: `You are a knowledge synthesis expert. Given a topic and filtered search results, identify what information is MISSING and supplement it with your own knowledge.

${SOURCE_DIVERSITY_REQUIREMENT}

Focus especially on identifying gaps in:
1. Mathematical derivations or proofs
2. Physical intuition or experimental context
3. Historical background and motivation
4. Precise definitions and formal statements
5. Common misconceptions
6. Bottom-up reasoning chains (why things work this way)
7. Edge cases and boundary conditions
8. Comparison with related concepts

Respond with a JSON object:
{
  "supplement": "Your supplementary knowledge in markdown format. Mark search-sourced info as [SEARCH] and your own knowledge as [LLM]. Also note which SOURCE TYPE each piece of info comes from.",
  "blindAreas": ["area1 that was missing", "area2 that was missing"],
  "sourceDiversityCheck": "Brief statement confirming at least 3 sources are used or explaining why fewer sources are acceptable"
}

Provide substantive, accurate content — not just descriptions of what's missing.`,
    },
    {
      role: "user",
      content: `Topic: "${topic}"${sourceInfo}

Current search results:
${resultSummary}

What information is missing? Supplement with your knowledge. Remember to check source diversity requirements.`,
    },
  ];
}

/**
 * Layer 1 mandatory modules - Intuition Layer
 */
const LAYER1_MODULES = `
## 第一层：直觉层（小白专属，零门槛入口）
- 对应受众：零基础小白、跨行业了解者、首次接触该知识点的人群
- 核心学习目标：看完立刻搞懂「这是什么、有什么用、什么时候用」，无任何理解障碍
- **强制包含内容模块**（必须全部包含，缺一不可）：
  1. **一句话极简定义**：用无任何专业术语的大白话，讲清该知识点的核心本质
  2. **生活化类比**：用大众日常可感知的场景，1:1映射该知识点的核心逻辑，消除晦涩感
  3. **核心价值与解决的痛点**：明确说明「没有这个知识点/技术/方法，会遇到什么无法解决的问题」，讲清其不可替代的价值
  4. **适用场景速览**：用极简清单列出「什么时候该用它」「什么时候绝对不该用它」，小白可直接对照判断
  5. **核心术语极简对照表**：把全文核心专业术语，提前给出最通俗的一句话解释，降低后续阅读门槛`;

/**
 * Layer 2 mandatory modules - Principle Layer
 */
const LAYER2_MODULES = `
## 第二层：原理层（进阶层专属，建立完整认知）
- 对应受众：有基础认知、想要系统学习、需要落地应用的入门进阶者
- 核心学习目标：搞懂「核心逻辑是什么、关键执行步骤、为什么要这么设计/这么做」，建立完整的知识框架
- **强制包含内容模块**（必须全部包含，缺一不可）：
  1. **核心逻辑总览**：用金字塔结构给出该知识点的完整逻辑框架，先总后分，讲清核心运行闭环
  2. **核心工作流程拆解**：把完整逻辑拆解为不超过5步的线性执行流程，每一步明确「输入是什么、做了什么、输出是什么、为什么要做这一步」
  3. **核心构成要素详解**：拆解该知识点的核心组成部分，每个部分讲清「作用是什么、和其他部分的关联是什么、缺了它会出现什么问题」
  4. **设计初衷与底层逻辑**：基于第一性原理，讲清「为什么要这么设计，而不是其他方案」，拆解其底层约束与设计取舍的核心原因`;

/**
 * Layer 3 mandatory modules - Deep Layer
 */
const LAYER3_MODULES = `
## 第三层：深入层（专业层专属，深挖本质与边界）
- 对应受众：资深从业者、专业研发/研究人员、需要深度掌握该知识点的专业人士
- 核心学习目标：搞懂「底层原理本质、技术/方案的优缺点、严格适用边界、隐藏坑点、同类方案辨析」，形成专业级的深度认知
- **强制包含内容模块**（必须全部包含，缺一不可）：
  1. **底层本质与数学/公理级原理解析**：基于第一性原理，追溯至该知识点最底层的数学公式、公理规则、物理定律等不可拆分的核心依据，做深度原理解析
  2. **优缺点全维度拆解**：客观、无偏向地列出该方案的核心优势与不可回避的劣势，每一条都有底层原理支撑，而非主观评价
  3. **严格适用边界与约束条件**：明确列出「该方案能生效的前提条件、硬性约束、不可突破的边界」，杜绝"万能方案"的误导性表述
  4. **常见坑点与避坑方案**：列出行业内高频出现的踩坑场景、错误用法，以及对应的底层原因与可落地的避坑方案
  5. **同类知识点/方案横向辨析**：用对比表格，清晰区分该知识点与同类/易混淆方案的核心差异、适用场景、优劣势，解决专业人士的选型困惑
  6. **行业前沿与演进方向**：补充该知识点的最新行业进展、技术迭代方向，给专业人士提供前瞻参考`;

/**
 * Layer 4 mandatory modules - Application Layer
 */
const LAYER4_MODULES = `
## 第四层：应用层（全层级覆盖，从入门到高阶落地）
- 对应受众：全层级人群，小白可上手极简案例，进阶可落地标准流程，专业可掌握高阶优化方案
- 核心学习目标：从理论到落地，不同层级的人都能找到可直接复用的应用方法
- **强制包含内容模块**（必须全部包含，缺一不可）：
  1. **小白入门极简案例**：零门槛、3步以内可复现的极简案例，让小白看完就能上手验证，建立实操体感
  2. **标准场景落地全流程**：行业通用的标准应用场景，给出完整、可复用的落地步骤、注意事项、验收标准
  3. **高阶场景优化方案**：针对专业人士的复杂场景，给出高阶优化思路、调优方法、性能/效果提升的核心路径
  4. **行业典型落地案例**：补充不同行业的标杆落地案例，讲清背景、方案、效果、核心经验，给不同领域的读者提供参考`;

/**
 * Generates a 4-layer pyramid outline for the topic.
 */
export function outlineGeneration(
  topic: string,
  knowledgeType: KnowledgeType,
  materials: string
): ChatMessage[] {
  const typeInstructions: Record<KnowledgeType, string> = {
    mathematical: "数学类知识点：重点覆盖公式推导步骤、数学直觉、证明结构、数学符号的含义",
    physical: "物理类知识点：重点覆盖物理直觉、实验类比、为什么公式取这种形式、物理量的实际意义",
    architectural: "架构类知识点：重点覆盖组件关系图、数据流向、设计决策与取舍、系统边界",
    logical: "逻辑类知识点：重点覆盖逐步分解、复杂度分析、推理链条、算法正确性证明",
    conceptual: "概念类知识点：重点覆盖清晰定义、历史发展脉络、多角度对比、理论框架",
    practical: "实践类知识点：重点覆盖使用场景、操作步骤、最佳实践、常见错误与排错方法",
  };

  return [
    {
      role: "system",
      content: `${WIKI_ARCHITECT_ROLE}

${METHODOLOGY_RULES}

${typeInstructions[knowledgeType]}

# 强制分层内容架构（必须严格按此顺序输出，不可调整层级顺序）

${LAYER1_MODULES}

${LAYER2_MODULES}

${LAYER3_MODULES}

${LAYER4_MODULES}

---

生成4层大纲，每层必须包含上述所有强制模块。

Respond with JSON:
{
  "sections": [
    { 
      "layer": 1, 
      "title": "直觉层：[主题名称]的直观理解", 
      "keyPoints": ["一句话极简定义", "生活化类比", "核心价值与解决的痛点", "适用场景速览", "核心术语极简对照表"]
    },
    { 
      "layer": 2, 
      "title": "原理层：[主题名称]的核心原理", 
      "keyPoints": ["核心逻辑总览", "核心工作流程拆解", "核心构成要素详解", "设计初衷与底层逻辑"]
    },
    { 
      "layer": 3, 
      "title": "深入层：[主题名称]的深度剖析", 
      "keyPoints": ["底层本质与数学/公理级原理解析", "优缺点全维度拆解", "严格适用边界与约束条件", "常见坑点与避坑方案", "同类知识点/方案横向辨析", "行业前沿与演进方向"]
    },
    { 
      "layer": 4, 
      "title": "应用层：[主题名称]的实践指南", 
      "keyPoints": ["小白入门极简案例", "标准场景落地全流程", "高阶场景优化方案", "行业典型落地案例"]
    }
  ]
}

Reply with ONLY the JSON, no other text.`,
    },
    {
      role: "user",
      content: `Create a 4-layer outline for: "${topic}"

Reference materials:
${materials.slice(0, 3000)}`,
    },
  ];
}

/**
 * Generates content for one section of the wiki.
 */
export function sectionGeneration(
  topic: string,
  knowledgeType: KnowledgeType,
  layer: 1 | 2 | 3 | 4,
  sectionTitle: string,
  keyPoints: string[],
  materials: string
): ChatMessage[] {
  const layerConfigs: Record<number, { modules: string; audience: string; goal: string }> = {
    1: {
      modules: LAYER1_MODULES,
      audience: "零基础小白、跨行业了解者、首次接触该知识点的人群",
      goal: "看完立刻搞懂「这是什么、有什么用、什么时候用」，无任何理解障碍",
    },
    2: {
      modules: LAYER2_MODULES,
      audience: "有基础认知、想要系统学习、需要落地应用的入门进阶者",
      goal: "搞懂「核心逻辑是什么、关键执行步骤、为什么要这么设计/这么做」，建立完整的知识框架",
    },
    3: {
      modules: LAYER3_MODULES,
      audience: "资深从业者、专业研发/研究人员、需要深度掌握该知识点的专业人士",
      goal: "搞懂「底层原理本质、技术/方案的优缺点、严格适用边界、隐藏坑点、同类方案辨析」",
    },
    4: {
      modules: LAYER4_MODULES,
      audience: "全层级人群，小白可上手极简案例，进阶可落地标准流程，专业可掌握高阶优化方案",
      goal: "从理论到落地，不同层级的人都能找到可直接复用的应用方法",
    },
  };

  const config = layerConfigs[layer];

  const typeSpecificGuidance: Record<KnowledgeType, Record<number, string>> = {
    mathematical: {
      1: "- 用日常生活中的数量关系做类比，避免直接出现数学符号",
      2: "- 包含关键公式的推导步骤，每一步都要有「为什么这样做」的注释\n- 用自然语言解释公式中每个符号的含义",
      3: "- 给出完整的数学证明或推导过程\n- 明确公式的适用范围和边界条件",
      4: "- 提供可直接运行的代码示例（Python/Mathematica等）\n- 给出数值计算的注意事项",
    },
    physical: {
      1: "- 用可感知的物理现象做类比，让人「看得见」原理",
      2: "- 解释公式背后的物理直觉，为什么是这种形式\n- 给出理想实验的推演过程",
      3: "- 追溯到基本物理定律（能量守恒、动量守恒等）\n- 讨论实验验证和历史争议",
      4: "- 给出典型实验或工程应用案例\n- 提供数值模拟的入门指南",
    },
    architectural: {
      1: "- 用建筑、城市规划等日常架构做类比",
      2: "- 包含组件关系图（用文字描述图表结构）\n- 解释数据流向和处理逻辑",
      3: "- 深入分析设计决策的权衡取舍\n- 讨论扩展性、容错性等非功能性需求",
      4: "- 给出完整的架构图（用Mermaid语法）\n- 提供部署和运维的最佳实践",
    },
    logical: {
      1: "- 用日常决策或游戏规则做类比",
      2: "- 逐步分解算法/逻辑的执行过程\n- 分析时间和空间复杂度",
      3: "- 给出正确性证明或不变量分析\n- 讨论边界情况和退化解",
      4: "- 提供多种语言的代码实现\n- 给出性能优化和调试技巧",
    },
    conceptual: {
      1: "- 用跨领域的通用概念做类比",
      2: "- 建立概念之间的关联网络\n- 给出概念的演进历史",
      3: "- 对比不同学派或理论的观点\n- 讨论概念的局限性和批评",
      4: "- 给出概念在不同领域的应用实例\n- 提供进一步学习的资源",
    },
    practical: {
      1: "- 直接展示「它能帮我做什么」",
      2: "- 给出标准使用流程和配置说明",
      3: "- 深入分析配置选项的含义和影响\n- 讨论与其他工具的集成方案",
      4: "- 提供完整的代码示例和项目模板\n- 给出故障排查指南",
    },
  };

  const typeGuidance = typeSpecificGuidance[knowledgeType][layer];

  return [
    {
      role: "system",
      content: `${WIKI_ARCHITECT_ROLE}

${METHODOLOGY_RULES}

${OUTPUT_FORMAT_RULES}

${MARKDOWN_FORMATTING_RULES}

${CHART_GENERATION_GUIDELINES}

---

# 当前任务：生成第 ${layer} 层内容

## 本层定位
- **标题**：${sectionTitle}
- **受众**：${config.audience}
- **学习目标**：${config.goal}

${config.modules}

## 知识类型特别指导
${typeGuidance}

## 必须覆盖的关键点
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

---

# 输出要求

1. 使用Markdown格式，结构清晰
2. 使用中文撰写
3. **必须覆盖所有强制模块**，每个模块用 ### 标题标注
4. 遵循金字塔原理：结论先行，以上统下
5. 遵循费曼学习法：术语即解释，概念即类比
6. 遵循第一性原理：追溯本质，讲清原因
7. **严格遵守 Markdown 格式规范**，确保公式、表格、代码块正确渲染
8. **信息来源多样性**：确保内容引用了至少 3 种不同来源（通用搜索、学术论文、预印本、LLM知识库）
9. **图表可视化**：在关键理解点添加 Mermaid 流程图或思维导图，但不要过度可视化

在内容末尾，可选添加0-2个图表：
CHART_JSON: {"charts":[{"type":"mermaid|mindmap|ai-image","description":"图表描述","mermaidCode":"mermaid代码(仅type为mermaid/mindmap时)"}]}`,
    },
    {
      role: "user",
      content: `生成主题 "${topic}" 的第 ${layer} 层内容：${sectionTitle}

必须覆盖的关键点：
${keyPoints.map((p) => `- ${p}`).join("\n")}

参考材料：
${materials.slice(0, 6000)}`,
    },
  ];
}

/**
 * Decides chart types for wiki sections.
 */
export function chartDecision(
  sections: { layer: number; title: string; content: string }[]
): ChatMessage[] {
  const sectionSummaries = sections
    .map(
      (s, i) =>
        `Section ${i + 1} (Layer ${s.layer}): "${s.title}"\n${s.content.slice(0, 300)}`
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are a data visualization expert. For each wiki section, decide what charts would best illustrate the content.

Available chart types:
- "mermaid": Flowcharts, sequence diagrams, architecture diagrams (provide mermaid code)
- "infographic": Comparison cards, key statistics, highlights
- "table": Structured data comparisons

For each section, suggest 0-2 charts. Respond with JSON:
{
  "charts": [
    {
      "sectionIndex": 0,
      "type": "mermaid",
      "description": "Flowchart showing the main process",
      "mermaidCode": "graph TD\\n    A[Start] --> B[End]"
    }
  ]
}

Reply with ONLY the JSON.`,
    },
    {
      role: "user",
      content: `Sections:\n${sectionSummaries}`,
    },
  ];
}

/**
 * Generates table of contents and summary for the complete wiki.
 */
export function wikiHeaderGeneration(topic: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `生成Wiki文档的开头部分，包括：
1. 主标题
2. 一句话简介
3. 【Wiki目录导航】（支持锚点跳转的目录结构）

使用Markdown格式，用中文撰写。`,
    },
    {
      role: "user",
      content: `为主题 "${topic}" 生成Wiki文档开头和目录导航`,
    },
  ];
}

/**
 * Generates summary and references for the complete wiki.
 */
export function wikiFooterGeneration(
  topic: string,
  sections: { layer: number; title: string; content: string }[]
): ChatMessage[] {
  const sectionSummary = sections
    .map((s) => `Layer ${s.layer}: ${s.title}\n${s.content.slice(0, 200)}`)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `生成Wiki文档的结尾部分，包括：

## 【核心知识点总结】
用金字塔结构浓缩全文核心结论，每层提取3-5个最关键要点

## 【延伸阅读与权威参考资料】
- 推荐进一步学习的权威资源（书籍、论文、官方文档）
- 按难度分级（入门/进阶/专业）

使用Markdown格式，用中文撰写。`,
    },
    {
      role: "user",
      content: `主题 "${topic}" 的Wiki内容摘要：

${sectionSummary}

请生成核心知识点总结和延伸阅读推荐。`,
    },
  ];
}
