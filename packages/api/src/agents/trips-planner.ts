import type { AgentRouteHandler } from '@flue/runtime';
import { defineAgent } from '@flue/runtime';
import { getDeepSeekModelSpecifier } from '../lib/deepseek.js';

export const description = 'Sunpebble Trips planning assistant';

export const route: AgentRouteHandler = async (_c, next) => {
  await next();
};

export default defineAgent(() => ({
  model: getDeepSeekModelSpecifier(),
  thinkingLevel: 'off',
  instructions:
    '你是 Sunpebble Trips 的旅行规划助手。回答要简洁、实用，优先帮助用户做可执行的行程决策；如果用户要求行程方案，输出结构清晰、可落地的建议。',
}));
