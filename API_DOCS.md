# 后端接口文档 (完整版)

## 1. 基础说明

### 1.1 接口前缀
所有接口均以 `/api` 开头 (假设 NestJS 配置了 Global Prefix)。

### 1.2 统一响应结构
所有非重定向接口均返回 JSON 格式，结构如下：

```json
{
  "success": true,        // 是否成功
  "code": 0,             // 业务状态码 (0 表示成功)
  "message": "success",  // 提示信息
  "data": { ... }        // 业务数据
}
```

错误响应示例：
```json
{
  "success": false,
  "code": 40100,
  "message": "未登录",
  "data": null
}
```

### 1.3 鉴权方式
*   **Access Token**: 登录成功后通过 `httpOnly Cookie` (`token`) 下发，有效期 15 分钟。
*   **Refresh Token**: 登录成功后通过 `httpOnly Cookie` (`refresh_token`) 下发，有效期 7 天。
*   前端请求时浏览器会自动携带 Cookie，无需手动设置 Header。

---

## 2. 认证模块 (Auth)

### 2.1 邮箱注册
*   **URL**: `POST /api/auth/register`
*   **描述**: 用户使用邮箱和密码注册。
*   **请求体 (JSON)**:

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 (至少6位) |
| `name` | string | 否 | 用户昵称 |

*   **响应 (Success)**: 包含用户基本信息。
*   **Cookie**: 设置 `token` 和 `refresh_token`。

### 2.2 邮箱登录
*   **URL**: `POST /api/auth/login`
*   **描述**: 用户使用邮箱和密码登录。
*   **请求体 (JSON)**:

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |

*   **响应 (Success)**: 包含用户基本信息。
*   **Cookie**: 设置 `token` 和 `refresh_token`。

### 2.3 退出登录
*   **URL**: `POST /api/auth/logout`
*   **描述**: 清除服务端/客户端的登录状态。
*   **请求体**: 无
*   **响应**: `data: null`
*   **Cookie**: 清除 `token` 和 `refresh_token`。

### 2.4 刷新 Token
*   **URL**: `POST /api/auth/refresh`
*   **描述**: 当 Access Token 过期时，使用 Refresh Token 换取新的 Token。
*   **请求体**: 无 (通过 Cookie `refresh_token` 传递)
*   **响应**: `data: null`
*   **Cookie**: 更新 `token` 和 `refresh_token`。

### 2.5 获取当前用户信息
*   **URL**: `GET /api/auth/me`
*   **描述**: 获取当前登录用户的详细信息。
*   **请求头**: 需携带 Cookie。
*   **响应**: 包含用户基本信息。

---

## 3. OAuth 第三方登录

### 3.1 OAuth 跳转
*   **URL**: `GET /api/auth/oauth/:provider`
*   **参数**:
    *   `:provider`: `github` 或 `google`
*   **描述**: 访问此接口将直接重定向 (302) 到第三方授权页面。
*   **示例**: `GET /api/auth/oauth/github`

### 3.2 OAuth 回调 (后端处理)
*   **URL**: `GET /api/auth/:provider/callback`
*   **描述**: 第三方授权后的回调地址，后端处理完逻辑后会**重定向到首页 (`/`)**，并设置登录 Cookie。

---

## 4. AI 聊天模块 (Chat)

### 4.1 发送聊天消息 (SSE 流式)
*   **URL**: `POST /api/chat`
*   **描述**: 发送用户消息，获取 AI 流式回复。支持上下文管理、文件注入、Prompt 防护。
*   **Content-Type**: `application/json`
*   **请求体 (JSON)**:

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `messages` | Array | 是 | 消息列表 |
| `messages[].role` | string | 是 | `user` | `assistant` | `system` |
| `messages[].content` | string | 是 | 消息内容 |
| `model` | string | 否 | 模型名称 (默认 `deepseek-ai/DeepSeek-V3`) |
| `conversationId` | string | 否 | 会话 ID。为空则创建新会话。 |
| `fileIds` | string[] | 否 | 上传的文件 ID 列表 (用于上下文注入) |

*   **响应**: `text/event-stream` (Server-Sent Events)
*   **SSE 事件类型**:
    *   `event: meta`: 返回会话元数据 (如 `conversationId`)。
    *   `event: thinking`: 返回 AI 的思考过程 (DeepSeek R1)。
    *   `event: content`: 返回 AI 的正式回复内容 (增量)。
    *   `event: done`: 传输结束。
    *   `event: error`: 发生错误。

**示例 SSE 响应**:
```text
event: meta
data: {"conversationId":"uuid..."}

event: thinking
data: {"delta":"正在分析..."}

event: content
data: {"delta":"你好"}

event: content
data: {"delta":"，我是"}

event: done
data: [DONE]
```

---

## 5. 文件上传模块 (Upload)

### 5.1 上传文件
*   **URL**: `POST /api/upload`
*   **描述**: 上传文件并提取文本内容 (用于 AI 上下文)。
*   **Content-Type**: `multipart/form-data`
*   **请求体**:
    *   `file`: 文件对象 (支持 PDF, Word, TXT, Markdown, 最大 10MB)。
*   **响应 (Success)**:
```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": "uuid...",
    "filename": "report.pdf",
    "size": 1024,
    "contentPreview": "文件开头的内容..."
  }
}
```

---

## 6. 会话管理模块 (Conversation)

### 6.1 获取会话列表
*   **URL**: `GET /api/conversations`
*   **参数**:
    *   `page`: 页码 (默认 1)
    *   `pageSize`: 每页数量 (默认 20)
*   **响应**: 分页的会话列表。

### 6.2 创建会话
*   **URL**: `POST /api/conversations`
*   **请求体**:
    *   `modelId`: string (可选)
*   **响应**: 新创建的会话对象。

### 6.3 获取会话详情
*   **URL**: `GET /api/conversations/:id`
*   **描述**: 获取特定会话的详细信息及历史消息。
*   **响应**: 会话对象 + `messages` 数组。

### 6.4 更新会话
*   **URL**: `PATCH /api/conversations/:id`
*   **请求体**:
    *   `title`: string (可选)
    *   `isPinned`: boolean (可选)
    *   `modelId`: string (可选)
*   **响应**: 更新后的会话对象。

### 6.5 删除会话
*   **URL**: `DELETE /api/conversations/:id`
*   **响应**: `success: true`

---

## 7. 错误码速查表 (ErrorCode)

| 错误码 | 说明 | HTTP 状态码 |
| :--- | :--- | :--- |
| **0** | **成功** | 200 |
| **40000** | 参数错误 | 400 |
| **40100** | 未登录 | 401 |
| **40101** | 登录已过期 | 401 |
| **40300** | 无权限访问 | 403 |
| **40400** | 资源不存在 | 404 |
| **50000** | 服务器内部错误 | 500 |
| **50300** | 服务暂不可用 | 503 |
| **42001** | 不支持的文件类型 | 400 |
| **42002** | 文件不存在 | 404 |
| **43001** | 会话不存在 | 404 |
| **46001** | 对话额度已用完 | 403 |
| **46002** | 请求过于频繁 | 429 |
| **47001** | 账号或密码错误 | 400 |
| **47002** | 用户已存在 | 400 |
| **47003** | 用户不存在 | 404 |
| **47004** | 刷新令牌无效 | 401 |
