# Vidi 架构

> 技术选型调研见 [00-research.md](00-research.md)。本文记录最终架构设计。

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
| 列表扫描 | Node `fs` 递归扫 `英语资料` | 过滤脏文件（`._*`、`*.downloading`），中文自然排序 |
| 进度存储 | `progress.json`（防抖写入） | 跨设备统一、可读可改 |
| 常驻 | launchd LaunchAgent（用户态） | 能读用户权限的硬盘、开机自启 |
| 端口 | 8080 | iPad 访问 `http://Mac局域网IP:8080` |

## 项目结构

```
vidi/
├── app/                    # 前端页面（Nuxt 4，默认 app 目录）
│   ├── app.vue             # 根组件（全屏、移动端适配）
│   ├── pages/
│   │   ├── index.vue       # 课程列表（首页）
│   │   ├── course/[slug].vue  # 某课程的视频列表 + 续播状态
│   │   └── watch/[...path].vue # 播放页（video 标签 + 进度上报）
│   └── components/ui/      # shadcn-vue 复制进来的组件（Button/Card/…）
├── server/
│   └── api/
│       ├── courses.get.ts        # 扫描并返回课程列表
│       ├── progress.get.ts       # 读所有进度
│       ├── progress.post.ts      # 写单条进度（防抖在服务端落盘）
│       └── stream/[...path].get.ts # Range 视频流
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

## API 设计（Nitro server routes）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/courses` | 递归扫描 `英语资料`，返回课程 → 视频两级结构（过滤脏文件、中文自然排序） |
| GET | `/api/progress` | 返回全部播放进度（key 为视频相对路径） |
| POST | `/api/progress` | 写入某视频进度（防抖合并写盘，容忍多设备并发） |
| GET | `/api/stream/[...path]` | 视频流：支持 `Range`（206）、`Content-Range`、`HEAD`，iPad 拖进度条依赖 |

## 数据流

1. **浏览**：首页 `GET /api/courses` 渲染课程卡片 → 点击进入课程页 → 视频列表（标题 + 该集进度）
2. **播放**：`<video src="/api/stream/...">` 直出流；iPad Safari 对 H.264 mp4 直接硬解，大概率无需转码
3. **进度**：播放中节流上报 `POST /api/progress`，切后台/离开页面前强制保存；进入播放页时按上次进度 `seek` 续播
4. **存储**：`progress.json`（存于项目目录），防抖写盘，可读可手改

## 错误处理与边界

- 磁盘未挂载 / 目录不存在 → `/api/courses` 返回明确错误，前端展示"未找到硬盘"
- 文件不存在 / Range 越界 → 返回 416 或 404，播放器提示
- 脏文件过滤：忽略 `._*`、`*.downloading`、隐藏文件
- 中文/特殊字符文件名 → URL 编码安全处理
- 局域网内不做鉴权（可接受）；若将来暴露公网再加认证层

## 部署（launchd）

- `npm run build` 产出 `.output/server/index.mjs`（Nitro 单进程，含 API + 静态资源）
- launchd LaunchAgent 用户态常驻：开机自启、崩溃重启、日志到 `/tmp/vidi.log`
- 端口 8080；iPad 同局域网访问 `http://<Mac局域网IP>:8080`
- 更新流程：改代码 → `npm run build` → `launchctl kickstart -k` 重启即可

## 对调研决策的更新

research.md 原定「原生 HTML+CSS+JS、无框架、无构建」，现改为 **Nuxt 4 全栈 + Tailwind v4 + shadcn-vue**。其余决策（Range 流、进度续播、launchd、零数据库）不变。
