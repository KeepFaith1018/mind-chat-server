# Phase4 实现总结：安全体系与限流

## 1. 本阶段目标

对照实施方案中的 Phase4，完成三项能力：

1. 输入安全检测（Input Guard）
2. 输出安全检测（Output Guard）
3. 用户/IP 维度限流（Rate Limit Guard）

---

## 2. 本轮新增模块与文件

## 2.1 安全模块

新增：

- `src/modules/safety/safety.module.ts`
- `src/modules/safety/safety.service.ts`

能力：

1. 输入检测：识别常见 Prompt Injection 关键词（如 ignore previous instructions、reveal system prompt、jailbreak 等）
2. 输出检测：拦截危险输出片段（如 script 标签、私钥片段、疑似 API Key）

---

## 2.2 限流装饰器与 Guard

新增：

- `src/common/decorators/rate-limit.decorator.ts`
- `src/common/guards/rate-limit.guard.ts`

能力：

1. 支持在接口上声明 `@RateLimit(limit, windowSeconds)`
2. 基于用户 ID（已登录）或 IP（未登录）进行滑动窗口计数
3. 超限后抛业务异常（`EMAIL_RATE_LIMIT`，提示请求过频）

---

## 3. 聊天链路接入情况

## 3.1 Controller 层限流

文件：

- `src/modules/chat/chat.controller.ts`

接入：

- 类级 Guard：`@UseGuards(AuthGuard, RateLimitGuard)`
- `POST /v1/chat`：`@RateLimit(10, 60)`
- `GET /v1/chat/capabilities`：`@RateLimit(60, 60)`

效果：

- 防止聊天接口被高频刷请求
- 能力查询接口也有基础限流保护

## 3.2 Service 层安全检测

文件：

- `src/modules/chat/chat.service.ts`

接入点：

1. 输入检测：`chat()` 入口最前执行 `safetyService.assertSafeInput(dto.messages)`
2. 输出检测：流式返回时对每个 content chunk 执行 `filterOutputChunk`
   - 命中规则后替换为安全文案并终止后续输出

---

## 4. ChatModule 依赖更新

文件：

- `src/modules/chat/chat.module.ts`

变更：

1. 引入 `SafetyModule`
2. 注册 `RateLimitGuard` provider，供控制器守卫注入使用

---

## 5. 与方案对照结论

对照 `/doc/15-模型能力计费安全实施方案.md`：

- Input Guard：已落地
- Output Guard：已落地（规则版）
- API Rate Limit：已落地（内存版 Guard）

说明：

- 当前限流实现为进程内内存计数，适合单实例开发/测试环境；
- 若进入生产多实例，建议下一步切换 Redis 计数以保证分布式一致性。

---

## 6. 下一步建议（Phase4.5）

1. 将限流存储从内存切换到 Redis
2. 为 Safety 命中结果增加审计日志（userId、conversationId、pattern）
3. 引入可配置规则表，避免硬编码关键词
4. 输出安全增加二级审核（外部 moderation 服务，可异步）
