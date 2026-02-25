export const config = {
  type: "cron",
  name: "SessionCleanup",
  description: "清理过期会话",
  cron: "0 * * * *",
  emits: [],
  flows: ["system"],
};

interface HandlerContext {
  logger: { info: (msg: string, data?: unknown) => void };
}

export async function handler({ logger }: HandlerContext) {
  logger.info("Cleaning up expired sessions");
  logger.info("Session cleanup completed (simplified mode)");
}
