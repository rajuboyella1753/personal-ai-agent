import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";


export async function confirmAction(description, rl) {
  const answer = await rl.question(
    `\nPermission required: ${description}\nProceed? (yes/no): `
  );

  return ["yes", "y"].includes(answer.trim().toLowerCase());
}