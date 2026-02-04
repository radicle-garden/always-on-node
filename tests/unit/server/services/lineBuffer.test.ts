import { createLineBuffer } from "$lib/server/services/lineBuffer";

import { describe, expect, it } from "vitest";

describe("lineBuffer", () => {
  it("delivers complete lines", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer(line => lines.push(line));

    buffer.push(Buffer.from("line1\nline2\n"));
    expect(lines).toEqual(["line1", "line2"]);
  });

  it("buffers incomplete lines", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer(line => lines.push(line));

    buffer.push(Buffer.from("partial"));
    expect(lines).toEqual([]);

    buffer.push(Buffer.from(" line\n"));
    expect(lines).toEqual(["partial line"]);
  });

  it("handles UTF-8 multi-byte boundaries", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer(line => lines.push(line));

    const emoji = "😀";
    const jsonWithEmoji = `{"msg":"${emoji}"}\n`;
    const fullBuffer = Buffer.from(jsonWithEmoji);

    // Split in middle of 4-byte emoji
    const firstPart = fullBuffer.subarray(0, 10);
    const secondPart = fullBuffer.subarray(10);

    buffer.push(firstPart);
    buffer.push(secondPart);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(emoji);
  });

  it("flushes remaining data", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer(line => lines.push(line));

    buffer.push(Buffer.from("no newline"));
    expect(lines).toEqual([]);

    buffer.flush();
    expect(lines).toEqual(["no newline"]);
  });

  it("handles empty lines gracefully", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer(line => lines.push(line));

    buffer.push(Buffer.from("\n\n\n"));
    expect(lines).toEqual([]);
  });
});
