export function formatQuestion(text: string): string {
  return text.replace(/\$\s?blank\s?\$/gi, "________");
}
