import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { MacroTarget, User } from "@prisma/client";
import { prisma, PrismaConfigurationError } from "@/lib/prisma";
import { getWhopClient, WhopConfigurationError } from "@/lib/whop";

type SessionUser = {
  id: string;
  displayName: string | null;
  email: string | null;
};

export type Session = {
  user: SessionUser;
  macroTarget: MacroTarget;
  experienceId: string | null;
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

type SessionOptions = {
  experienceId?: string | null;
};

export async function requireSession(options?: SessionOptions) {
  const headerList = await headers();
  return requireSessionFromHeaders(headerList, options);
}

export async function requireSessionFromRequest(
  request: NextRequest,
  options?: SessionOptions,
) {
  return requireSessionFromHeaders(request.headers, options);
}

type HeaderBag = Pick<Headers, "get">;

async function requireSessionFromHeaders(
  incomingHeaders: HeaderBag,
  options?: SessionOptions,
): Promise<Session> {
  const token =
    incomingHeaders.get("x-whop-user-token") ??
    incomingHeaders.get("X-Whop-User-Token");

  if (!token) {
    throw new UnauthorizedError("Missing Whop user token header.");
  }

  const client = getWhopClient();
  let validation: Awaited<
    ReturnType<typeof client.verifyUserToken>
  > | null = null;

  try {
    validation = await client.verifyUserToken(token, {
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    });
  } catch (error) {
    console.warn("[session] Failed to verify Whop token", error);
    throw new UnauthorizedError("Invalid Whop user token.");
  }

  if (!validation?.userId) {
    throw new UnauthorizedError("Invalid Whop user token.");
  }

  const experienceId =
    incomingHeaders.get("x-whop-experience-id") ??
    incomingHeaders.get("X-Whop-Experience-Id") ??
    options?.experienceId ??
    null;

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
      experienceId,
    };
  }

  return {
    user: toSessionUser(user),
    macroTarget: user.macroTarget,
    experienceId,
  };
}

export async function getOptionalSession(options?: SessionOptions) {
  try {
    return await requireSession(options);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    if (error instanceof WhopConfigurationError) {
      console.warn(
        "[session] Whop configuration is missing; treating request as guest.",
      );
      return null;
    }
    if (error instanceof PrismaConfigurationError) {
      console.warn(
        "[session] Database configuration is missing; treating request as guest.",
      );
      return null;
    }
    throw error;
  }
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

  try {
    return await prisma.user.create({
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
  } catch (error) {
    console.error("[session] Failed to create user record", error);
    throw new UnauthorizedError("Unable to provision user session.");
  }
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
