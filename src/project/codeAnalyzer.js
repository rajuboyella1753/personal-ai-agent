
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "qwen2.5:3b";

export async function analyzeCode(file) {
  const source = file.content;

  const prompt = `
Analyze this source code and return a clean report in simple Telugu-English.

File: ${file.path}

Use these headings:
1. FILE PURPOSE
2. IMPORTS AND DEPENDENCIES
3. COMPONENTS AND FUNCTIONS
4. LOGIC FLOW STEP BY STEP
5. API CALLS AND DATA FLOW
6. CONFIRMED ERRORS
7. POTENTIAL BUGS
8. SECURITY CONCERNS
9. RECOMMENDED FIXES

Rules:
- Explain what the actual code does.
- Do not invent functions, line numbers, errors, or dependencies.
- Clearly separate confirmed errors from possible bugs.
- If an issue cannot be verified from this file alone, say so.
- Do not modify the file.
- Use concise headings and numbered points.
- If a section has no identifiable issue, say "No issue identified from this file alone."

SOURCE CODE:
\`\`\`
${source.slice(0, 10000)}
\`\`\`
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are Ruth, a careful code reviewer. Analyze code accurately and explain in simple Telugu-English.",
        },
        { role: "user", content: prompt },
      ],
      options: {
        temperature: 0,
        num_ctx: 4096,
        num_predict: 700,
      },
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP error: ${response.status}`);
  }

  const data = await response.json();
  const explanation = data.message?.content?.trim();

  if (!explanation) {
    throw new Error("AI returned an empty explanation.");
  }

  return {
    file: file.path,
    explanation,
    truncated: source.length > 10000,
  };
}