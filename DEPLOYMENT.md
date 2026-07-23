# 仙码录 (CodeTracker) 部署指南

本指南说明如何将仙码录部署到线上环境，使用 Supabase 作为数据库，Cloudflare Pages 作为托管平台。

## 架构概览

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub 仓库    │────▶│  Cloudflare Pages │────▶│   用户浏览器     │
│   (源代码)       │     │  (静态托管 + CDN)  │     │                 │
└─────────────────     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │     Supabase     │
                        │  (PostgreSQL DB) │
                        └──────────────────┘
```

## 第一步：创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并注册账号
2. 点击 "New Project" 创建新项目
3. 记录以下信息（后续需要用到）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: 在 Settings → API 中获取
   - **service_role key**: 在 Settings → API 中获取（保密！）

4. 在 Supabase SQL Editor 中执行 `supabase/schema.sql` 文件创建数据库表

## 第二步：配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
SUPABASE_SERVICE_ROLE_KEY=你的service-role-key
```

## 第三步：部署到 Cloudflare Pages

### 方法 A：通过 GitHub Actions 自动部署（推荐）

1. 将代码推送到 GitHub 仓库

2. 在 Cloudflare Dashboard 中：
   - 进入 "Workers & Pages"
   - 点击 "Create" → "Pages"
   - 选择 "Connect to Git"
   - 选择你的 GitHub 仓库
   - 配置构建设置：
     - Build command: `pnpm build`
     - Build output directory: `.next`
     - Root directory: `/`

3. 在 Cloudflare Pages 项目设置中添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. 在 GitHub 仓库的 Settings → Secrets 中添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. 推送到 `main` 分支触发自动部署

### 方法 B：手动部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
wrangler pages deploy .next --project-name=codetracker
```

## 第四步：数据迁移（可选）

如果已有 localStorage 数据，可以使用浏览器控制台导出数据：

```javascript
// 在浏览器控制台运行
const data = {
  courses: localStorage.getItem('coding_courses'),
  students: localStorage.getItem('coding_students'),
  typing_records: localStorage.getItem('coding_typing_records'),
  retry_records: localStorage.getItem('coding_retry_records'),
  homework_records: localStorage.getItem('coding_homework_records'),
  knowledge_progress: localStorage.getItem('coding_knowledge_progress'),
  exam_records: localStorage.getItem('coding_exam_records'),
  competition_records: localStorage.getItem('coding_competition_records'),
  honor_records: localStorage.getItem('coding_honor_records'),
  student_photos: localStorage.getItem('coding_student_photos'),
  reports: localStorage.getItem('coding_reports'),
};
console.log(JSON.stringify(data));
```

然后编写脚本将数据导入 Supabase。

## 环境变量说明

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名访问密钥 | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务角色密钥（绕过 RLS） | Supabase Dashboard → Settings → API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | Cloudflare Dashboard → 右侧栏 |

## 安全注意事项

1. **不要**将 `.env.local` 提交到 Git
2. **不要**在客户端代码中使用 `SUPABASE_SERVICE_ROLE_KEY`
3. 生产环境建议启用 Supabase 认证（Auth）
4. 定期备份 Supabase 数据库

## 故障排查

### 问题：页面显示空白

- 检查浏览器控制台是否有错误
- 确认环境变量已正确配置
- 检查 Supabase 项目是否正常运行

### 问题：数据无法保存

- 检查 Supabase RLS 策略是否允许操作
- 确认 `SUPABASE_SERVICE_ROLE_KEY` 已配置
- 查看 Supabase Dashboard → Logs 查看错误日志

### 问题：部署失败

- 检查 GitHub Actions 日志
- 确认 Cloudflare API Token 权限足够
- 检查构建命令是否正确

## 后续优化

- [ ] 添加用户认证（Supabase Auth）
- [ ] 配置自定义域名
- [ ] 启用 Supabase 实时订阅（Realtime）
- [ ] 添加数据备份策略
- [ ] 配置 CDN 缓存策略
