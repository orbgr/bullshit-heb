import { describe, it, expect } from "vitest";
import { generatePin } from "@/lib/pin";
import { PIN_LENGTH, PIN_CHARS } from "@/lib/constants";

describe("generatePin", () => {
  it("generates a pin of the correct length", () => {
    const pin = generatePin();
    expect(pin).toHaveLength(PIN_LENGTH);
  });

  it("only uses allowed characters", () => {
    for (let i = 0; i < 100; i++) {
      const pin = generatePin();
      for (const char of pin) {
        expect(PIN_CHARS).toContain(char);
      }
    }
  });

  it("does not contain I or O", () => {
    for (let i = 0; i < 200; i++) {
      const pin = generatePin();
      expect(pin).not.toContain("I");
      expect(pin).not.toContain("O");
    }
  });

  it("generates different pins (not always the same)", () => {
    const pins = new Set<string>();
    for (let i = 0; i < 50; i++) {
      pins.add(generatePin());
    }
    expect(pins.size).toBeGreaterThan(1);
  });
});
