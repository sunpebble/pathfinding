/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { httpRouter } from 'convex/server';
import { auth } from './auth';

/**
 * Convex HTTP Router
 * Handles HTTP endpoints including auth routes
 */
const http = httpRouter();

// Add auth routes for sign in, sign out, etc.
auth.addHttpRoutes(http);

export default http;
