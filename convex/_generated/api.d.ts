/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as challenges from "../challenges.js";
import type * as deletedUsers from "../deletedUsers.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as rateLimit from "../rateLimit.js";
import type * as settings from "../settings.js";
import type * as social from "../social.js";
import type * as socialNotifications from "../socialNotifications.js";
import type * as telemetry from "../telemetry.js";
import type * as users from "../users.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  challenges: typeof challenges;
  deletedUsers: typeof deletedUsers;
  feedback: typeof feedback;
  http: typeof http;
  leaderboard: typeof leaderboard;
  rateLimit: typeof rateLimit;
  settings: typeof settings;
  social: typeof social;
  socialNotifications: typeof socialNotifications;
  telemetry: typeof telemetry;
  users: typeof users;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
