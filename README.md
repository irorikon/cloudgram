# CloudGram

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/) [![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-blue.svg)](https://core.telegram.org/bots/api)

CloudGram 是一个基于 Cloudflare Workers 和 Telegram Bot API 的云文件管理系统

## 🚀 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) (v16 或更高版本)
- [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) 和一个用于存储文件的 Telegram 群组/频道,把机器人加入到频道并将其作为管理员

### 安装

1. **克隆仓库**

   ```sh
   git clone https://github.com/irorikon/cloudgram.git
   cd cloudgram
   ```

2. **安装依赖**

   ```sh
   npm install
   ```

3. **配置环境**

   - 复制示例配置文件并进行编辑：

   ```sh
   cp wrangler.jsonc.example wrangler.jsonc
   ```

   - 编辑 `wrangler.jsonc` 文件，填入以下信息：
     - JWT 密钥
     - Telegram Bot Token
     - Telegram Chat ID
     - 管理员用户名和密码
    - 本项目只支持单用户，没有用户注册功能

4. **初始化数据库**

   ```sh
   npx wrangler d1 create cloudgram-db
   ```

   将生成的数据库 ID 添加到 `wrangler.jsonc` 文件中。

   ```sh
   # 本地执行建表语句
   npx wrangler d1 execute cloudgram-db --file=schema.sql

   # 远端执行建表语句
   npx wrangler d1 execute cloudgram-db --file=schema.sql --remote
   ```

### 本地开发

1. **启动开发服务器**

   ```sh
   npm run dev
   # 或
   npx wrangler dev
   ```

2. **访问前端**

   打开浏览器访问 <http://localhost:5173>

### 部署到 Cloudflare Workers

```sh
npm run deploy
# 或
npx wrangler deploy
```
