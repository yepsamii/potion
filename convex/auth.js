import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { GitHub } from "@convex-dev/auth/providers/GitHub";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password,
    GitHub,
  ],
});