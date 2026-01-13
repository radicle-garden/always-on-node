import bs58 from "bs58";
import { type ClassValue, clsx } from "clsx";
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

export function debounce(callback: (...args: any[]) => void, wait: number) {
  let timeoutId: number | undefined = undefined;
  return (...args: any[]) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

export function truncateText(text: string, remaining?: number): string {
  remaining = remaining ?? 6;
  return `${text.substring(0, remaining)}…${text.slice(-remaining)}`;
}

export function truncateDid(did: string): string {
  return `did:key:${truncateText(publicKeyFromDid(did))}`;
}

export function didFromPublicKey(publicKey: string) {
  return `did:key:${publicKey}`;
}

export function publicKeyFromDid(did: string) {
  return did.replace("did:key:", "");
}

export function parseNodeId(
  nid: string,
): { prefix: string; pubkey: string } | undefined {
  const match = /^(did:key:)?(z[a-zA-Z0-9]+)$/.exec(nid);
  if (match) {
    let hex: Uint8Array | undefined = undefined;
    try {
      hex = bs58.decode(match[2].substring(1));
    } catch (error) {
      console.error("utils.parseNodId: Not able to decode received NID", error);
      return undefined;
    }
    // This checks also that the first 2 bytes are equal
    // to the ed25519 public key type used.
    if (hex && !(hex.byteLength === 34 && hex[0] === 0xed && hex[1] === 1)) {
      return undefined;
    }

    return { prefix: match[1] || "did:key:", pubkey: match[2] };
  }

  return undefined;
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

export function validateEmail(email: string) {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  );
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

export function unescapeHtml(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#32;": " ",
  };
  return text.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
}

export function parseNodeStatus(status: string) {
  /**
	 * Example Node status output:
	 *
		✓ Node is running and listening on 0.0.0.0:8776.

		╭────────────────────────────────────────────────────────────────────────────╮
		│ Node ID           Address                           ?   ⤭   Since          │
		├────────────────────────────────────────────────────────────────────────────┤
		│ z6Mkppz…4NbLwRh   seed.ivy.lat:8776                 ✓   🡥   1.62 minute(s) │
		│ z6Mkmqo…4ebScxo   ash.radicle.garden:8776           !   🡥                  │
		│ z6MkeUf…EBXQeDZ   postweb.nexus:8776                !   🡥                  │
		│ z6MkrLM…ocNYPm7   seed.radicle.garden:8776          !   🡥                  │
		│ z6Mkf3h…53bJAqe   radicle.git.gg:8776               ✓   🡥   1.63 minute(s) │
		│ z6MkeTU…E2tKM4g   ssh.let.software:8776             ✓   🡥   1.65 minute(s) │
		│ z6Mksqu…7327TEt   radicle.linuxw.info:8776          ✓   🡥   1.62 minute(s) │
		│ z6MkqoF…MtnyJAm   seed.rapidexpedition.org:8776     !   🡥                  │
		│ z6MkmkW…tkjEUty   seed.radicle.cylinder.tube:8776   !   🡥                  │
		╰────────────────────────────────────────────────────────────────────────────╯
		✗ Hint:
			? … Status:
					✓ … connected    ✗ … disconnected
					! … attempted    • … initial
			⤭ … Link Direction:
					🡦 … inbound      🡥 … outbound
   *
	 */

  // We want to know:
  // - Is the node running? (3 or more lines containing ✓)
  // - How many peers is the node connected to? (Lines that contain ✓ minus 2)
  // - How long has the node been running? (Let's take the longest since time)
  // Things we must consider:
  //  - Might have no output
  //  - Might have no peers
  //  - Might have no since time

  if (!status) {
    return {
      isRunning: false,
      peers: 0,
      since: 0,
    };
  }

  try {
    const lines = status.split("\n");
    const isRunning = lines.filter(line => line.includes("✓")).length >= 3;
    const peers = lines.filter(line => line.includes("✓")).length - 2;

    // Parse time values from lines containing time units
    const timeUnits = ["second", "minute", "hour", "day", "month", "year"];
    const timeUnitValues = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
      month: 2592000,
      year: 31536000,
    };

    const timeLines = lines.filter(line =>
      timeUnits.some(unit => line.includes(unit)),
    );

    // Extract and parse time values
    const timeValues = timeLines
      .map(line => {
        for (const unit of timeUnits) {
          const match = line.match(
            new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}s?`),
          );
          if (match) {
            const value = parseFloat(match[1]);
            return {
              value,
              unit,
              seconds:
                value * timeUnitValues[unit as keyof typeof timeUnitValues],
            };
          }
        }
        return null;
      })
      .filter(Boolean) as Array<{
      value: number;
      unit: string;
      seconds: number;
    }>;

    // Sort by seconds (longest first) and take the first one
    const longestTime = timeValues.sort((a, b) => b.seconds - a.seconds)[0];
    const sinceSeconds = longestTime ? longestTime.seconds : 0;

    return {
      isRunning,
      peers,
      sinceSeconds,
    };
  } catch (error) {
    return {
      isRunning: false,
      peers: 0,
      sinceSeconds: 0,
    };
  }
}

export function createFormValidator<T extends Record<string, any>>(
  validators: Record<keyof T, (value: any) => string | null>,
) {
  return function validate(data: T): Record<keyof T, string> {
    const errors: Record<keyof T, string> = {} as Record<keyof T, string>;

    for (const [field, validator] of Object.entries(validators)) {
      const error = validator(data[field as keyof T]);
      if (error) {
        errors[field as keyof T] = error;
      }
    }

    return errors;
  };
}

export function hasFormErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}
