import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { compareSync } from "bcryptjs";

function getSecret(): Uint8Array | null {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export async function POST(request: NextRequest) {
  try {
    const secret = getSecret();
    if (!secret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = await request.json();
    const telegramId = String(body?.telegramId ?? "").trim();
    const password = String(body?.password ?? "");

    if (!/^\d+$/.test(telegramId) || !password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, telegram_id, alphanumeric_id, role")
      .eq("telegram_id", Number(telegramId))
      .eq("role", "admin")
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash || !compareSync(password, adminPasswordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({
      telegram_id: user.telegram_id,
      role: "admin",
      alphanumeric_id: user.alphanumeric_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
