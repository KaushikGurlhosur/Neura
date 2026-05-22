import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

export async function proxy(request) {
  const token = request.cookies.get("token")?.value; // Get token from cookies
  const { pathname } = request.nextUrl;

  const authRoutes = ["/login", "/register"];

  const isAuthRoute = authRoutes.includes(pathname);

  // Paths that don't need a login
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/";

  // ─── No token + protected route ─────────────────────
  if (!isPublicRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret); // Verify token validity and expiration

      // already logged in → prevent access to login/register
      if (isAuthRoute) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
