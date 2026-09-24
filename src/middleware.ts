import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret(): Uint8Array | null {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = getSecret();

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!secret) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      return NextResponse.redirect(new URL("/login?error=config", request.url));
    }

    const token = request.cookies.get("admin_session")?.value;
    if (!token) {
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
      if (payload.role !== "admin" || typeof payload.sub !== "string") {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
          : NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-id", payload.sub);
      requestHeaders.set("x-admin-role", "admin");

      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
        : NextResponse.redirect(new URL("/login?error=expired", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
