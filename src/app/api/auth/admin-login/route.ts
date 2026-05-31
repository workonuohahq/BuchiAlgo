// ============================================================
// ADMIN AUTHENTICATION API
// Verifies Telegram ID + password against database
// Issues JWT token for session management
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { compareSync } from "bcryptjs";

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "buchialgo-default-secret-change-me"
);

export async function POST(request: NextRequest) {
  try {
    const { telegramId, password } = await request.json();

    if (!telegramId || !password) {
      return NextResponse.json(
        { error: "Telegram ID and password are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Find admin user by telegram_id
    const { data: user, error } = await supabase
      .from("users")
      .select("id, telegram_id, alphanumeric_id, role, join_verified")
      .eq("telegram_id", parseInt(telegramId))
      .eq("role", "admin")
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password against hash in system_config or env
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const isValid = compareSync(password, adminPasswordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await new SignJWT({
      sub: user.id,
      telegram_id: user.telegram_id,
      role: "admin",
      alphanumeric_id: user.alphanumeric_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET_KEY);

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true, token });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
