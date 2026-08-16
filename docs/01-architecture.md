# Vidi 架构

> 技术选型调研见 [00-research.md](00-research.md)，逐项决策记录见 [02-decision-tree.md](02-decision-tree.md)。本文记录最终架构设计。

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 运行时 | Node.js（本机 v24） | 语法好改、异步流式强 |
| 框架 | **Nuxt 4**（Vue 3） | 全栈：一个仓库跑前后端；SSR + Nitro 内置服务端 |
| UI 底座 | **shadcn-vue**（unovue） | 组件源码复制进仓库，每一行都可改，贴合"极简、可维护" |
| 无样式原语 | **reka-ui**（unovue，原 Radix Vue） | shadcn-vue 的底层，提供可访问性/键盘/焦点等行为 |
| 展示组件 | **inspira-ui**（unovue） | 在 shadcn-vue 之上的网站级组件，炫酷组件按需取用 |
| 样式 | **Tailwind CSS v4** | 原子类快速搭儿童友好的大卡片/大按钮 UI |
| 后端 | Nitro server routes | 视频扫描、进度读写、Range 视频流，全在 Nuxt 内 |
| 视频流 | 手写 Range 处理 | iPad 拖进度必须（206/Content-Range/HEAD） |
| 列表扫描 | Node `fs` 递归扫配置的根目录 | 过滤脏文件（`._*`、`*.downloading`），中文自然排序 |
| 索引缓存 | `courses.json` | 首扫落盘，按目录 mtime 校验增量重扫 |
| 进度存储 | `progress.json`（防抖写入） | 跨设备统一、可读可改 |
| 配置 | `settings.json`（多根目录） | 站点设置页可改，改完立即生效 |
| 常驻 | launchd LaunchAgent（用户态） | 能读用户权限的硬盘、开机自启 |
| 端口 | 8080 | iPad 访问 `http://Mac局域网IP:8080` |

## 项目结构

```
vidi/
├── app/                    # 前端页面（Nuxt 4，默认 app 目录）
│   ├── app.vue             # 根组件（全屏、移动端适配）
│   ├── pages/
│   │   ├── index.vue       # 首页：继续观看区 + 课程卡片
│   │   ├── course/[slug].vue  # 某课程的视频列表 + 续播状态
│   │   ├── watch/[...path].vue # 播放页（video 标签 + 进度上报）
│   │   └── settings.vue    # 设置页：管理根目录、扫描、PIN、连播开关
│   └── components/ui/      # shadcn-vue 复制进来的组件（Button/Card/…）
├── server/
│   └── api/
│       ├── courses.get.ts        # 读索引/触发扫描，返回课程 → group → 视频
│       ├── scan.post.ts          # 手动触发重扫（可选，mtime 校验已兜底）
│       ├── progress.get.ts       # 读所有进度
│       ├── progress.post.ts      # 写单条进度（防抖在服务端落盘）
│       ├── settings.get.ts       # 读配置（根目录、开关）
│       ├── settings.post.ts      # 写配置
│       ├── cover/[...path].get.ts # 视频封面：ffmpeg 懒抽帧，落盘 data/covers/ 缓存
│       └── stream/[...path].get.ts # Range 视频流
├── data/                   # 运行时数据：settings.json / courses.json / progress.json
├── assets/  /  components/  # Nuxt 默认约定
├── shared/                   # 跨前后端共享类型（课程/视频/进度）
├── nuxt.config.ts
└── package.json
```

## UI 层分层关系

```
reka-ui       无样式原语：Dialog / Dropdown / Popover / Tooltip…
   └── shadcn-vue    reka-ui + Tailwind v4，应用级组件（Button/Card/…）
        └── inspira-ui    shadcn-vue 之上的炫酷网站组件，按需挑选
```

- **reka-ui**：只提供行为（可访问性、键盘导航、焦点管理），零样式，不直接写页面
- **shadcn-vue**：通过 `npx shadcn-vue add <name>` 把组件源码复制进仓库，代码归自己所有，直接用 Tailwind 类改样式
- **inspira-ui**：落地页/炫酷组件（Hero、渐变文字、Dock 等），视频站按需取用少量，不整体引入

> 不用整套 Element Plus / Naive UI 等重型组件库：场景是纯视频站，UI 很轻，引入框架级组件库反而加重维护负担。

## 目录模型

- **根目录**：`settings.json` 里存数组，可配置多个；默认 `[ "/Volumes/ToshibaSSD/英语资料" ]`
- **嵌套层级**：最多 3 级 —— 课程 → group → 视频；group 仅在存在子目录时出现
- **超过 3 级**：不丢弃，文件归入其所在第 3 级 group，扫描结果附带警告（"发现 N 个超过3级的文件"）
- **内容类型**：mp4/mp3 收录（`<video>` 标签原生播放 mp3，标记为音频）；PDF 等不进目录
- **多根目录**：课程列表合并展示，课程卡片带来源徽标；课程 slug 加目录前缀防重名
- **重复文件**：`(1)` 孪生全展示不删除，扫描警告提示家长自行整理源盘
- **排序**：`Intl.Collator('zh-Hans-CN', { numeric: true })` 统一排课程与集名

## 扫描策略

1. 首次启动自动扫描一次，结果落盘 `courses.json`（含每个视频的 mtime）
2. 每次请求读索引；后台按**目录节点 mtime** 校验（能捕获深层新增/删除），变了才增量重扫
3. 手动扫描按钮存在（设置页），强制全量重扫
4. 脏文件过滤：忽略 `._*`、`*.downloading`、隐藏文件

## API 设计（Nitro server routes）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/courses` | 读索引（必要时触发重扫），返回课程 → group → 视频结构 |
| POST | `/api/scan` | 强制重扫（设置页按钮） |
| GET | `/api/progress` | 返回全部播放进度（key 为视频相对路径） |
| POST | `/api/progress` | 写入某视频进度（防抖合并写盘，容忍多设备并发） |
| GET | `/api/settings` | 读配置（根目录、PIN 状态、连播开关） |
| POST | `/api/settings` | 写配置 |
| GET | `/api/cover/[...path]` | 视频封面：ffmpeg 懒抽帧（10% 处一帧、缩 640 宽），缓存 `data/covers/`；音频/抽帧失败返回 404 |
| GET | `/api/stream/[...path]` | 视频流：支持 `Range`（206）、`Content-Range`、`HEAD`，iPad 拖进度条依赖 |

## 显示名

- 课程：去掉前导 `N.` 编号前缀并 trim 空白，保留其余原名；卡片副标题显示"共 N 集"
- 集名：去掉扩展名、trim 尾部空格，其余原样（数字序号是课序号，保留）

## 数据流

1. **浏览**：首页读 `GET /api/courses` → 顶部"继续观看"（按 `updatedAt` 倒序、未到"看完"阈值的 6 条）+ 课程卡片 → 课程页（group 分组 + 该集进度）
2. **播放**：`<video src="/api/stream/...">` 直出流；点击视频卡片直接全屏（iOS 原生）；支持 0.5–2x 倍速；自动连播默认关，开启后按课程排序跨 group 连播，跳集先显示标题 2 秒
3. **进度**：播放中 5s 节流上报 `POST /api/progress`，`visibilitychange`/`beforeunload` 强制 flush；进入播放页按上次进度 `seek` 续播
4. **进度语义**：存 `{ position, duration, updatedAt }`；看完判定 = `position ≥ 95%` 或 `距末尾 < 5s`
5. **存储**：服务端 1s 防抖合并写盘（last-write-wins），原子写（临时文件 + rename）

## 错误处理与边界

- 磁盘未挂载 / 目录不存在 → `/api/courses` 返回明确错误，前端展示"未找到硬盘"
- 文件不存在 / Range 越界 → 返回 416 或 404，播放器提示
- 脏文件过滤：忽略 `._*`、`*.downloading`、隐藏文件
- 中文/特殊字符文件名 → URL 编码安全处理（含 `.MP4` 大写扩展名的 MIME 小写映射）
- 局域网内不做鉴权、无 PIN（设置页也开放）；若将来暴露公网再加认证层

## 部署（launchd）

- `npm run build` 产出 `.output/server/index.mjs`（Nitro 单进程，含 API + 静态资源）
- launchd LaunchAgent 用户态常驻：开机自启、崩溃重启、日志到 `/tmp/vidi.log`
- 端口 8080；iPad 同局域网访问 `http://<Mac局域网IP>:8080`
- 更新流程：改代码 → `npm run build` → `launchctl kickstart -k` 重启即可

## 对调研决策的更新

research.md 原定「原生 HTML+CSS+JS、无框架、无构建」，现改为 **Nuxt 4 全栈 + Tailwind v4 + shadcn-vue**。其余决策（Range 流、进度续播、launchd、零数据库）不变；「实时扫描」改为「索引缓存 + mtime 增量校验」，见 [02-decision-tree.md](02-decision-tree.md)。
