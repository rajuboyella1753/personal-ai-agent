import { readSudaraProject } from "./projectReader.js";

try {
  console.log("SuSi: Sudara project scan chesthunna...");

  const files = await readSudaraProject();

  console.log(`\nTotal files found: ${files.length}`);

  for (const file of files) {
    console.log(`- ${file.path}`);
  }
} catch (error) {
  console.error("Project scan failed:", error.message);
}