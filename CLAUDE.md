# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

本项目是**西安交通大学130周年校庆微信小程序**，基于微信云开发（云开发）构建，无传统构建系统，使用**微信开发者工具 IDE** 进行开发和调试。

## 开发流程

- 使用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)打开本项目
- 在 `project.config.json` 中设置你的 AppID（替换 `"your-appid-here"`）
- 在 `miniprogram/app.js` 中设置云环境 ID（替换 `wx.cloud.init` 中的 `'your-cloud-env-id'`）
- 云函数部署：在 IDE 中右键点击云函数目录 → "上传并部署"
- 项目根目录无需执行 `npm install` 或任何构建步骤

各云函数目录下有各自的 `package.json`（依赖 `wx-server-sdk ~2.6.3`），如需安装依赖，进入对应云函数目录操作。

## 架构

### 目录结构

```
miniprogram/        # 前端（页面、全局配置、样式）
cloudfunctions/     # 无服务器后端（3个云函数）
docs/               # 中文设计与需求文档
```

### 页面（miniprogram/pages/）

按导航顺序共3个页面：
- **index** — 首页：展示130周年横幅、VIP卡（卡号+优惠券余额）、礼品类型、抽奖入口
- **login** — 微信手机号一键授权（`getPhoneNumber`）；提供"跳过"选项（REQ-012）
- **lottery** — 抽奖转盘（CSS动画 + 云函数并行调用）；每用户仅限一次

### 云函数（cloudfunctions/）

| 函数 | 功能 |
|------|------|
| `login` | 通过 `cloud.openapi.phonenumber.getPhoneNumber` 解密手机号，创建/更新用户记录，生成VIP卡号（`XJTU-XXXXXX`） |
| `getLottery` | 按权重概率执行抽奖；使用原子操作 `where({hasLottery:false}).update()` 防止重复抽奖 |
| `getUserInfo` | 通过 openid 查询当前用户的VIP卡信息 |

### 全局状态（app.js globalData）

- `giftType`：`'gift1'` 或 `'gift2'`——启动时从二维码 scene 参数解析
- `userInfo`：缓存的用户信息对象
- `isLoggedIn`：登录状态标志

### 数据库（云数据库 users 集合）

主要字段：`_openid`、`phoneNumber`、`cardNumber`、`couponAmount`、`giftType`、`hasLottery`、`lotteryAmount`、`lotteryTime`

### 关键设计决策

- **二维码区分礼品类型**：二维码的 scene 参数编码礼品类型，`app.js` 启动时用 `decodeURIComponent` 解析并存入 `globalData.giftType`
- **防重复抽奖**：抽奖使用原子 DB 更新（`where({hasLottery: false}).update(...)`），若返回更新记录数为0则说明已抽过
- **手机号安全**：手机号解密仅在云函数中执行，不在客户端处理
- **页面刷新策略**：首页使用 `onShow()`（而非 `onLoad()`）在每次显示时刷新用户信息

## 代码规范

- 所有注释和用户提示文字均使用**中文**（REQ-014）
- 需求编号以 `// REQ-XXX` 注释形式标注在代码中
- 响应式单位使用 `rpx`（微信响应像素，750rpx = 屏幕宽度）
- 主色调：`#8B0000`（深红色）；背景色：`#f5f0e8`（米色）
- 缩进：2个空格
