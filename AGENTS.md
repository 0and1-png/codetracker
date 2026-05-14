# 项目上下文

## 项目简介

**CodeTracker** - 少儿编程学习追踪系统，面向教师的单用户工具。用于记录少儿编程学生的学习情况，生成月度学习报告PDF发给家长。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **图表**: Recharts
- **PDF导出**: html2canvas + jsPDF
- **CSV解析**: PapaParse
- **数据持久化**: localStorage (单用户，无需后端数据库)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 工作台 - 课程选择/学生多选/记录录入
│   │   ├── courses/        # 课程管理
│   │   │   ├── page.tsx    # 课程列表 - 三课程卡片导航
│   │   │   └── [id]/       # 课程详情 - 授课体系/知识点
│   │   │       └── page.tsx
│   │   ├── students/[id]/  # 学生详情页 - 时间线/图表/知识点
│   │   │   └── page.tsx
│   │   └── reports/[studentId]/ # 月度报告页 - 预览/PDF导出
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/             # Shadcn UI 组件库
│   │   ├── star-rating.tsx # 星级评分组件
│   │   └── tag-selector.tsx # 标签选择器组件（含自定义标签）
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/
│   │   ├── constants.ts    # 预设课程/标签/知识点/颜色配置
│   │   ├── store.ts        # localStorage 数据存取层
│   │   ├── types.ts        # TypeScript 类型定义
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 核心数据模型

- **Course**: 课程（C++信奥/Python/图形化），含授课体系(teachingContent)、自定义知识点和题目
- **Student**: 学生基本信息（姓名、课程ID、备注）
- **TypingRecord**: 打字记录（速度、正确率、日期）
- **ProblemRetryRecord**: 三刷记录（题目、次数、耗时、提升百分比、日期）
- **HomeworkRecord**: 作业记录（内容、点评、日期）
- **KnowledgeProgress**: 知识点掌握状态（not_started/learning/mastered）+ 评分(1-10) + 掌握情况描述

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 工作台 - 课程选择、学生多选、三种记录录入（打字/三刷/作业） |
| `/courses` | 课程列表 - 三个课程卡片导航 |
| `/courses/[id]` | 课程详情 - 授课体系(Markdown备课) / 知识点(含子题目) |
| `/students/[id]` | 学生详情 - 学习时间线、数据图表、知识点进度 |
| `/reports/[studentId]` | 月度报告 - 预览报告、编辑教师寄语/目标、导出PDF |

## 构建与测试命令

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发环境 (端口5000)
pnpm build        # 生产构建
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查
pnpm lint:build   # ESLint 静态检查（构建级别）
```

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 函数参数、返回值、解构项、事件对象应有明确类型
- 清理未使用的变量和导入

### next.config 配置规范

- 配置路径必须使用 `path.resolve(__dirname, ...)` 动态拼接，不要硬编码

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 `typeof window`、`Date.now()`、`Math.random()`
2. 必须使用 `'use client'` + `useEffect` + `useState` 确保动态内容仅在客户端渲染
3. 禁止非法 HTML 嵌套（如 `<p>` 嵌套 `<div>`）
4. 不使用 `<head>` 标签，优先使用 metadata API

### UI 设计规范

- 使用 shadcn/ui 组件和风格
- 色彩方案：紫/靛蓝渐变为主色，适合少儿编程场景
- 操作方式：标签勾选为主，减少打字量

### 数据存储规范

- 所有数据使用 localStorage 存储，key 前缀 `coding_`
- 课程数据: `coding_courses`
- 学生数据: `coding_students`
- 打字记录: `coding_typing_records`
- 三刷记录: `coding_retry_records`
- 作业记录: `coding_homework_records`
- 知识点: `coding_knowledge_progress`
- 组件挂载后通过 `useEffect` + `useCallback` 读取数据，避免 SSR/CSR 不一致

### PDF 导出规范

- 使用 html2canvas 捕获报告预览区域
- 使用 jsPDF 生成 A4 尺寸 PDF
- 报告内容通过 ref 获取 DOM 元素
- 动态导入 html2canvas 和 jsPDF（避免 SSR 问题）
