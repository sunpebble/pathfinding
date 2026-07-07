import { defineConfig } from 'drizzle-kit';

// generate 仅需 dialect + schema + out；远程执行走 wrangler d1 migrations apply（见 deploy 工作流）
export default defineConfig({
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
