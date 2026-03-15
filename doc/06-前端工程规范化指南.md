# 前端工程规范化搭建指南 (Nuxt 4)

本指南详细记录了本项目从零开始搭建工程规范化的全过程，涵盖了代码风格、提交规范、环境治理及包管理器约束。

---

## 一、 基础环境配置 (EditorConfig + Prettier + ESLint)

### 1. EditorConfig

用于统一不同编辑器（VS Code, WebStorm 等）的基础缩进和换行符。

- **文件**: [.editorconfig](file:///Users/faith/WorkSpace/MindChat/.editorconfig)
- **作用**: 强制所有文件使用 2 空格缩进，UTF-8 编码，LF 换行。

### 2. Prettier

负责代码的视觉格式化。

- **安装**: `pnpm add -D prettier prettier-plugin-tailwindcss`
- **配置**: [.prettierrc.json](file:///Users/faith/WorkSpace/MindChat/.prettierrc.json)
- **关键项**:
  - `semi: false`: 不使用分号。
  - `singleQuote: true`: 使用单引号。
  - `plugins`: 引入 Tailwind CSS 插件，自动对类名进行排序。

### 3. ESLint (Nuxt 4 官方方案)

负责代码逻辑检查。

- **配置**: [eslint.config.mjs](file:///Users/faith/WorkSpace/MindChat/eslint.config.mjs)
- **实现**:
  - 使用 `@nuxt/eslint` 模块。
  - 引入 `eslint-config-prettier` 屏蔽与 Prettier 冲突的规则。

---

## 二、 Git 工作流规范 (Husky + lint-staged)

### 1. Husky 初始化

将 Git 钩子（Hooks）与项目生命周期绑定。

- **安装**: `pnpm add -D husky`
- **命令**: `pnpm husky init`
- **脚本**: `package.json` 中的 `"prepare": "husky"` 确保团队成员在安装依赖后自动激活钩子。

### 2. lint-staged (提交前检查)

只对 Git 暂存区（Staged）的文件进行检查，提高效率。

- **配置**: [package.json](file:///Users/faith/WorkSpace/MindChat/package.json) 中的 `lint-staged` 字段。
- **逻辑**: 提交时自动运行 `prettier --write` 和 `eslint --fix`。

---

## 三、 提交信息规范 (commitlint)

强制执行 **Conventional Commits** 规范，方便后续自动生成变更日志。

- **安装**: `pnpm add -D @commitlint/cli @commitlint/config-conventional`
- **配置**: [commitlint.config.mjs](file:///Users/faith/WorkSpace/MindChat/commitlint.config.mjs)
- **规则**: 强制要求格式为 `<type>(scope): <subject>`，如 `feat(ui): add button`。
- **拦截**: 在 [.husky/commit-msg](file:///Users/faith/WorkSpace/MindChat/.husky/commit-msg) 中调用 `commitlint`。

---

## 四、 环境治理与安全性 (Zod + .env)

### 1. 运行时环境变量校验

防止因缺失环境变量导致的生产环境崩溃。

- **工具**: `zod`
- **实现**: [nuxt.config.ts](file:///Users/faith/WorkSpace/MindChat/nuxt.config.ts)
- **逻辑**: 在 Nuxt 启动阶段对 `process.env` 进行 Schema 验证，若不符合（如 URL 格式错误或必填项缺失）则抛出异常并终止构建。

### 2. .env.example

- **文件**: [.env.example](file:///Users/faith/WorkSpace/MindChat/.env.example)
- **作用**: 提供环境变量模板，方便新成员快速配置。

---

## 五、 包管理器约束 (only-allow)

防止团队成员混用 npm/yarn/pnpm 导致 `lock` 文件冲突。

- **脚本**: `package.json` 中的 `"preinstall": "npx only-allow pnpm"`。
- **作用**: 如果不使用 pnpm 安装依赖，安装过程会直接报错。

---

## 六、 常用命令总结

| 命令                | 作用                         |
| :------------------ | :--------------------------- |
| `pnpm lint`         | 执行 ESLint 全量检查         |
| `pnpm lint:fix`     | 自动修复 ESLint 问题         |
| `pnpm format`       | 检查代码格式 (Prettier)      |
| `pnpm format:write` | 强制格式化所有代码           |
| `pnpm typecheck`    | 执行 TypeScript 全量类型检查 |

---

## 七、 维护建议

1. **定期更新**: 建议每季度更新一次规范相关的依赖包。
2. **规则调整**: 若团队对某个 Lint 规则有异议，应在 `eslint.config.mjs` 中统一调整，而非通过 `eslint-disable` 绕过。
