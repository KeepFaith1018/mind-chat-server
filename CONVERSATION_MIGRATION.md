# 会话管理模块迁移文档

## 1. 迁移目标
将原 Nitro 的 `/api/conversations` 路由下的 CRUD 接口迁移至 NestJS 的 `ConversationModule`。

## 2. 接口映射

| 原接口 (Nitro) | 对应 NestJS 接口 | 说明 |
| :--- | :--- | :--- |
| `GET /api/conversations` | `GET /api/conversations` | 获取会话列表 (支持分页) |
| `POST /api/conversations` | `POST /api/conversations` | 创建新会话 |
| `GET /api/conversations/:id` | `GET /api/conversations/:id` | 获取特定会话详情 (包含消息列表) |
| `DELETE /api/conversations/:id` | `DELETE /api/conversations/:id` | 删除会话 |
| `PATCH /api/conversations/:id` | `PATCH /api/conversations/:id` | 更新会话 (标题/置顶/模型) |

## 3. 详细设计

### 3.1 DTO 设计
*   **CreateConversationDto**:
    *   `modelId`: string (可选，默认 `deepseek-ai/DeepSeek-V3`)
*   **UpdateConversationDto**:
    *   `title`: string (可选)
    *   `isPinned`: boolean (可选)
    *   `modelId`: string (可选)
*   **PaginationDto**:
    *   `page`: number (可选，默认 1)
    *   `pageSize`: number (可选，默认 20)

### 3.2 Service 逻辑
*   **findAll**: 接收 `userId` 和 `PaginationDto`，返回分页列表。
*   **create**: 接收 `userId` 和 `CreateConversationDto`，创建并返回新会话。
*   **findOne**: 接收 `userId` 和 `id`，返回会话详情（包含 `messages`，按 `createdAt ASC` 排序）。
*   **remove**: 接收 `userId` 和 `id`，校验归属权后删除。
*   **update**: 接收 `userId`、`id` 和 `UpdateConversationDto`，校验归属权后更新。

### 3.3 Controller 逻辑
*   使用 `@UseGuards(AuthGuard)` 保护所有接口。
*   使用 `@CurrentUser()` 获取当前登录用户 ID。
*   直接返回数据，依赖全局 Interceptor 包装 `Result`。

## 4. 注意事项
1.  **权限校验**: 必须确保用户只能操作自己的会话 (`where: { userId: user.id }`)。
2.  **错误处理**: 使用 `BusinessException` 抛出 `ErrorCode.CONVERSATION_NOT_FOUND` 等错误。
3.  **Prisma 关联**: 删除会话时，由于 Schema 中设置了 `onDelete: Cascade`，关联的 Message 会自动删除，无需手动处理。

## 5. 目录结构
```
src/modules/conversation/
├── dto/
│   ├── create-conversation.dto.ts
│   ├── update-conversation.dto.ts
│   └── pagination.dto.ts
├── conversation.controller.ts
├── conversation.module.ts
└── conversation.service.ts
```
