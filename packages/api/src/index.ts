/**
 * @pathfinding/api — package entry point.
 *
 * Exports the Hono app factory, types, and utilities.
 */
export { type AppType, createApp } from './app.js';
export {
  convertKeysToSnakeCase,
  toSnakeCase,
} from './lib/case-converter.js';
export { authOptional, authRequired, type AuthVariables } from './middleware/auth.js';
export { ApiError, errorHandler } from './middleware/error-handler.js';
