import { StringDecoder } from "string_decoder";

export interface LineBuffer {
  push(chunk: Buffer): void;
  flush(): void;
}

export function createLineBuffer(onLine: (line: string) => void): LineBuffer {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  return {
    push(chunk: Buffer) {
      // StringDecoder handles UTF-8 multi-byte boundaries correctly
      buffer += decoder.write(chunk);
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          onLine(line);
        }
      }
    },

    flush() {
      // Flush any remaining bytes from decoder
      buffer += decoder.end();

      if (buffer.trim()) {
        onLine(buffer);
      }
      buffer = "";
    },
  };
}
