// A short-lived, httpOnly marker that this browser just came through a password-reset link. The reset page
// and action require it, so an ordinary signed-in session (e.g. a shared computer) can't change the password.
export const RESET_COOKIE = "wn_pw_reset";
export const RESET_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 };
