// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Função cn: combina clsx + tailwind-merge
export function cn(...inputs: any[]) {
  return twMerge(clsx(...inputs));
}
