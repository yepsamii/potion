/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as files from "../files.js";
import type * as folders from "../folders.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as migrations from "../migrations.js";
import type * as repositoryApproval from "../repositoryApproval.js";
import type * as testEmail from "../testEmail.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  documents: typeof documents;
  files: typeof files;
  folders: typeof folders;
  github: typeof github;
  http: typeof http;
  "lib/email": typeof lib_email;
  "lib/encryption": typeof lib_encryption;
  migrations: typeof migrations;
  repositoryApproval: typeof repositoryApproval;
  testEmail: typeof testEmail;
  users: typeof users;
  workspaces: typeof workspaces;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
