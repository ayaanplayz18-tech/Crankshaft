import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "crankshaft_super_secret_jwt_key_2026";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "user" | "admin" | "ghost";
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function hasAdminAccess(
  session: SessionPayload | null | undefined,
): boolean {
  return (
    session?.role === "admin" ||
    session?.role === "ghost" ||
    session?.username === "admin" ||
    session?.username === "ayaan_admin"
  );
}

export async function checkAdminAccess(
  session: SessionPayload | null | undefined,
): Promise<boolean> {
  if (!session) return false;
  if (hasAdminAccess(session)) return true;

  try {
    const { default: User } = await import("@/lib/models/User");
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();
    const user = await User.findOne({
      $or: [{ _id: session.userId }, { username: session.username }],
    })
      .select("role username")
      .lean();
    return (
      user?.role === "admin" ||
      user?.role === "ghost" ||
      user?.username === "admin" ||
      user?.username === "ayaan_admin"
    );
  } catch {
    return false;
  }
}

export function isGhost(session: SessionPayload | null | undefined): boolean {
  if (!session) return false;
  return session.role === "ghost";
}

export async function isGhostSession(
  session: SessionPayload | null | undefined,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "ghost") return true;
  try {
    const { default: User } = await import("@/lib/models/User");
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();
    const user = await User.findOne({
      $or: [{ _id: session.userId }, { username: session.username }],
    })
      .select("role")
      .lean();
    return user?.role === "ghost";
  } catch {
    return (session.role as string) === "ghost";
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("crankshaft_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get("crankshaft_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
