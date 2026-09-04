# Vidi

家里的英语学习视频小站。

## 名字的由来

**Vidi** 是拉丁语 **"I saw"**（"我看见了"）的意思，也是 **video** 的词根。

- 短、好记、好读，和"看视频"天然契合；
- 中文可谐音「微迪」「小见」，给孩子用不拗口；
- 由「萤语剧场」「小剧场」「PeanutTV」等候选名字中选定。

## 背景

家里的英语学习资料存在移动硬盘上：

- 6 套课程（自然拼读、新概念 1/2、初级/中高级语法、绘本口语）
- 745 个 mp4、约 117GB，全部 H.264 编码（实测抽查确认）
- 目录结构随意命名，中文 + 数字编号，非标准影视库格式

想让孩子在 iPad 上直接看，需要一个能在这台 Mac 上一直运行、按课程浏览、记住看到哪里的视频小站。

## 目标

- **儿童友好**：大卡片大按钮、点击直全屏、倍速跟读、自动连播
- **全部可改**：Nuxt 4 + shadcn-vue，组件源码进仓库，每一行都能看懂、能改
- **按课程浏览**：读配置的根目录（默认 `英语资料`），课程 → 分组 → 视频展示
- **进度续播**：记录每部视频看到哪里，跨设备统一，"继续观看"一键续播
- **常驻运行**：launchd 开机自启，iPad 浏览器访问即可

技术栈与选型调研见 [docs/00-research.md](docs/00-research.md)，架构见 [docs/01-architecture.md](docs/01-architecture.md)，逐项决策见 [docs/02-decision-tree.md](docs/02-decision-tree.md)。

## 访问

局域网内 iPad 浏览器直接打开 **`http://vidi.local`**（无端口）。Apple 设备原生支持 mDNS `.local` 域名，无需配置 DNS。

- Mac 主机名已设为 `vidi`，Bonjour 自动注册 `vidi.local`
- 服务常驻，两个 launchd job：
  - **`local.vidi`**（用户态 LaunchAgent）— Node 跑 Nitro，监听 `127.0.0.1:8080`，负责扫描硬盘、进度、视频流
  - **`local.vidi-proxy`**（root LaunchDaemon）— `scripts/proxy.mjs` 把 80 转到 8080；安装时把绝对 `node` 路径写入 plist，root 不依赖 fnm / 用户 PATH
- 日志：服务 `/tmp/vidi.log`，代理 `/tmp/vidi-proxy.log`

> 为什么不用 root 直接监听 80：macOS 的 TCC 会拦 root 进程读取可移动硬盘（`/Volumes`），导致视频流 EPERM。所以读盘的 nitro 以用户态跑 8080，root 只做不读盘的端口转发。

## 部署（launchd）

```bash
pnpm launchd:install   # 按本机路径渲染并安装两个 plist（proxy 需一次密码）
pnpm launchd:start     # 加载/重启两个 job
pnpm launchd:stop      # 停止两个 job
pnpm launchd:restart   # 重启两个 job
pnpm launchd:status    # 查看两个 job 状态 + 站点可达性
pnpm launchd:logs      # 实时查看日志
```

- 用户态 nitro：`~/Library/LaunchAgents/local.vidi.plist`。仍用 Node：`pnpm launchd:install` 把当时 PATH 上的 node 写入 `@@NODE_BIN@@`
- root 代理：`/Library/LaunchDaemons/local.vidi-proxy.plist`。`pnpm launchd:install` 把当时 PATH 上的 node 写入 `@@NODE_BIN@@`，跑 `scripts/proxy.mjs`（80 → 8080）

更新流程：改代码 → `pnpm build` → `pnpm launchd:restart`。

> nitro 以用户态运行，`data/` 下的文件属主即当前用户，可直接手改 `settings.json` / `progress.json`。

## 开发

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 产出 .output
pnpm typecheck    # 类型检查
pnpm web          # 浏览器打开 http://vidi.local
```
