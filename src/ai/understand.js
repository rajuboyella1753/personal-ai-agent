import { commands } from "../data/registry.js";

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "qwen2.5:3b";

export async function understandCommand(userInput) {
  const availableCommands = Object.keys(commands);

  const prompt = `
You are Ruth, a Windows personal AI assistant.

Understand the user's request.

The user may speak:
- English
- Telugu
- Telugu written in English letters

Choose exactly ONE command from this allowed list:

${availableCommands.join("\n")}

Rules:
- Return only the exact command name from the list.
- Never invent a command.
- Never return explanations.
- Never return quotes.
- Never return markdown.
- If nothing matches, return NONE.

Examples:

User: notepad open cheyyi
Answer: open notepad

User: calculator open chey
Answer: open calculator

User: naa project folder open cheyyi
Answer: open project folder

User: vscode lo project open cheyyi
Answer: open vscode

User: whatsapp open cheyyi
Answer: open whatsapp

User: ${userInput}
Answer:
`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "Return only one exact command from the allowed list, or NONE.",
          },

          {
            role: "user",
            content: prompt,
          },
        ],

        stream: false,

        options: {
          temperature: 0,
        },
      }),

      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(
        `Ollama HTTP error: ${response.status}`
      );

      return null;
    }

    const data = await response.json();

    const result =
      data.message?.content
        ?.trim()
        .toLowerCase()
        .replace(/^["'`]+|["'`]+$/g, "");

    if (
      result &&
      availableCommands.includes(result)
    ) {
      return result;
    }

    console.log(
      "AI could not match that request to an allowed command."
    );

    return null;

  } catch (error) {

    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError"
    ) {

      console.error(
        "Local AI took too long to respond."
      );

    } else {

      console.error(
        "Cannot connect to Ollama. Check whether Ollama is running.",
        error.message
      );
    }

    return null;
  }
}