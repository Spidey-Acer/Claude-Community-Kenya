import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

const VISITOR_COOKIE = "cck-visitor";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Sets the cck-visitor UUID cookie on first request if missing.
 * The cookie is the anonymous identity used by the Karibu onboarding
 * flow to link sessions across visits before signup.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, randomUUID(), {
      maxAge: ONE_YEAR_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)",
  ],
};
