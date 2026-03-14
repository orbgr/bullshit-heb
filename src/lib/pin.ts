import { PIN_LENGTH, PIN_CHARS } from "./constants";

export function generatePin(): string {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) {
    pin += PIN_CHARS[Math.floor(Math.random() * PIN_CHARS.length)];
  }
  return pin;
}
