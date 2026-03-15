import { ErrorCode } from "./errorCodeMap";
export declare class Result<T = any> {
    readonly success: boolean;
    readonly code: number;
    readonly message: string;
    readonly data?: T;
    private constructor();
    static success<T>(data: T): Result<T>;
    static error(code: ErrorCode, message?: string): Result<never>;
}
