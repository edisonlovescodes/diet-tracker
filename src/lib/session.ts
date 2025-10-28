import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { MacroTarget, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWhopClient } from "@/lib/whop";

type SessionUser = {
  id: string;
  displayName: string | null;
  email: string | null;
};

export type Session = {
  user: SessionUser;
  macroTarget: MacroTarget;
};

const DEFAULT_MACROS = {
  calories: 2300,
  protein: 185,
  carbs: 210,
  fats: 55,
};

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireSession() {
  const headerList = await headers();
  return requireSessionFromHeaders(headerList);
}

export async function requireSessionFromRequest(request: NextRequest) {
  return requireSessionFromHeaders(request.headers);
}

type HeaderBag = Pick<Headers, "get">;

async function requireSessionFromHeaders(
  incomingHeaders: HeaderBag,
): Promise<Session> {
  const token =
    incomingHeaders.get("x-whop-user-token") ??
    incomingHeaders.get("X-Whop-User-Token");

  if (!token) {
    throw new UnauthorizedError("Missing Whop user token header.");
  }

  const client = getWhopClient();
  const validation = await client.verifyUserToken(token, {
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  });

  if (!validation?.userId) {
    throw new UnauthorizedError("Invalid Whop user token.");
  }

  const user = await ensureUser(validation.userId);

  if (!user.macroTarget) {
    const macroTarget = await prisma.macroTarget.create({
      data: {
        userId: user.id,
        calories: DEFAULT_MACROS.calories,
        protein: DEFAULT_MACROS.protein,
        carbs: DEFAULT_MACROS.carbs,
        fats: DEFAULT_MACROS.fats,
      },
    });

    return {
      user: toSessionUser(user),
      macroTarget,
    };
  }

  return {
    user: toSessionUser(user),
    macroTarget: user.macroTarget,
  };
}

async function ensureUser(id: string) {
  const existing = await prisma.user.findUnique({
    where: { id },
    include: { macroTarget: true },
  });

  if (existing) {
    return existing;
  }

  const profile = await fetchWhopProfile(id);
  const profileEmail =
    profile && typeof profile === "object" && "email" in profile
      ? (profile.email as string | null | undefined)
      : null;
  const profileDisplayName =
    profile && typeof profile === "object" && "display_name" in profile
      ? (profile.display_name as string | null | undefined)
      : profile && typeof profile === "object" && "username" in profile
        ? (profile.username as string | null | undefined)
        : null;

  return prisma.user.create({
    data: {
      id,
      email: profileEmail ?? null,
      displayName: profileDisplayName ?? null,
      macroTarget: {
        create: {
          calories: DEFAULT_MACROS.calories,
          protein: DEFAULT_MACROS.protein,
          carbs: DEFAULT_MACROS.carbs,
          fats: DEFAULT_MACROS.fats,
        },
      },
    },
    include: { macroTarget: true },
  });
}

async function fetchWhopProfile(userId: string) {
  const client = getWhopClient();

  try {
    return await client.users.retrieve(userId);
  } catch (error) {
    console.warn("[whop] Failed to retrieve user profile", error);
    return null;
  }
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
  };
}
