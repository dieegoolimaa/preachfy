import { BOOKS, searchBook, type SearchHit } from '@preachfy/core';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { bibleAssets } from './bibleAssets';

const cache = new Map<string, Promise<string[][]>>();

async function read(translation: string, book: string): Promise<string[][]> {
  const module = bibleAssets[translation]?.[book];
  if (module === undefined) throw new Error(`Missing ${translation}/${book}`);
  const asset = await Asset.fromModule(module).downloadAsync();
  if (Platform.OS === 'web') return (await fetch(asset.uri)).json();
  return JSON.parse(await new File(asset.localUri!).text());
}

export function loadBook(translation: string, book: string): Promise<string[][]> {
  const key = `${translation}/${book}`;
  let found = cache.get(key);
  if (!found) {
    found = read(translation, book);
    found.catch(() => cache.delete(key));
    cache.set(key, found);
  }
  return found;
}

export async function searchBible(translation: string, query: string, limit = 100): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];
  for (const book of BOOKS) {
    if (hits.length >= limit) break;
    hits.push(...searchBook(book.id, await loadBook(translation, book.id), query, limit - hits.length));
  }
  return hits;
}
