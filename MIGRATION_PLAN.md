# Nitro 到 NestJS 后端迁移技术方案

## 1. 迁移概述
本方案旨在将原 Nuxt/Nitro 后端逻辑迁移至 NestJS 架构。目标是保持原有业务逻辑、数据库结构及接口契约不变，利用 NestJS 的模块化、依赖注入和规范化特性重构代码，提升系统的可维护性和扩展性。

## 2. 核心架构映射

| 概念 | 原 Nitro 实现 (`old/server/`) | 新 NestJS 实现方案 (`src/`) | 说明 |
| :--- | :--- | :--- | :--- |
| **入口** | `server/api/*` (文件路由) | `Controllers` (装饰器路由) | 显式声明路由，更清晰。 |
| **业务逻辑** | 直接写在 Event Handler 中 | `Services` (Providers) | 逻辑与控制器分离，便于复用和测试。 |
| **数据库** | `db/prismaClient.ts` 全局单例 | `PrismaModule` & `PrismaService` | 依赖注入，生命周期管理。 |
| **鉴权** | `middleware/auth.ts` | `AuthGuard` (Guards) | 利用 NestJS Guard 机制进行守卫。 |
| **上下文** | `event.context` | `ExecutionContext` / `Request` | 通过装饰器 `@User()` 获取用户信息。 |
| **配置** | `runtimeConfig` | `ConfigModule` | 统一管理环境变量。 |
| **异常处理** | `createError` | `Filters` & `BusinessException` | 统一异常过滤器，标准化错误响应。 |

## 3. 模块迁移详情

### 3.1 基础设施 (Infrastructure)
*   **Prisma ORM**: 
    *   复用原 `schema.prisma`。
    *   使用 `PrismaService` 替代原有的 `prismaClient` 导出。
*   **配置管理**:
    *   引入 `@nestjs/config`。
    *   确保 `.env` 变量与 `ConfigService` 对接。
*   **日志系统**:
    *   集成 `winston` (已在模版中)，替代简单的 `console.log`。

### 3.2 鉴权模块 (Auth Module)
*   **目标**: 迁移登录、注册、OAuth (Github/Google)、登出、获取当前用户信息。
*   **实现策略**:
    *   **Token 管理**: 使用 `@nestjs/jwt` 服务，替代原 `utils/jwt.ts`。
    *   **密码处理**: 封装 `bcrypt` 逻辑到 `AuthService`。
    *   **Cookie 处理**: 引入 `cookie-parser` 中间件，在 Global Guard 或 Auth Guard 中解析 Cookie 中的 Token。
*   **接口映射**:
    *   `POST /api/auth/login` -> `AuthController.login()`
    *   `POST /api/auth/register` -> `AuthController.register()`
    *   `GET /api/auth/me` -> `AuthController.getProfile()`
    *   `POST /api/auth/logout` -> `AuthController.logout()`

### 3.3 聊天模块 (Chat Module) - **核心难点**
*   **目标**: 迁移 AI 对话接口，支持 SSE (Server-Sent Events) 流式响应。
*   **实现策略**:
    *   **LangChain 集成**: 将 `utils/ai.ts` 中的模型初始化逻辑迁移至 `ChatService`。
    *   **SSE 实现**: 
        *   NestJS 支持 `@Sse()` 装饰器返回 `Observable` 流。
        *   或者直接注入 `@Res()` 使用 `Response` 对象写入流 (推荐，灵活性更高，兼容 LangChain stream)。
    *   **数据持久化**: 保持原有逻辑，在流式传输完成后（或过程中）异步保存 `Message` 记录。
*   **接口映射**:
    *   `POST /api/chat` -> `ChatController.chat()`

### 3.4 会话管理 (Conversation Module)
*   **目标**: 管理对话列表、历史记录。
*   **实现策略**:
    *   标准的 CRUD Service 实现。
*   **接口映射**:
    *   `GET /api/conversations` -> `ConversationController.findAll()`
    *   `GET /api/conversations/:id` -> `ConversationController.findOne()`
    *   `DELETE /api/conversations/:id` -> `ConversationController.remove()`
    *   `PATCH /api/conversations/:id` -> `ConversationController.update()`

## 4. 统一异常处理与错误码映射

### 4.1 现有实现分析
*   **Nitro 实现** (`old/server/error.ts`):
    *   使用 `createError({ statusCode, message })` 抛出错误。
    *   返回格式：`{ statusCode, statusMessage, message, stack? }`。
*   **NestJS 模版实现** (`src/common/exception/` & `src/common/filter/`):
    *   定义了 `ErrorCode` 枚举 (`errorCodeMap.ts`)。
    *   定义了 `BusinessException` 类，接收 `code` 和 `message`。
    *   `AllExceptionsFilter` 统一捕获异常并格式化为标准 `Result` 结构。

### 4.2 迁移策略
在迁移过程中，我们将**严格使用 NestJS 模版中已有的异常处理机制**，不再使用 `createError`。

1.  **抛出异常**:
    *   业务逻辑中遇到错误（如“用户不存在”、“密码错误”），使用 `throw new BusinessException(ErrorCode.XXX)`。
    *   如果需要自定义消息，使用 `throw new BusinessException(ErrorCode.XXX, '自定义消息')`。
    *   避免直接抛出 `HttpException` 或 `Error`，除非是系统级未捕获错误。

2.  **错误码映射**:
    *   **401 Unauthorized**: `ErrorCode.UNAUTHORIZED`
    *   **403 Forbidden**: `ErrorCode.FORBIDDEN`
    *   **404 Not Found**: `ErrorCode.NOT_FOUND`
    *   **400 Bad Request**: `ErrorCode.PARAM_ERROR`
    *   **500 Internal Error**: `ErrorCode.INTERNAL_ERROR`
    *   **特定业务错误**: 查阅 `ErrorCode` 枚举，如 `ErrorCode.AUTH_USER_NOT_FOUND`。

3.  **过滤器行为 (`AllExceptionsFilter`)**:
    *   捕获 `BusinessException`: 返回 HTTP 状态码（根据 `ErrorCodeHttpStatusMap`）和 JSON Body: `{ success: false, code: 4xxxx, message: '...' }`。
    *   捕获 `HttpException` (如参数校验失败): 返回 400 和 `{ success: false, code: 40000, message: '...' }`。
    *   捕获未知 `Error`: 返回 500 和 `{ success: false, code: 50000, message: '服务器内部错误' }`。

4.  **前端兼容性注意**:
    *   原 Nitro 返回的错误格式可能较为扁平（直接包含 `statusCode`）。
    *   新 NestJS 返回的是 `{ success: false, code: ..., message: ... }`。
    *   **确认**: 前端代码需要适配新的错误响应结构，或者我们在 Filter 中调整输出结构以完全模拟旧格式（建议前端适配标准结构，长远更有利）。本方案暂定**使用新模版的标准结构**。

## 5. 关键技术点与变更

### 5.1 统一响应结构
新项目已定义 `Result` 类 (`common/utils/result.ts`)。
*   所有 Controller 方法（非流式）应返回 `Result.success(data)`。
*   配合 `ResponseInterceptor` 自动包装返回值。

### 5.2 Cookie 与 Token
*   原 Nitro 项目高度依赖 Cookie 存储 Token。
*   迁移时将在 `main.ts` 启用 `app.use(cookieParser())`。
*   自定义 `AuthGuard` 从 `request.cookies['token']` 读取 Token 并验证。

## 6. 实施步骤规划

1.  **环境准备**: 安装 `cookie-parser`, `@types/cookie-parser`。
2.  **鉴权模块迁移**: 
    *   实现 `AuthService` (登录/注册逻辑)。
    *   实现 `AuthController`。
    *   验证 Cookie 写入与读取。
3.  **用户模块迁移**: 实现 `UserModule` (基础信息获取)。
4.  **会话模块迁移**: 实现 `ConversationModule` (CRUD)。
5.  **聊天模块迁移**: 
    *   集成 LangChain。
    *   实现流式接口。
    *   调试 SSE 前端兼容性。
6.  **整体验收**: 对照原接口文档进行测试。

## 7. 风险与对策
*   **风险**: SSE 格式不一致导致前端无法解析。
    *   **对策**: 严格比对原 `h3` 的输出格式 (event/data)，确保 NestJS 输出完全一致的 text/event-stream 格式。
*   **风险**: 数据库连接泄露。
    *   **对策**: 确保 `PrismaService` 正确实现 `onModuleInit` 和 `onModuleDestroy`。

---
**审核确认**: 请确认以上方案是否符合预期，特别是关于 **Cookie 鉴权** 和 **SSE 实现** 的处理方式。
