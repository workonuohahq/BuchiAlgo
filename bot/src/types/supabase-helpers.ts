// Type helpers for Supabase queries
// Used to work around strict TypeScript inference issues

export function asDbRow<T>(obj: Record<string, any>): T {
  return obj as unknown as T;
}

export function asDbInsert<T>(obj: Record<string, any>): T {
  return obj as unknown as T;
}

export function asDbUpdate<T>(obj: Partial<T>): any {
  return obj as any;
}
