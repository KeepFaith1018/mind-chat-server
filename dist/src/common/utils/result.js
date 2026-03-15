"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
const errorMessageMap_1 = require("./errorMessageMap");
class Result {
    success;
    code;
    message;
    data;
    constructor(success, code, message, data) {
        this.success = success;
        this.code = code;
        this.message = message;
        this.data = data;
    }
    static success(data) {
        return new Result(true, 0, 'success', data);
    }
    static error(code, message) {
        return new Result(false, code, message ?? errorMessageMap_1.ErrorMessageMap[code] ?? 'error');
    }
}
exports.Result = Result;
//# sourceMappingURL=result.js.map