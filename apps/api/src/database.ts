import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | undefined;

export function mongo(): MongoClient {
  client ??= new MongoClient(process.env.DATABASE_URL ?? '');
  return client;
}

export const db = (): Db => mongo().db();
