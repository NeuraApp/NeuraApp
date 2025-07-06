export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
      await delay(backoffDelay);
      
      console.log(`Retry attempt ${attempt} after ${backoffDelay}ms`);
    }
  }
  throw new Error('Retry failed after maximum attempts');
}