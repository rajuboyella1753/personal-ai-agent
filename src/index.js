import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { executeCommand } from "./commands/execute.js";
import { printDueTasks } from "./tasks/taskManager.js";

async function main() {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  console.log("\n🧠 Ruth Personal AI Agent started Sir!");

  // ========================================================
  // SHOW TODAY / OVERDUE TASKS
  // ========================================================

  try {
    printDueTasks();
  } catch (error) {
    console.error(
      "Ruth: Tasks load cheyyalekapoyanu:",
      error.message
    );
  }

  console.log("\nYou can enter multiple commands.");
  console.log("Type 'exit' to stop the AI.\n");

  try {
    while (true) {
      const input = await rl.question("You > ");

      const command = input.trim();

      if (
        command.toLowerCase() ===
        "exit"
      ) {
        console.log(
          "\n🧠 Ruth Personal AI Agent stopped. Thank you sir!"
        );

        break;
      }

      if (!command) {
        continue;
      }

      try {
        const result =
          await executeCommand(
            command,
            rl
          );

        if (result === "EXIT") {
          break;
        }
      } catch (error) {
        console.error(
          "Command failed:",
          error.message
        );
      }

      console.log("");
    }
  } catch (error) {
    if (
      error.code !==
      "ERR_USE_AFTER_CLOSE"
    ) {
      console.error(
        "AI Agent error:",
        error.message
      );
    }
  } finally {
    rl.close();
  }
}

main();