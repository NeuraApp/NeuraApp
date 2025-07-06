interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (userId: string) => string;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

export class RateLimitError extends Error {
  resetTime: Date;
  
  constructor(resetTime: Date) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

class RateLimiter {
  private config: RateLimitConfig;
  private storage: Map<string, { count: number; reset: number }> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.storage.entries()) {
        if (now > value.reset) {
          this.storage.delete(key);
        }
      }
    }, 60000);
  }

  async checkLimit(userId: string): Promise<RateLimitInfo> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(userId) : userId;
    const now = Date.now();
    
    let entry = this.storage.get(key);
    
    if (!entry || now > entry.reset) {
      entry = {
        count: 0,
        reset: now + this.config.windowMs
      };
    }
    
    if (entry.count >= this.config.maxRequests) {
      throw new RateLimitError(new Date(entry.reset));
    }
    
    entry.count++;
    this.storage.set(key, entry);
    
    return {
      remaining: this.config.maxRequests - entry.count,
      reset: entry.reset,
      total: this.config.maxRequests
    };
  }
}

// Rate limiters for different operations
export const ideaGenerationLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 ideas per hour
  keyGenerator: (userId) => `idea_generation:${userId}`
});

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (userId) => `auth:${userId}`
});

export const generalLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyGenerator: (userId) => `general:${userId}`
});

// Helper function to handle rate limit errors
export function handleRateLimitError(error: RateLimitError): string {
  const resetTime = error.resetTime;
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Rate limit exceeded. Please try again.';
  }
  
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));
  
  if (diffMinutes < 60) {
    return `Rate limit exceeded. Try again in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}.`;
  }
  
  const diffHours = Math.ceil(diffMinutes / 60);
  return `Rate limit exceeded. Try again in ${diffHours} hour${diffHours > 1 ? 's' : ''}.`;
}