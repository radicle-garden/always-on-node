import bs58 from "bs58";
import { type ClassValue, clsx } from "clsx";
import md5 from "md5";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

export function unreachable(value: never): never {
  throw new Error(`Unreachable code: ${value}`);
}

export function truncateText(text: string, remaining?: number): string {
  remaining = remaining ?? 6;
  return `${text.substring(0, remaining)}…${text.slice(-remaining)}`;
}

export function parseRepositoryId(
  rid: string,
): { prefix: string; pubkey: string } | undefined {
  const match = /^(rad:)?(z[a-zA-Z0-9]+)$/.exec(rid);
  if (match) {
    const hex = bs58.decode(match[2].substring(1));
    if (hex.byteLength !== 20) {
      return undefined;
    }

    return { prefix: match[1] || "rad:", pubkey: match[2] };
  }

  return undefined;
}

export function getDaysPassed(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function timeAgo(date: Date, short = false) {
  const now = new Date();
  const then = date;
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds}${short ? "s" : " second"}${short || seconds === 1 ? "" : "s"}`;
  }

  if (minutes < 60) {
    return `${minutes}${short ? "m" : " minute"}${short || minutes === 1 ? "" : "s"}`;
  }

  if (hours < 24) {
    return `${hours}${short ? "h" : " hour"}${short || hours === 1 ? "" : "s"}`;
  }

  if (days < 30) {
    return `${days}${short ? "d" : " day"}${short || days === 1 ? "" : "s"}`;
  }

  // Months
  if (days < 365) {
    return `${Math.floor(days / 30)}${short ? "mo" : " month"}${short || Math.floor(days / 30) === 1 ? "" : "s"}`;
  }

  // Years
  return `${Math.floor(days / 365)}${short ? "y" : " year"}${short || Math.floor(days / 365) === 1 ? "" : "s"}`;
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

// Get the gravatar URL of an email.
export function gravatarURL(email: string, size?: number): string {
  const address = email.trim().toLowerCase();
  const hash = md5(address);

  return `https://www.gravatar.com/avatar/${hash}?d=404${size ? `&s=${size}px` : ""}`;
}
