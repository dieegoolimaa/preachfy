import { expo } from '@better-auth/expo';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { deleteSubscriber } from '../billing/entitlements';
import { deleteCommunityData } from '../community/community.service';
import { db, mongo } from '../database';
import { deleteLiveData } from '../live/live.service';

export const allowedOrigins = (): string[] =>
  // DEV_ORIGINS is set by `npm run dev`, so phones on the same network can connect.
  [process.env.ALLOWED_ORIGINS, process.env.DEV_ORIGINS]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

function socialProviders() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, APPLE_BUNDLE_ID } = process.env;
  return {
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(APPLE_CLIENT_ID && APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: APPLE_CLIENT_ID,
            clientSecret: APPLE_CLIENT_SECRET,
            appBundleIdentifier: APPLE_BUNDLE_ID,
          },
        }
      : {}),
  };
}

function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: mongodbAdapter(db(), { client: mongo() }),
    // Expo Go identifies itself with exp://, which only exists in development.
    trustedOrigins: ['preachfy://', ...(process.env.NODE_ENV === 'production' ? [] : ['exp://']), ...allowedOrigins()],
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: socialProviders(),
    plugins: [expo()],
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await db().collection('syncItems').deleteMany({ userId: user.id });
          await db().collection('entitlements').deleteOne({ userId: user.id });
          await deleteCommunityData(user.id);
          await deleteLiveData(user.id);
        },
        afterDelete: async (user) => {
          await deleteSubscriber(user.id).catch(() => undefined);
        },
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}
