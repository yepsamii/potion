import { mutation } from "./_generated/server";

export const clearOldGitHubData = mutation({
  handler: async (ctx) => {
    // Delete all old githubRepositories documents
    const oldRepos = await ctx.db.query("githubRepositories").collect();
    for (const repo of oldRepos) {
      await ctx.db.delete(repo._id);
    }

    // Delete all old githubRepoConnections documents if they exist
    try {
      const oldConnections = await ctx.db.query("githubRepoConnections").collect();
      for (const conn of oldConnections) {
        await ctx.db.delete(conn._id);
      }
    } catch (e) {
      // Table might not exist
    }

    return {
      success: true,
      deletedRepos: oldRepos.length,
    };
  },
});