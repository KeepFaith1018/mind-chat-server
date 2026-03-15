# MindChat 项目架构与 Nuxt 4 技术指南

本文档旨在详细说明 `app/` 目录的结构关系，并讲解 Nuxt 4 的核心概念（Page, Layout, App, Router）在本项目中的应用。

## 一、 目录结构与引用关系

本项目采用 Nuxt 4 标准的目录结构，各文件夹职责明确，形成了一个单向或环状的引用链。

### 1. 核心目录职责

- **`assets/`**: 静态资源。包含 `main.css`，定义全局样式和字体。由 `nuxt.config.ts` 全局引入。
- **`components/`**: UI 组件库。
  - `base/`: 基础通用组件（如 `LoadingScreen`）。
  - `layout/`: 布局专用组件（如 `Header`, `Sidebar`）。
  - `chat/`: 业务逻辑组件（如 `InputBox`, `MessageList`）。
  - **引用关系**: 被 `pages/` 和 `layouts/` 引用。
- **`composables/`**: 可复用的组合式逻辑。
  - `useTheme`, `useBreakpoint`, `useStorage`。
  - **引用关系**: 被组件、Store 和页面广泛引用。
- **`stores/`**: Pinia 状态管理。
  - `useAppStore`, `useAuthStore`, `useChatStore`。
  - **引用关系**: 驱动整个应用的业务逻辑，被组件和页面引用。
- **`middleware/`**: 路由中间件。
  - `auth.global.ts`: 全局拦截逻辑。
  - **引用关系**: 在路由跳转时由 Nuxt 自动触发，引用 `stores/` 进行权限判断。
- **`pages/`**: 路由页面。
  - `index.vue`, `chat.vue`。
  - **引用关系**: 组合 `components` 和 `stores`，定义应用的具体路径。
- **`layouts/`**: 页面外壳。
  - `default.vue`。
  - **引用关系**: 包裹 `pages/`，提供统一的导航和侧边栏。

### 2. 引用拓扑图

```text
app.vue (根节点)
  └── BaseLoadingScreen
  └── NuxtLayout (layouts/default.vue)
        ├── LayoutHeader
        ├── LayoutSidebar
        └── NuxtPage (pages/index.vue, pages/chat.vue)
              ├── 业务组件 (components/chat/*)
              └── 状态驱动 (stores/*)
                    └── 通用逻辑 (composables/*)
```

---

## 二、 Nuxt 4 核心概念讲解

### 1. `app.vue` (入口)

`app.vue` 是 Nuxt 应用的根组件。在 Nuxt 4 中，它通常非常简洁，主要职责是：

- 渲染全局组件（如 Loading、通知弹窗）。
- 初始化全局逻辑（如 `useTheme()`）。
- 使用 `<NuxtLayout>` 和 `<NuxtPage>` 定义渲染层级。

### 2. `pages/` 与 Router (路由)

Nuxt 4 继续采用**基于文件系统的路由**：

- `pages/index.vue` -> 对应路径 `/`。
- `pages/chat.vue` -> 对应路径 `/chat`。
- **Router**: Nuxt 自动生成 `vue-router` 配置。你可以通过 `navigateTo()` 或 `<NuxtLink>` 进行跳转。
- **Middleware**: 在 `middleware/` 目录下的 `.global` 文件会在每次路由切换前执行。本项目利用它实现了未登录拦截和已登录重定向。

### 3. `layouts/` (布局)

布局用于存放多个页面共享的 UI 结构（如侧边栏、页脚）：

- **默认布局**: `default.vue` 会自动包裹所有页面，除非页面显式禁用。
- **插槽**: 布局必须包含 `<slot />`，Nuxt 会将页面内容注入到该位置。
- **动态切换**: 可以在页面中使用 `definePageMeta({ layout: 'other' })` 切换布局，或者像本项目首页一样使用 `layout: false` 完全禁用布局。

### 4. 数据流向与状态管理 (Pinia)

在 Nuxt 4 中，推荐使用 Pinia 进行跨页面状态共享：

- **Persistence**: 本项目结合了 `useStorage` (localStorage) 和 Pinia，实现了刷新页面后主题色、侧边栏状态和登录信息的持久化。
- **Auto-imports**: Nuxt 自动导入 `stores/` 下定义的 Hook，无需手动 `import`。

---

## 三、 本项目特有的架构设计

1. **Server Component 优化**: `index.vue` (首页) 被设计为展示型页面，通过禁用 Layout 实现了 HTML 直出，提升了 LCP (最大内容绘制) 指标。
2. **鉴权上移**: 鉴权逻辑不在页面组件内处理，而是由 `auth.global.ts` 中间件统一管理，避免了页面闪烁和冗余的逻辑检查。
3. **响应式适配**: 通过 `useBreakpoint` 统一管理移动端和桌面端的布局差异，使 `default.vue` 布局能根据屏幕宽度自动切换侧边栏形态。
