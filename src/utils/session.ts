import { useSession } from "@tanstack/react-start/server";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "change-this-secret-to-at-least-32-characters-long";

type SessionData = {
  username?: string;
  adminUserId?: number;
  isAuthenticated?: boolean;
};

export function useAppSession() {
  return useSession<SessionData>({
    name: "admin-session",
    password: SESSION_SECRET,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });
}
