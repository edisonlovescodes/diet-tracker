import { PrismaClient } from "@prisma/client";

export class PrismaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrismaConfigurationError";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new PrismaConfigurationError(
      "Missing DATABASE_URL environment variable.",
    );
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

function getOrCreatePrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      const client = getOrCreatePrismaClient();
      const value = Reflect.get(
        client as unknown as Record<PropertyKey, unknown>,
        prop,
        receiver,
      );
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
    has(_target, prop) {
      const client = getOrCreatePrismaClient();
      return prop in client;
    },
    ownKeys() {
      const client = getOrCreatePrismaClient();
      return Reflect.ownKeys(client);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const client = getOrCreatePrismaClient();
      const descriptor = Object.getOwnPropertyDescriptor(client, prop);
      if (descriptor) {
        descriptor.configurable = true;
      }
      return descriptor;
    },
  },
) as PrismaClient;

export type { Prisma } from "@prisma/client";
