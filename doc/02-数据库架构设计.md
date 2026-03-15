# MindChat 数据库设计文档 (PostgreSQL)

> **版本**: 1.0.0
> **目标**: 为 MindChat 提供高性能、可扩展的全栈数据支撑，重点支持 AI 推理过程存储、多级权限及安全配额管理。

---

## 一、 设计原则

1. **规范化**: 遵循第三范式，减少冗余。
2. **扩展性**: 关键字段使用 JSONB 存储元数据，适应未来 AI 模型的参数变动。
3. **安全性**: 密码加盐存储，敏感操作记录时间戳。
4. **性能**: 对高频查询字段（如 `user_id`, `conversation_id`）建立索引。

---

## 二、 实体关系图 (ERD) 简述

- **User** 1:N **Conversation**
- **Conversation** 1:N **Message**
- **User** 1:1 **UsageQuota**
- **User** 1:N **Account** (OAuth 多账号关联)

---

## 三、 表结构详述

### 1. `users` (用户基础表)

存储用户的核心身份信息。

| 字段名          | 类型             | 约束                 | 说明                             |
| :-------------- | :--------------- | :------------------- | :------------------------------- |
| `id`            | `UUID`           | `PRIMARY KEY`        | 唯一标识符                       |
| `email`         | `VARCHAR(255)`   | `UNIQUE`, `NOT NULL` | 登录邮箱                         |
| `password_hash` | `VARCHAR(255)`   | `NULLABLE`           | 加密后的密码（OAuth 用户可为空） |
| `name`          | `VARCHAR(100)`   | `NULLABLE`           | 用户昵称                         |
| `avatar_url`    | `TEXT`           | `NULLABLE`           | 头像地址                         |
| `status`        | `INT`            | `DEFAULT 1`          | 状态 (1: 正常, 0: 禁用)          |
| `created_at`    | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`      | 注册时间                         |
| `updated_at`    | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`      | 更新时间                         |

### 2. `accounts` (第三方账号表)

用于支持 OAuth2.0 多平台关联。

| 字段名          | 类型             | 约束            | 说明                     |
| :-------------- | :--------------- | :-------------- | :----------------------- |
| `id`            | `UUID`           | `PRIMARY KEY`   | 唯一标识符               |
| `user_id`       | `UUID`           | `FK (users.id)` | 关联用户                 |
| `provider`      | `VARCHAR(50)`    | `NOT NULL`      | 平台 (github, google 等) |
| `provider_id`   | `VARCHAR(255)`   | `NOT NULL`      | 平台唯一 ID              |
| `access_token`  | `TEXT`           | `NULLABLE`      | 平台令牌                 |
| `refresh_token` | `TEXT`           | `NULLABLE`      | 刷新令牌                 |
| `expires_at`    | `TIMESTAMPTZ(3)` | `NULLABLE`      | 过期时间                 |

### 3. `conversations` (会话表)

管理用户的聊天会话。

| 字段名       | 类型             | 约束               | 说明                  |
| :----------- | :--------------- | :----------------- | :-------------------- |
| `id`         | `UUID`           | `PRIMARY KEY`      | 唯一标识符            |
| `user_id`    | `UUID`           | `FK (users.id)`    | 所属用户              |
| `title`      | `VARCHAR(255)`   | `DEFAULT '新对话'` | 会话标题              |
| `is_pinned`  | `BOOLEAN`        | `DEFAULT FALSE`    | 是否置顶              |
| `model_id`   | `VARCHAR(100)`   | `NOT NULL`         | 当前会话使用的模型 ID |
| `created_at` | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`    | 创建时间              |
| `updated_at` | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`    | 最后更新时间          |

### 4. `messages` (消息明细表)

核心表，支持流式渲染和推理过程展示。

| 字段名              | 类型             | 约束                    | 说明                                 |
| :------------------ | :--------------- | :---------------------- | :----------------------------------- |
| `id`                | `UUID`           | `PRIMARY KEY`           | 唯一标识符                           |
| `conversation_id`   | `UUID`           | `FK (conversations.id)` | 所属会话                             |
| `role`              | `VARCHAR(20)`    | `NOT NULL`              | 角色 (user, assistant, system, tool) |
| `content`           | `TEXT`           | `NOT NULL`              | 消息原文 / 回答内容                  |
| `reasoning_content` | `TEXT`           | `NULLABLE`              | **AI 的思考/推理过程 (Thinking)**    |
| `tool_calls`        | `JSONB`          | `NULLABLE`              | **工具调用详情 (并行执行结果)**      |
| `tokens`            | `INT`            | `DEFAULT 0`             | 本条消息消耗的 Token 数              |
| `metadata`          | `JSONB`          | `NULLABLE`              | 额外元数据（如引用链接、图片 URL）   |
| `created_at`        | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`         | 发送时间                             |

### 5. `usage_quotas` (用户配额与频率限制表)

用于防盗刷和安全性控制。

| 字段名              | 类型             | 约束                           | 说明                                 |
| :------------------ | :--------------- | :----------------------------- | :----------------------------------- |
| `user_id`           | `UUID`           | `PRIMARY KEY`, `FK (users.id)` | 关联用户                             |
| `daily_token_limit` | `INT`            | `DEFAULT 500000`               | 每日 Token 上限                      |
| `daily_token_usage` | `INT`            | `DEFAULT 0`                    | 今日已用 Token                       |
| `last_request_at`   | `TIMESTAMPTZ(3)` | `NULLABLE`                     | 最后一次请求时间（用于计算频率限制） |
| `total_token_usage` | `BIGINT`         | `DEFAULT 0`                    | 累计消耗 Token                       |
| `updated_at`        | `TIMESTAMPTZ(3)` | `DEFAULT NOW()`                | 配额重置检查点                       |

---

## 四、 索引设计 (Performance)

1. `idx_messages_conversation_id`: 加快会话历史记录查询。
2. `idx_conversations_user_id`: 加快用户会话列表加载。
3. `idx_accounts_provider_id`: 加快 OAuth 登录匹配。

---
