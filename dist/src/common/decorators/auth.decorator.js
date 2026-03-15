"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = exports.AUTH_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.AUTH_KEY = 'needAuth';
const Auth = () => (0, common_1.SetMetadata)(exports.AUTH_KEY, true);
exports.Auth = Auth;
//# sourceMappingURL=auth.decorator.js.map