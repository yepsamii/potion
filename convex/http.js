import { httpRouter } from "convex/server";
import { auth } from "./auth.js";
import { httpAction } from "./_generated/server.js";
import { api } from "./_generated/api.js";

const http = httpRouter();

auth.addHttpRoutes(http);

// File upload endpoint
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Generate upload URL for Convex storage
    return await ctx.storage.generateUploadUrl();
  }),
});

// File serving endpoint  
http.route({
  path: "/files/:storageId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { storageId } = request.params;
    const url = await ctx.storage.getUrl(storageId);
    
    if (!url) {
      return new Response("File not found", { status: 404 });
    }
    
    // Redirect to the storage URL
    return Response.redirect(url, 302);
  }),
});

export default http;