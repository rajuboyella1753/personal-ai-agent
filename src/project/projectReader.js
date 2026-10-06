
import fs from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".firebase",
  "OllamaModels",
]);

const IGNORED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "credentials.json",
  "secrets.json",
  "serviceaccountkey.json",
  "package-lock.json",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".md",
]);

const MAX_FILE_SIZE = 200_000;
const MAX_FILES = 500;

export async function readProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const files = [];

  const rootStat = await fs.stat(root);

  if (!rootStat.isDirectory()) {
    throw new Error("Project path is not a directory.");
  }

  async function scanDirectory(directory) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (files.length >= MAX_FILES) return;

      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name.startsWith(".") ||
          IGNORED_DIRECTORIES.has(entry.name)
        ) {
          continue;
        }

        await scanDirectory(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const filename = entry.name.toLowerCase();

      if (
        IGNORED_FILES.has(filename) ||
        filename.startsWith(".env")
      ) {
        continue;
      }

      if (!ALLOWED_EXTENSIONS.has(path.extname(filename))) {
        continue;
      }

      const stat = await fs.stat(fullPath);

      if (stat.size > MAX_FILE_SIZE) continue;

      const content = await fs.readFile(fullPath, "utf8");

      files.push({
        path: path.relative(root, fullPath),
        content,
      });
    }
  }

  await scanDirectory(root);

  return files;
}

// Keep older helper scripts working against Ruth's current directory.
export async function readSudaraProject() {
  return readProject(process.cwd());
}