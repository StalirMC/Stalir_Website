# Stalir Website

Stalir 公益群组生存服的官方网站。支持 **1.13 ~ 26.2** 版本加入，包含群组服与模组服两大玩法。

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | 原生 HTML + CSS + JavaScript |
| 图标 | 内联 SVG |
| 构建 | 纯静态，零依赖 |
| 部署 | GitHub Pages + GitHub Actions |
| 许可证 | MIT |

## 项目结构

```
stalir/
├── .github/workflows/
│   └── deploy.yml        # GitHub Pages 自动部署
├── index.html             # 主页面
├── style.css              # 样式表
├── script.js              # 交互脚本
├── logo.png               # 网站图标 / Logo
└── README.md
```

## 功能特性

- **服务器状态检测** — 双 API（mcapi.us / mcsrvstat.us）并行检测，取最新数据源
- **在线人数显示** — 状态徽章与 Hero 数据栏实时展示在线玩家数，每 60s 自动刷新
- **整合包版本** — 可配置 GitHub Releases 接口自动获取最新版本号（未配置时优雅降级）
- **滚动导航高亮** — 使用 IntersectionObserver 自动高亮当前区块
- **FAQ 折叠面板** — 6 条常见问题，附 FAQPage 结构化数据
- **返回顶部** — 滚动后浮现的悬浮按钮
- **响应式设计** — 桌面 / 平板 / 手机多端适配
- **无障碍支持** — 跳转链接、键盘操作、ARIA 标注、`prefers-reduced-motion` 降级
- **VitePress 风格光晕** — Hero 区域 Logo 背景光晕与粒子连线背景
- **SVG 导航图标** — 所有导航链接均有对应图标

## 页面区块

1. **首页** — 服务器状态、IP 复制、版本支持说明、数据统计栏
2. **特色** — 8 大服务器特色卡片
3. **架构** — 服务端与面板介绍
4. **模组** — 模组服 Mod 分类 + 整合包提示
5. **FAQ** — 常见问题折叠面板
6. **加入** — 服务器地址、QQ 群入口

## 配置

站点配置集中在 `script.js` 顶部的 `CONFIG` 对象中：

| 键 | 说明 |
|------|------|
| `serverIP` | 服务器地址（默认 `mc.stalir.cn`） |
| `serverPort` | 服务器端口（默认 `25565`） |
| `modpackVersionApi` | 整合包版本 GitHub Releases 接口，留空则显示「见 QQ 群」 |
| `statusRefreshInterval` | 服务器状态自动刷新间隔（毫秒） |

## 本地开发

```bash
git clone https://github.com/kxkl2077/Stalir_Website.git
cd Stalir_Website

# 直接用浏览器打开 index.html 即可预览
# 或使用任意静态文件服务器
python3 -m http.server 8080
```

## 部署

推送至 `main` 分支后，GitHub Actions 自动部署到 GitHub Pages。

> 仅当 commit 修改了 `index.html`、`style.css`、`script.js`、`logo.png` 等网站文件时触发，跳过仅含 `README.md`、`LICENSE`、`.github/workflows/` 的提交。

## License

[MIT](./LICENSE)
