/**
 * 发送短信验证码 (使用腾讯云短信服务)
 * 这是一个内部 action，只能通过 internal.sms.send 调用
 */
export declare const send: import("convex/server").RegisteredAction<"internal", {
    code: string;
    phone: string;
}, Promise<{
    success: boolean;
    reason: string;
} | {
    success: boolean;
    reason?: undefined;
}>>;
