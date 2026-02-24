import { PrismaClient } from "@preachfy/database";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_NODE !== "production") globalForPrisma.prisma = prisma;
