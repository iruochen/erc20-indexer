# ERC20 Token Indexer

[English](#english) | [中文](#中文)

---

## English

A high-performance ERC20 token transfer indexer built with Node.js and TypeScript. It monitors `Transfer` events in real-time, persists them into a PostgreSQL database, and exposes the data via a RESTful API.

### Key Features

- **Real-time Monitoring**: Subscribes to ERC20 `Transfer` events using WebSockets for instant updates.
- **Historical Syncing**: Automatically fetches and indexes historical transaction data from a specified starting block.
- **Progress Tracking**: Tracks sync progress in the database to ensure seamless indexing across restarts.
- **Query API**: Express-based API endpoints for retrieving paginated transfer history for any address.
- **Optimized Performance**: Leverages the `viem` library for efficient blockchain interaction and utilizes optimized SQL indexes.

### Tech Stack

- **Language**: TypeScript
- **Blockchain Interaction**: [viem](https://viem.sh/)
- **Database**: PostgreSQL
- **Web Framework**: Express
- **Runtime**: Node.js

### Getting Started

#### 1. Configuration

Create a `.env` file and provide the following environment variables:

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
RPC_WSS_URL=wss://your-provider-url
CONTRACT_ADDRESS=0x...
PORT=3000
```

#### 2. Database Setup

Execute the SQL commands in [init.sql](init.sql) to create the required tables and indexes.

#### 3. Install Dependencies

```bash
pnpm install
```

#### 4. Run the Indexer

```bash
npm start
```

#### 5. Start the API Server

```bash
npm run serve
```

### API Endpoints

- **Health Check**: `GET /health`
- **Transfer History**: `GET /api/transfers/:address?page=1&limit=20`
- **Sync Status**: `GET /api/sync-status`

### Running with PM2

It is recommended to use [PM2](https://pm2.keymetrics.io/) for process management in production:

```bash
# Install PM2
npm install -g pm2

# Start the indexer
pm2 start "npx tsx index.ts" --name erc20-indexer

# Start the API server
pm2 start "npx tsx server.ts" --name erc20-api

# Monitor processes
pm2 list

# View logs
pm2 logs erc20-indexer
```

### License

ISC

---

## 中文

这是一个基于 Node.js 和 TypeScript 开发的高性能 ERC20 代币交易索引器。它能够实时监听区块链上的 `Transfer` 事件，将其持久化到 PostgreSQL 数据库中，并通过 RESTful API 提供查询服务。

### 主要功能

- **实时监听**: 利用 WebSocket 实时订阅 ERC20 代币的 `Transfer` 事件。
- **历史同步**: 自动从配置的起始区块同步历史交易数据。
- **断点续传**: 通过数据库记录已同步的区块高度，支持程序重启后继续同步。
- **数据查询**: 提供基于 Express 的 API 接口，支持按地址分页查询交易记录。
- **高性能**: 使用 `viem` 库进行高效的区块链交互，并对数据库索引进行了优化。

### 技术栈

- **语言**: TypeScript
- **区块链交互**: [viem](https://viem.sh/)
- **数据库**: PostgreSQL
- **Web 框架**: Express
- **运行环境**: Node.js

### 快速开始

#### 1. 配置环境

复制 `.env.example` (如果不存在请创建) 并填写以下变量：

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
RPC_WSS_URL=wss://your-provider-url
CONTRACT_ADDRESS=0x...
PORT=3000
```

#### 2. 初始化数据库

使用 [init.sql](init.sql) 文件中的 SQL 语句创建必要的表和索引。

#### 3. 安装依赖

```bash
pnpm install
```

#### 4. 运行索引器

```bash
npm start
```

#### 5. 启动 API 服务

```bash
npm run serve
```

### API 接口

- **健康检查**: `GET /health`
- **获取交易历史**: `GET /api/transfers/:address?page=1&limit=20`
- **同步状态**: `GET /api/sync-status`

### 使用 PM2 后台运行

推荐使用 [PM2](https://pm2.keymetrics.io/) 来管理生产环境的进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动索引器
pm2 start "npx tsx index.ts" --name erc20-indexer

# 启动 API 服务
pm2 start "npx tsx server.ts" --name erc20-api

# 查看状态
pm2 list

# 查看日志
pm2 logs erc20-indexer
```

### 开源协议

ISC
