'use node';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
/**
 * 发送短信验证码 (使用腾讯云短信服务)
 * 这是一个内部 action，只能通过 internal.sms.send 调用
 */
export const send = internalAction({
    args: {
        phone: v.string(),
        code: v.string(),
    },
    handler: async (ctx, { phone, code }) => {
        const secretId = process.env.TENCENT_SECRET_ID;
        const secretKey = process.env.TENCENT_SECRET_KEY;
        const region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou';
        const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
        const signName = process.env.TENCENT_SMS_SIGN_NAME;
        const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;
        // 检查配置
        if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
            console.warn('SMS service not configured, skipping send');
            console.error(`[DEV] Would send SMS to ${phone} with code: ${code}`);
            return { success: false, reason: 'SMS service not configured' };
        }
        try {
            // 动态导入腾讯云 SDK
            const tencentcloud = await import('tencentcloud-sdk-nodejs');
            const SmsClient = tencentcloud.sms.v20210111.Client;
            const client = new SmsClient({
                credential: {
                    secretId,
                    secretKey,
                },
                region,
                profile: {
                    httpProfile: {
                        endpoint: 'sms.tencentcloudapi.com',
                    },
                },
            });
            const params = {
                PhoneNumberSet: [phone],
                SmsSdkAppId: sdkAppId,
                SignName: signName,
                TemplateId: templateId,
                TemplateParamSet: [code, '5'], // 验证码和有效分钟数
            };
            const response = await client.SendSms(params);
            // 检查发送结果
            const sendStatus = response.SendStatusSet?.[0];
            if (sendStatus?.Code !== 'Ok') {
                console.error('SMS send failed:', sendStatus);
                return {
                    success: false,
                    reason: sendStatus?.Message || 'SMS send failed',
                };
            }
            return { success: true };
        }
        catch (error) {
            console.error('SMS send error:', error);
            return {
                success: false,
                reason: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});
