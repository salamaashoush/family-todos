import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useAppSession } from "~/utils/session";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    if (data.username === ADMIN_USERNAME && data.password === ADMIN_PASSWORD) {
      const session = await useAppSession();
      await session.update({
        username: data.username,
        isAuthenticated: true,
      });

      return { success: true };
    }

    throw new Error("Invalid credentials");
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  return { success: true };
});

export const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useAppSession();

  if (session.data.isAuthenticated && session.data.username) {
    return { authenticated: true, username: session.data.username };
  }

  return { authenticated: false };
});
