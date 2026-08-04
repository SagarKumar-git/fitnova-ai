export class CacheService {
  private cache = new Map<string, { data: any, expiresAt: number }>();
  
  set(key: string, data: any, ttlMs: number) {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
}
