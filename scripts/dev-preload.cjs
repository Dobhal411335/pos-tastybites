/**
 * Preload for `npm run dev` with the custom server.
 * Next 16 route modules use process.env.__NEXT_DEV_SERVER (same as `next dev`).
 * Must be set before `next` is imported — ESM static imports hoist above other code.
 */
process.env.NODE_ENV ||= 'development';
process.env.__NEXT_DEV_SERVER = '1';
