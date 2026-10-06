import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { commands } from "../data/registry.js";
import { confirmAction } from "../security/confirm.js";
import { understandCommand } from "../ai/understand.js";
import { readProject } from "../project/projectReader.js";
import {
  addTask,
  getPendingTasks,
  completeTask,
  deleteTask,
  editTask,
  moveTask,
  printTasks,
  printDueTasks,
  parseTaskDate,
} from "../tasks/taskManager.js";
import { analyzeCode } from "../project/codeAnalyzer.js";

// ==========================================================
// CURRENT WORKING DIRECTORY
// ==========================================================

function getWorkingDirectory() {
  return process.cwd();
}

function changeWorkingDirectory(requestedPath) {
  if (
    !requestedPath ||
    !requestedPath.trim()
  ) {
    console.log(
      `Ruth: Current folder: ${getWorkingDirectory()}`
    );

    return;
  }

  const raw = requestedPath
    .trim()
    .replace(/^["']|["']$/g, "");

  const target =
    raw.toLowerCase() === "home"
      ? os.homedir()
      : path.resolve(
          getWorkingDirectory(),
          raw
        );

  if (!directoryExists(target)) {
    console.log(
      `Ruth: Folder dorakaledu: ${target}`
    );

    return;
  }

  try {
    process.chdir(target);

    console.log(
      `Ruth: Current folder: ${getWorkingDirectory()}`
    );
  } catch (error) {
    console.error(
      "Ruth: Folder change cheyyalekapoyanu:",
      error.message
    );
  }
}

// ==========================================================
// GREETINGS
// ==========================================================

const greetings = new Set([
  "hi",
  "hello",
  "hey",
  "hi ruth",
  "hello ruth",
  "hey ruth",
  "good morning",
  "good afternoon",
  "good evening",
]);

// ==========================================================
// EXIT COMMANDS
// ==========================================================

const exitCommands = new Set([
  "exit",
  "bye",
  "goodbye",
  "close ruth",
  "stop ruth",
]);

// ==========================================================
// RUTH MANAGED SERVERS
// ==========================================================

const runningServers = {
  frontend: null,
  backend: null,
};

// ==========================================================
// PROJECT FILE DISPLAY
// ==========================================================

function printProjectFiles(files) {
  console.log(
    `\nRuth: ${files.length} readable files dorikayi.`
  );

  console.log(`Project: ${getWorkingDirectory()}\n`);

  for (const file of files) {
    console.log("- " + file.path);
  }
}

// ==========================================================
// DIRECTORY CHECK
// ==========================================================

function directoryExists(folderPath) {
  try {
    return fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

// ==========================================================
// FRONTEND FOLDER
// ==========================================================

function getFrontendFolder() {
  const folder = path.join(
    getWorkingDirectory(),
    "frontend"
  );

  return directoryExists(folder)
    ? folder
    : null;
}

// ==========================================================
// FRONTEND START COMMAND DETECTION
// ==========================================================

function getFrontendStartCommand(folder) {
  const packageJsonPath = path.join(
    folder,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(
        packageJsonPath,
        "utf8"
      )
    );

    const scripts =
      packageJson.scripts || {};

    if (
      typeof scripts.dev === "string" &&
      scripts.dev.trim()
    ) {
      return "npm run dev";
    }

    if (
      typeof scripts.start === "string" &&
      scripts.start.trim()
    ) {
      return "npm start";
    }

    return null;
  } catch (error) {
    console.error(
      "Ruth: frontend package.json read cheyyalekapoyanu:",
      error.message
    );

    return null;
  }
}

// ==========================================================
// BACKEND FOLDER
// ==========================================================

function getBackendFolder() {
  const folder = path.join(
    getWorkingDirectory(),
    "backend"
  );

  return directoryExists(folder)
    ? folder
    : null;
}

// ==========================================================
// POWERSHELL SINGLE QUOTE ESCAPE
// ==========================================================

function escapePowerShellString(value) {
  return String(value).replace(
    /'/g,
    "''"
  );
}

// ==========================================================
// GET PROCESS TREE
// ==========================================================

function getProcessTreePids(rootPid) {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'

$processes = Get-CimInstance Win32_Process |
    Select-Object ProcessId, ParentProcessId

$rootProcessId = ${Number(rootPid)}

$ids = New-Object System.Collections.Generic.HashSet[int]

[void]$ids.Add($rootProcessId)

$changed = $true

while ($changed) {

    $changed = $false

    foreach ($processInfo in $processes) {

        $currentProcessId = [int]$processInfo.ProcessId
        $parentProcessId = [int]$processInfo.ParentProcessId

        if (
            $ids.Contains($parentProcessId) -and
            -not $ids.Contains($currentProcessId)
        ) {
            [void]$ids.Add($currentProcessId)
            $changed = $true
        }
    }
}

$ids | Sort-Object
`;

  try {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (
      result.error ||
      result.status !== 0
    ) {
      return [Number(rootPid)];
    }

    const pids = result.stdout
      .split(/\r?\n/)
      .map((line) =>
        Number(line.trim())
      )
      .filter(
        (pid) =>
          Number.isInteger(pid) &&
          pid > 0
      );

    return pids.length > 0
      ? [...new Set(pids)]
      : [Number(rootPid)];
  } catch {
    return [Number(rootPid)];
  }
}

// ==========================================================
// GET LISTENING PORTS
// ==========================================================

function getListeningPorts() {
  try {
    const result = spawnSync(
      "netstat.exe",
      [
        "-ano",
        "-p",
        "TCP",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (
      result.error ||
      result.status !== 0
    ) {
      return [];
    }

    const ports = [];

    for (
      const line of result.stdout.split(/\r?\n/)
    ) {
      const match = line.match(
        /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i
      );

      if (!match) {
        continue;
      }

      const port = Number(match[1]);
      const pid = Number(match[2]);

      if (
        port > 0 &&
        pid > 0
      ) {
        ports.push({
          port,
          pid,
        });
      }
    }

    return ports;
  } catch {
    return [];
  }
}

// ==========================================================
// CHECK PROCESS ALIVE
// ==========================================================

function isProcessAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    const result = spawnSync(
      "tasklist.exe",
      [
        "/FI",
        `PID eq ${Number(pid)}`,
        "/NH",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (
      result.error ||
      result.status !== 0
    ) {
      return false;
    }

    return result.stdout.includes(
      String(pid)
    );
  } catch {
    return false;
  }
}

// ==========================================================
// DETECT SERVER PORT
// ==========================================================

async function detectServerPort(
  serverPid,
  folder,
  timeoutMs = 30000
) {
  const startTime = Date.now();

  while (
    Date.now() - startTime <
    timeoutMs
  ) {
    try {
      const result = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `
          Get-NetTCPConnection -State Listen |
          Select-Object LocalPort, OwningProcess |
          ConvertTo-Json -Compress
          `,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        }
      );

      if (
        result.status === 0 &&
        result.stdout.trim()
      ) {
        let connections =
          JSON.parse(
            result.stdout.trim()
          );

        if (
          !Array.isArray(
            connections
          )
        ) {
          connections = [
            connections,
          ];
        }

        const processTree =
          await getProcessTreePids(
            serverPid
          );

        for (
          const connection of connections
        ) {
          const port = Number(
            connection.LocalPort
          );

          const pid = Number(
            connection.OwningProcess
          );

          if (!port || !pid) {
            continue;
          }

          if (
            processTree.includes(pid)
          ) {
            return port;
          }
        }

        const commonPorts = [
          3000,
          3001,
          3002,
          4173,
          5000,
          5001,
          5173,
          8000,
          8001,
          8080,
          8081,
          10000,
        ];

        for (
          const connection of connections
        ) {
          const port = Number(
            connection.LocalPort
          );

          if (
            !commonPorts.includes(
              port
            )
          ) {
            continue;
          }

          try {
            const response =
              await fetch(
                `http://127.0.0.1:${port}`,
                {
                  method: "GET",
                  signal:
                    AbortSignal.timeout(
                      1000
                    ),
                }
              );

            if (
              response.status >= 100 &&
              response.status < 600
            ) {
              return port;
            }
          } catch {
            // Ignore.
          }
        }
      }
    } catch {
      // Server may still be starting.
    }

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 1000)
    );
  }

  return null;
}

// ==========================================================
// FIND VS CODE
// ==========================================================

function findVSCodeExecutable() {
  const homeFolder =
    os.homedir();

  const candidates = [
    path.join(
      homeFolder,
      "AppData",
      "Local",
      "Programs",
      "Microsoft VS Code",
      "Code.exe"
    ),

    path.join(
      process.env.ProgramFiles || "",
      "Microsoft VS Code",
      "Code.exe"
    ),

    path.join(
      process.env["ProgramFiles(x86)"] || "",
      "Microsoft VS Code",
      "Code.exe"
    ),
  ];

  for (
    const candidate of candidates
  ) {
    if (
      candidate &&
      fs.existsSync(candidate)
    ) {
      return candidate;
    }
  }

  try {
    const result = spawnSync(
      "where.exe",
      ["code"],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (
      !result.error &&
      result.status === 0
    ) {
      const codePath =
        result.stdout
          .split(/\r?\n/)
          .map((line) =>
            line.trim()
          )
          .find(Boolean);

      if (codePath) {
        return codePath;
      }
    }
  } catch {
    // Ignore.
  }

  return null;
}

// ==========================================================
// FIND CURSOR
// ==========================================================

function findExecutableOnPath(commandName) {
  try {
    const result = spawnSync(
      "where.exe",
      [commandName],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (
      !result.error &&
      result.status === 0
    ) {
      const foundPath =
        result.stdout
          .split(/\r?\n/)
          .map((line) =>
            line.trim()
          )
          .find(Boolean);

      if (foundPath) {
        return foundPath;
      }
    }
  } catch {
    // Ignore.
  }

  return null;
}

function findCursorExecutable() {
  const homeFolder =
    os.homedir();

  const candidates = [
    path.join(
      homeFolder,
      "AppData",
      "Local",
      "Programs",
      "cursor",
      "Cursor.exe"
    ),

    path.join(
      process.env.LOCALAPPDATA || "",
      "Programs",
      "cursor",
      "Cursor.exe"
    ),

    path.join(
      process.env.ProgramFiles || "",
      "Cursor",
      "Cursor.exe"
    ),

    "B:\\cursor\\cursor\\Cursor.exe",
  ];

  for (
    const candidate of candidates
  ) {
    if (
      candidate &&
      fs.existsSync(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

// ==========================================================
// OPEN PROJECT IN VS CODE
// ==========================================================

async function openProjectInVSCode() {
  const vscodePath =
    findVSCodeExecutable();

  if (!vscodePath) {
    console.log(
      "Ruth: VS Code executable dorakaledu."
    );

    return false;
  }

  return new Promise(
    (resolve) => {
      const child = spawn(
        vscodePath,
        [getWorkingDirectory()],
        {
          cwd: getWorkingDirectory(),
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        }
      );

      child.once(
        "error",
        (error) => {
          console.error(
            "Ruth: VS Code launch failed:",
            error.message
          );

          resolve(false);
        }
      );

      child.once(
        "spawn",
        () => {
          child.unref();

          console.log(
            "Ruth: VS Code lo current project open chesanu."
          );

          console.log(
            `Project: ${getWorkingDirectory()}`
          );

          resolve(true);
        }
      );
    }
  );
}

// ==========================================================
// OPEN PROJECT IN CURSOR
// ==========================================================

async function openProjectInCursor() {
  const cursorPath =
    findCursorExecutable();

  if (!cursorPath) {
    console.log(
      "Ruth: Cursor executable dorakaledu."
    );

    return false;
  }

  const folder =
    getWorkingDirectory();

  return new Promise(
    (resolve) => {
      const child = spawn(
        cursorPath,
        [folder],
        {
          cwd: folder,
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        }
      );

      child.once(
        "error",
        (error) => {
          console.error(
            "Ruth: Cursor launch failed:",
            error.message
          );

          resolve(false);
        }
      );

      child.once(
        "spawn",
        () => {
          child.unref();

          console.log(
            "Ruth: Cursor lo current project open chesanu."
          );

          console.log(
            `Project: ${folder}`
          );

          resolve(true);
        }
      );
    }
  );
}

// ==========================================================
// OPEN CURRENT PROJECT FOLDER
// ==========================================================

async function openCurrentProjectFolder() {
  const folder =
    getWorkingDirectory();

  return new Promise(
    (resolve) => {
      const child = spawn(
        "explorer.exe",
        [folder],
        {
          cwd: folder,
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        }
      );

      child.once(
        "error",
        (error) => {
          console.error(
            "Ruth: Project folder open cheyyalekapoyanu:",
            error.message
          );

          resolve(false);
        }
      );

      child.once(
        "spawn",
        () => {
          child.unref();

          console.log(
            "Ruth: Current project folder open chesanu."
          );

          console.log(
            `Folder: ${folder}`
          );

          resolve(true);
        }
      );
    }
  );
}

async function confirmAndOpenVSCode(rl) {
  const folder =
    getWorkingDirectory();

  console.log(
    `Ruth: Current project VS Code lo open cheyyadaniki ready.\nProject: ${folder}`
  );

  const approved =
    await confirmAction(
      "Open the current project in VS Code",
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return;
  }

  await openProjectInVSCode();
}

async function confirmAndOpenCursor(rl) {
  const folder =
    getWorkingDirectory();

  console.log(
    `Ruth: Current project Cursor lo open cheyyadaniki ready.\nProject: ${folder}`
  );

  const approved =
    await confirmAction(
      "Open the current project in Cursor",
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return;
  }

  await openProjectInCursor();
}

async function confirmAndOpenProjectFolder(rl) {
  const folder =
    getWorkingDirectory();

  console.log(
    `Ruth: Current project folder open cheyyadaniki ready.\nFolder: ${folder}`
  );

  const approved =
    await confirmAction(
      "Open the current project folder",
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return;
  }

  await openCurrentProjectFolder();
}

async function handleWorkspaceOpenCommand(
  command,
  rl
) {
  if (
    command === "open vscode" ||
    command === "open vs code" ||
    command === "open code"
  ) {
    await confirmAndOpenVSCode(rl);
    return true;
  }

  if (command === "open cursor") {
    await confirmAndOpenCursor(rl);
    return true;
  }

  if (
    command ===
      "open project folder" ||
    command ===
      "open the project folder" ||
    command === "open explorer"
  ) {
    await confirmAndOpenProjectFolder(
      rl
    );
    return true;
  }

  return false;
}

// ==========================================================
// START SERVER TERMINAL
// ==========================================================

function launchServerTerminal({
  name,
  folder,
  command,
}) {
  return new Promise(
    (resolve) => {
      const safeFolder =
        escapePowerShellString(
          folder
        );

      const safeCommand =
        escapePowerShellString(
          command
        );

      const powershellCommand =
        `$process = Start-Process ` +
        `-FilePath 'cmd.exe' ` +
        `-ArgumentList @('/k','${safeCommand}') ` +
        `-WorkingDirectory '${safeFolder}' ` +
        `-PassThru; ` +
        `Write-Output $process.Id`;

      const launcher =
        spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            powershellCommand,
          ],
          {
            shell: false,
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
            windowsHide: false,
          }
        );

      let stdout = "";
      let stderr = "";

      launcher.stdout?.on(
        "data",
        (data) => {
          stdout +=
            data.toString();
        }
      );

      launcher.stderr?.on(
        "data",
        (data) => {
          stderr +=
            data.toString();
        }
      );

      launcher.once(
        "error",
        (error) => {
          console.error(
            `Ruth: ${name} terminal launch failed:`,
            error.message
          );

          resolve(null);
        }
      );

      launcher.once(
        "close",
        (code) => {
          if (code !== 0) {
            console.error(
              `Ruth: ${name} terminal launch failed.`
            );

            if (
              stderr.trim()
            ) {
              console.error(
                stderr.trim()
              );
            }

            resolve(null);
            return;
          }

          const terminalPid =
            Number(
              stdout
                .trim()
                .split(/\s+/)
                .pop()
            );

          if (
            !Number.isInteger(
              terminalPid
            ) ||
            terminalPid <= 0
          ) {
            console.error(
              `Ruth: ${name} terminal PID detect cheyyalekapoyanu.`
            );

            resolve(null);
            return;
          }

          console.log(
            `Ruth: ${name} terminal started. PID: ${terminalPid}`
          );

          resolve({
            terminalPid,
            folder,
            command,
            port: null,
            url: null,
          });
        }
      );
    }
  );
}

// ==========================================================
// PRINT SERVER INFO
// ==========================================================

function printServerInfo(
  name,
  server
) {
  if (!server) {
    return;
  }

  console.log(
    `\nRuth: ${name}`
  );

  console.log(
    `  Folder : ${server.folder}`
  );

  console.log(
    `  Command: ${server.command}`
  );

  console.log(
    `  PID    : ${server.terminalPid}`
  );

  if (server.port) {
    console.log(
      `  Port   : ${server.port}`
    );

    console.log(
      `  URL    : http://localhost:${server.port}`
    );
  } else {
    console.log(
      "  Port   : Detect cheyyalekapoyanu."
    );
  }
}

// ==========================================================
// START ONE SERVER
// ==========================================================

async function startServer({
  type,
  name,
  folder,
  command,
  rl,
}) {
  if (!folder) {
    console.log(
      `Ruth: ${name} folder current project lo dorakaledu.`
    );

    return true;
  }

  if (
    runningServers[type] &&
    isProcessAlive(
      runningServers[type]
        .terminalPid
    )
  ) {
    console.log(
      `Ruth: ${name} already running.`
    );

    printServerInfo(
      name,
      runningServers[type]
    );

    return true;
  }

  runningServers[type] =
    null;

  console.log(
    `\nRuth: ${name} start cheyyadaniki ready.`
  );

  console.log(
    `Folder : ${folder}`
  );

  console.log(
    `Command: ${command}`
  );

  const approved =
    await confirmAction(
      `Start ${name} server using "${command}"`,
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  const server =
    await launchServerTerminal({
      name,
      folder,
      command,
    });

  if (!server) {
    return true;
  }

  runningServers[type] =
    server;

  console.log(
    `Ruth: ${name} server start ayyindi. Port detect chesthunna...`
  );

  const port =
    await detectServerPort(
      server.terminalPid,
      folder
    );

  if (port) {
    runningServers[type].port =
      port;

    runningServers[type].url =
      `http://localhost:${port}`;

    console.log(
      `\nRuth: ${name} RUNNING`
    );

    console.log(
      `Ruth: Port = ${port}`
    );

    console.log(
      `Ruth: URL  = http://localhost:${port}`
    );
  } else {
    console.log(
      `Ruth: ${name} process start ayyindi kani port detect avvaledu.`
    );
  }

  printServerInfo(
    name,
    runningServers[type]
  );

  await openProjectInVSCode();

  console.log(
    `\nRuth: ${name} startup complete.`
  );

  return true;
}

// ==========================================================
// START FRONTEND
// ==========================================================

async function startFrontend(rl) {
  const frontendFolder =
    getFrontendFolder();

  if (!frontendFolder) {
    console.log(
      "Ruth: frontend folder dorakaledu."
    );

    console.log(
      `Expected: ${path.join(
        getWorkingDirectory(),
        "frontend"
      )}`
    );

    return true;
  }

  const command =
    getFrontendStartCommand(
      frontendFolder
    );

  if (!command) {
    console.log(
      "Ruth: frontend package.json lo dev/start script rendu levu."
    );

    console.log(
      "Expected: scripts.dev or scripts.start"
    );

    return true;
  }

  console.log(
    `Ruth: Frontend kosam automatic ga "${command}" select chesanu.`
  );

  return await startServer({
    type: "frontend",
    name: "Frontend",
    folder: frontendFolder,
    command,
    rl,
  });
}

// ==========================================================
// START BACKEND
// ==========================================================

async function startBackend(rl) {
  const backendFolder =
    getBackendFolder();

  if (!backendFolder) {
    console.log(
      "Ruth: backend folder dorakaledu."
    );

    console.log(
      `Expected: ${path.join(
        getWorkingDirectory(),
        "backend"
      )}`
    );

    return true;
  }

  return await startServer({
    type: "backend",
    name: "Backend",
    folder: backendFolder,
    command: "nodemon server.js",
    rl,
  });
}

// ==========================================================
// START BOTH
// ==========================================================

async function startBoth(rl) {
  const frontendFolder =
    getFrontendFolder();

  const backendFolder =
    getBackendFolder();

  if (
    !frontendFolder &&
    !backendFolder
  ) {
    console.log(
      "Ruth: frontend and backend folders rendu dorakaledu."
    );

    return true;
  }

  let frontendCommand =
    null;

  if (frontendFolder) {
    frontendCommand =
      getFrontendStartCommand(
        frontendFolder
      );

    if (!frontendCommand) {
      console.log(
        "Ruth: frontend package.json lo dev/start script rendu levu."
      );

      console.log(
        "Frontend start cheyyadam skip chesthunna."
      );
    } else {
      console.log(
        `Ruth: Frontend command -> ${frontendCommand}`
      );
    }
  }

  console.log(
    "\nRuth: Both servers start cheyyadaniki ready."
  );

  if (frontendFolder) {
    console.log(
      `Frontend: ${frontendFolder}`
    );

    if (frontendCommand) {
      console.log(
        `Command : ${frontendCommand}`
      );
    }
  }

  if (backendFolder) {
    console.log(
      `Backend : ${backendFolder}`
    );

    console.log(
      "Command : nodemon server.js"
    );
  }

  const approved =
    await confirmAction(
      "Start frontend and backend servers",
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  if (
    frontendFolder &&
    frontendCommand
  ) {
    if (
      runningServers.frontend &&
      isProcessAlive(
        runningServers.frontend
          .terminalPid
      )
    ) {
      console.log(
        "\nRuth: Frontend already running."
      );

      printServerInfo(
        "Frontend",
        runningServers.frontend
      );
    } else {
      const server =
        await launchServerTerminal({
          name: "Frontend",
          folder: frontendFolder,
          command: frontendCommand,
        });

      if (server) {
        runningServers.frontend =
          server;

        console.log(
          "Ruth: Frontend port detect chesthunna..."
        );

        const port =
          await detectServerPort(
            server.terminalPid,
            frontendFolder
          );

        if (port) {
          runningServers.frontend.port =
            port;

          runningServers.frontend.url =
            `http://localhost:${port}`;

          console.log(
            `Ruth: Frontend -> http://localhost:${port}`
          );
        }

        printServerInfo(
          "Frontend",
          runningServers.frontend
        );
      }
    }
  }

  if (backendFolder) {
    if (
      runningServers.backend &&
      isProcessAlive(
        runningServers.backend
          .terminalPid
      )
    ) {
      console.log(
        "\nRuth: Backend already running."
      );

      printServerInfo(
        "Backend",
        runningServers.backend
      );
    } else {
      const server =
        await launchServerTerminal({
          name: "Backend",
          folder: backendFolder,
          command:
            "nodemon server.js",
        });

      if (server) {
        runningServers.backend =
          server;

        console.log(
          "Ruth: Backend port detect chesthunna..."
        );

        const port =
          await detectServerPort(
            server.terminalPid,
            backendFolder
          );

        if (port) {
          runningServers.backend.port =
            port;

          runningServers.backend.url =
            `http://localhost:${port}`;

          console.log(
            `Ruth: Backend -> http://localhost:${port}`
          );
        }

        printServerInfo(
          "Backend",
          runningServers.backend
        );
      }
    }
  }

  await openProjectInVSCode();

  console.log(
    "\nRuth: Both servers startup complete."
  );

  return true;
}

// ==========================================================
// STOP ONE SERVER
// ==========================================================

async function stopServer({
  type,
  name,
  rl,
}) {
  const server =
    runningServers[type];

  if (!server) {
    console.log(
      `Ruth: ${name} Ruth session lo running ga track avvatledu.`
    );

    return true;
  }

  if (
    !isProcessAlive(
      server.terminalPid
    )
  ) {
    console.log(
      `Ruth: ${name} already stopped.`
    );

    runningServers[type] =
      null;

    return true;
  }

  printServerInfo(
    name,
    server
  );

  const approved =
    await confirmAction(
      `Stop ${name} server and its child processes`,
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  console.log(
    `Ruth: ${name} stop chesthunna...`
  );

  const result =
    spawnSync(
      "taskkill.exe",
      [
        "/PID",
        String(
          server.terminalPid
        ),
        "/T",
        "/F",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

  if (
    result.status === 0
  ) {
    console.log(
      `Ruth: ${name} server stopped successfully.`
    );
  } else {
    console.error(
      `Ruth: ${name} stop failed.`
    );

    if (
      result.stderr?.trim()
    ) {
      console.error(
        result.stderr.trim()
      );
    }
  }

  runningServers[type] =
    null;

  return true;
}

// ==========================================================
// STOP FRONTEND
// ==========================================================

async function stopFrontend(rl) {
  return await stopServer({
    type: "frontend",
    name: "Frontend",
    rl,
  });
}

// ==========================================================
// STOP BACKEND
// ==========================================================

async function stopBackend(rl) {
  return await stopServer({
    type: "backend",
    name: "Backend",
    rl,
  });
}

// ==========================================================
// STOP BOTH
// ==========================================================

async function stopBoth(rl) {
  const frontend =
    runningServers.frontend;

  const backend =
    runningServers.backend;

  if (
    !frontend &&
    !backend
  ) {
    console.log(
      "Ruth: Ruth session lo running servers levu."
    );

    return true;
  }

  console.log(
    "\nRuth: Running servers:"
  );

  if (frontend) {
    printServerInfo(
      "Frontend",
      frontend
    );
  }

  if (backend) {
    printServerInfo(
      "Backend",
      backend
    );
  }

  const approved =
    await confirmAction(
      "Stop all servers started by Ruth",
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  if (
    frontend &&
    isProcessAlive(
      frontend.terminalPid
    )
  ) {
    const result =
      spawnSync(
        "taskkill.exe",
        [
          "/PID",
          String(
            frontend.terminalPid
          ),
          "/T",
          "/F",
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        }
      );

    if (
      result.status === 0
    ) {
      console.log(
        "Ruth: Frontend stopped."
      );
    }
  }

  if (
    backend &&
    isProcessAlive(
      backend.terminalPid
    )
  ) {
    const result =
      spawnSync(
        "taskkill.exe",
        [
          "/PID",
          String(
            backend.terminalPid
          ),
          "/T",
          "/F",
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        }
      );

    if (
      result.status === 0
    ) {
      console.log(
        "Ruth: Backend stopped."
      );
    }
  }

  runningServers.frontend =
    null;

  runningServers.backend =
    null;

  console.log(
    "Ruth: All Ruth-managed servers stopped."
  );

  return true;
}

// ==========================================================
// STOP RUTH-STARTED SERVERS ON SHUTDOWN
// ==========================================================

function stopRuthStartedServers() {
  let stoppedAny = false;

  for (const type of [
    "frontend",
    "backend",
  ]) {
    const server =
      runningServers[type];

    runningServers[type] =
      null;

    if (
      !server ||
      !server.terminalPid
    ) {
      continue;
    }

    if (
      !isProcessAlive(
        server.terminalPid
      )
    ) {
      continue;
    }

    const result =
      spawnSync(
        "taskkill.exe",
        [
          "/PID",
          String(
            server.terminalPid
          ),
          "/T",
          "/F",
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        }
      );

    if (result.status === 0) {
      stoppedAny = true;

      console.log(
        `Ruth: ${type} server stop chesanu.`
      );
    } else if (
      result.stderr?.trim()
    ) {
      console.error(
        result.stderr.trim()
      );
    }
  }

  return stoppedAny;
}

async function shutdownRuth() {
  console.log(
    "Ruth: Sare Raju! Malli kaluddam. 👋"
  );

  const stoppedAny =
    stopRuthStartedServers();

  if (stoppedAny) {
    console.log(
      "Ruth: Ruth start chesina servers ni stop chesanu."
    );
  }

  // console.log(
  //   "Ruth: Personal AI Agent stopped."
  // );

  return "EXIT";
}

// ==========================================================
// SERVER STATUS
// ==========================================================

async function showServerStatus() {
  console.log(
    "\n========================================"
  );

  console.log(
    "          RUTH SERVER STATUS"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Project: ${getWorkingDirectory()}`
  );

  if (
    runningServers.frontend &&
    isProcessAlive(
      runningServers.frontend
        .terminalPid
    )
  ) {
    console.log(
      "\nFrontend: RUNNING"
    );

    printServerInfo(
      "Frontend",
      runningServers.frontend
    );
  } else {
    runningServers.frontend =
      null;

    console.log(
      "\nFrontend: STOPPED"
    );
  }

  if (
    runningServers.backend &&
    isProcessAlive(
      runningServers.backend
        .terminalPid
    )
  ) {
    console.log(
      "\nBackend: RUNNING"
    );

    printServerInfo(
      "Backend",
      runningServers.backend
    );
  } else {
    runningServers.backend =
      null;

    console.log(
      "\nBackend: STOPPED"
    );
  }

  console.log(
    "\n========================================"
  );

  return true;
}

// ==========================================================
// NATURAL TASK INPUT
// ==========================================================

function parseNaturalTaskInput(input) {
  const text = input.trim();

  const patterns = [
    /^(?:task\s+)(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\s*:\s*(.+)$/i,

    /^(today|tomorrow)\s+task\s*:\s*(.+)$/i,

    /^(today|tomorrow)\s*:\s*(.+)$/i,

    /^remember\s+(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\s*:\s*(.+)$/i,
  ];

  for (const regex of patterns) {
    const match =
      text.match(regex);

    if (match) {
      return {
        dueDate:
          parseTaskDate(
            match[1]
          ),

        title:
          match[2].trim(),
      };
    }
  }

  return null;
}

// ==========================================================
// PROJECT / CODE ANALYSIS
// ==========================================================

async function handleProjectRequest(
  input
) {
  const text =
    input.toLowerCase();

  const filenameMatch =
    input.match(
      /\b[\w.-]+\.(?:jsx|tsx|js|ts|html|css)\b/i
    );

  const mentionsProject =
    /\bproject folder\b|\bproject files\b|\bcurrent project\b/i.test(
      text
    );

  const mentionsHome =
    /\bhome\b|\bhomepage\b/i.test(
      text
    );

  const explicitlyExplainsCode =
    /\bexplain\b|\bread\b|\bdescribe\b|\banalyze\b|\bcode cheppu\b|\bcode ardham\b/i.test(
      text
    );

  const asksToScan =
    mentionsProject &&
    /\bcheck\b|\bscan\b|\bfiles\b|\bfolder\b|\blist\b|\bwhat\b|\bshow\b/i.test(
      text
    );

  const asksForSpecificFile =
    Boolean(filenameMatch) ||
    (
      mentionsHome &&
      /\bopen\b|\bshow\b|\bcheck\b|\bread\b|\bexplain\b|\banalyze\b|\bdescribe\b/i.test(
        text
      )
    );

  if (
    !explicitlyExplainsCode &&
    !asksForSpecificFile &&
    !asksToScan
  ) {
    return false;
  }

  try {
    console.log(
      "\nRuth: Project files ni scan chesthunna..."
    );

    const files =
      await readProject(
        getWorkingDirectory()
      );

    if (
      asksToScan &&
      !explicitlyExplainsCode &&
      !asksForSpecificFile
    ) {
      printProjectFiles(
        files
      );

      return true;
    }

    let file = null;

    if (filenameMatch) {
      const requestedName =
        filenameMatch[0]
          .toLowerCase();

      file =
        files.find(
          (item) =>
            path
              .basename(item.path)
              .toLowerCase() ===
            requestedName
        );

      if (!file) {
        const requestedStem =
          path.parse(
            requestedName
          ).name;

        const matches =
          files.filter(
            (item) =>
              path
                .parse(
                  path.basename(
                    item.path
                  )
                )
                .name
                .toLowerCase()
                .includes(
                  requestedStem
                )
          );

        console.log(
          `Ruth: ${requestedName} exact match dorakaledu.`
        );

        if (
          matches.length > 0
        ) {
          console.log(
            "Similar files:"
          );

          for (
            const item of matches
          ) {
            console.log(
              "- " + item.path
            );
          }
        } else {
          console.log(
            "Similar source files kuda dorakaledu."
          );
        }

        return true;
      }
    } else if (
      mentionsHome
    ) {
      file =
        files.find(
          (item) =>
            /^home(page)?\.(jsx|tsx|js|ts)$/i.test(
              path.basename(
                item.path
              )
            )
        );
    }

    if (!file) {
      console.log(
        "Ruth: Ye file analyze cheyyalo filename clear ga dorakaledu."
      );

      console.log(
        "Example: explain login.jsx code or explain Home.jsx"
      );

      return true;
    }

    console.log(
      `Ruth: ${file.path} file read chesanu.`
    );

    console.log(
      "Ruth: Code logic and errors analyze chesthunna...\n"
    );

    const report =
      await analyzeCode(
        file
      );

    console.log(
      "\n========================================"
    );

    console.log(
      "          RUTH CODE ANALYSIS"
    );

    console.log(
      `          File: ${report.file}`
    );

    console.log(
      "========================================\n"
    );

    console.log(
      report.explanation
    );

    if (
      report.truncated
    ) {
      console.log(
        "\nNote: File chala pedda ga undhi. Analysis kosam first 10,000 characters matrame use chesam."
      );
    }

    console.log(
      "\n========================================"
    );

    console.log(
      "          ANALYSIS COMPLETE"
    );

    console.log(
      "========================================"
    );

    return true;
  } catch (error) {
    if (
      error.name ===
      "TimeoutError"
    ) {
      console.error(
        "Ruth: Project scan or AI analysis timed out."
      );
    } else {
      console.error(
        "Ruth: Project task failed:",
        error.message
      );
    }

    return true;
  }
}

// ==========================================================
// POWERSHELL COMMAND EXECUTION
// ==========================================================

async function executePowerShellCommand(
  action,
  rl
) {
  const approved =
    await confirmAction(
      action.description,
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  console.log(
    `\nRuth: ${action.description}\n`
  );

  await new Promise(
    (resolve) => {
      const child =
        spawn(
          "powershell.exe",
          action.args,
          {
            shell: false,

            cwd: getWorkingDirectory(),

            windowsHide: true,

            detached: false,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      child.stdout.on(
        "data",
        (data) => {
          process.stdout.write(
            data.toString()
          );
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          process.stderr.write(
            data.toString()
          );
        }
      );

      child.once(
        "error",
        (error) => {
          console.error(
            "\nRuth: PowerShell command failed:",
            error.message
          );

          resolve();
        }
      );

      child.once(
        "close",
        (code) => {
          if (code !== 0) {
            console.log(
              `\nRuth: Command exited with code ${code}.`
            );
          }

          resolve();
        }
      );
    }
  );

  return true;
}

// ==========================================================
// REGISTERED COMMAND EXECUTION
// ==========================================================

async function executeRegisteredCommand(
  command,
  rl
) {
  const action =
    commands[command];

  if (!action) {
    return false;
  }

  console.log(
    `Ruth understood: ${action.description}`
  );

  if (
    action.executable &&
    action.executable.toLowerCase() ===
      "powershell.exe"
  ) {
    return await executePowerShellCommand(
      action,
      rl
    );
  }

  const approved =
    await confirmAction(
      action.description,
      rl
    );

  if (!approved) {
    console.log(
      "Ruth: Action cancelled."
    );

    return true;
  }

  try {
    await new Promise(
      (resolve) => {
        const child =
          spawn(
            action.executable,
            action.args,
            {
              shell: false,
              cwd: getWorkingDirectory(),
              stdio: "ignore",
              windowsHide: false,
              detached: true,
            }
          );

        child.once(
          "spawn",
          () => {
            console.log(
              `Ruth: Successfully launched ${action.description}.`
            );

            child.unref();

            resolve();
          }
        );

        child.once(
          "error",
          (error) => {
            console.error(
              "Ruth: Application launch failed:",
              error.message
            );

            resolve();
          }
        );
      }
    );
  } catch (error) {
    console.error(
      "Ruth: Application launch failed:",
      error.message
    );
  }

  return true;
}

// ==========================================================
// MAIN EXECUTOR
// ==========================================================

export async function executeCommand(
  input,
  rl
) {
  const directCommand =
    input.trim().toLowerCase();

  if (!directCommand) {
    return;
  }

  // ========================================================
  // GREETINGS
  // ========================================================

  if (
    greetings.has(
      directCommand
    )
  ) {
    console.log(
      "Ruth: Hello Raju! 😊 Cheppu, em help kavali?"
    );

    return;
  }

  // ========================================================
  // HOW ARE YOU
  // ========================================================

  if (
    directCommand ===
      "how are you" ||
    directCommand ===
      "how are you ruth"
  ) {
    console.log(
      "Ruth: I'm ready to help you, Raju! 🤝"
    );

    return;
  }

  // ========================================================
  // EXIT
  // ========================================================

  if (
    exitCommands.has(
      directCommand
    )
  ) {
    return await shutdownRuth();
  }

  // ========================================================
  // CHANGE DIRECTORY
  // ========================================================

  const cdMatch =
    input.trim().match(
      /^cd(?:\s+(.+))?$/i
    );

  if (cdMatch) {
    changeWorkingDirectory(
      cdMatch[1]
    );

    return;
  }

  // ========================================================
  // OPEN CURRENT PROJECT
  // ========================================================

  if (
    await handleWorkspaceOpenCommand(
      directCommand,
      rl
    )
  ) {
    return;
  }

  // ========================================================
  // START FRONTEND
  // ========================================================

  if (
    directCommand ===
      "start frontend" ||
    directCommand ===
      "run frontend" ||
    directCommand ===
      "start frontend server"
  ) {
    return await startFrontend(
      rl
    );
  }

  // ========================================================
  // START BACKEND
  // ========================================================

  if (
    directCommand ===
      "start backend" ||
    directCommand ===
      "run backend" ||
    directCommand ===
      "start backend server"
  ) {
    return await startBackend(
      rl
    );
  }

  // ========================================================
  // START BOTH
  // ========================================================

  if (
    directCommand ===
      "start both" ||
    directCommand ===
      "start both servers" ||
    directCommand ===
      "run both"
  ) {
    return await startBoth(
      rl
    );
  }

  // ========================================================
  // STOP FRONTEND
  // ========================================================

  if (
    directCommand ===
      "stop frontend" ||
    directCommand ===
      "stop frontend server"
  ) {
    return await stopFrontend(
      rl
    );
  }

  // ========================================================
  // STOP BACKEND
  // ========================================================

  if (
    directCommand ===
      "stop backend" ||
    directCommand ===
      "stop backend server"
  ) {
    return await stopBackend(
      rl
    );
  }

  // ========================================================
  // STOP BOTH
  // ========================================================

  if (
    directCommand ===
      "stop both" ||
    directCommand ===
      "stop both servers" ||
    directCommand ===
      "stop servers"
  ) {
    return await stopBoth(
      rl
    );
  }

  // ========================================================
  // SERVER STATUS
  // ========================================================

  if (
    directCommand ===
      "server status" ||
    directCommand ===
      "servers status" ||
    directCommand ===
      "status servers" ||
    directCommand ===
      "check servers"
  ) {
    return await showServerStatus();
  }

  // ========================================================
  // TASKS
  // ========================================================

  if (
    directCommand === "tasks" ||
    directCommand === "show tasks" ||
    directCommand === "my tasks" ||
    directCommand === "task list"
  ) {
    printTasks();
    return;
  }

  if (
    directCommand === "due tasks" ||
    directCommand === "today tasks"
  ) {
    printDueTasks();
    return;
  }

  const naturalTask =
    parseNaturalTaskInput(input);

  if (naturalTask) {
    if (
      !naturalTask.dueDate ||
      !naturalTask.title
    ) {
      console.log(
        "Ruth: Task format correct ga ivvu."
      );

      console.log(
        "Example: task today: cleaning outside"
      );

      return;
    }

    const task =
      addTask(naturalTask);

    console.log(
      "Ruth: Task added successfully."
    );

    console.log(
      `  ${task.dueDate} - ${task.title}`
    );

    return;
  }

  // ========================================================
  // DONE TASK
  // ========================================================

  const doneMatch =
    directCommand.match(
      /^done\s+(\d+)$/
    );

  if (doneMatch) {
    const taskNumber =
      Number(doneMatch[1]);

    const pendingTasks =
      getPendingTasks();

    const task =
      pendingTasks[
        taskNumber - 1
      ];

    if (!task) {
      console.log(
        "Ruth: Aa task number dorakaledu."
      );

      return;
    }

    const completed =
      completeTask(
        taskNumber
      );

    if (!completed) {
      console.log(
        "Ruth: Task complete cheyyalekapoyanu."
      );

      return;
    }

    console.log(
      `Ruth: Task completed - ${completed.title}`
    );

    return;
  }

  // ========================================================
  // DELETE TASK
  // ========================================================

  const deleteMatch =
    directCommand.match(
      /^delete\s+(\d+)$/
    );

  if (deleteMatch) {
    const taskNumber =
      Number(deleteMatch[1]);

    const pendingTasks =
      getPendingTasks();

    const task =
      pendingTasks[
        taskNumber - 1
      ];

    if (!task) {
      console.log(
        "Ruth: Aa task number dorakaledu."
      );

      return;
    }

    const deleted =
      deleteTask(
        taskNumber
      );

    if (!deleted) {
      console.log(
        "Ruth: Task delete cheyyalekapoyanu."
      );

      return;
    }

    console.log(
      `Ruth: Task deleted - ${deleted.title}`
    );

    return;
  }

  // ========================================================
  // MOVE TASK
  // ========================================================

  const moveMatch =
    input.match(
      /^move\s+(\d+)\s+to\s+(.+)$/i
    );

  if (moveMatch) {
    const taskNumber =
      Number(moveMatch[1]);

    const newDate =
      parseTaskDate(
        moveMatch[2].trim()
      );

    const pendingTasks =
      getPendingTasks();

    const task =
      pendingTasks[
        taskNumber - 1
      ];

    if (!task) {
      console.log(
        "Ruth: Aa task number dorakaledu."
      );

      return;
    }

    if (!newDate) {
      console.log(
        "Ruth: Valid date ivvu."
      );

      return;
    }

    const moved =
      moveTask(
        taskNumber,
        newDate
      );

    if (!moved) {
      console.log(
        "Ruth: Task move cheyyalekapoyanu."
      );

      return;
    }

    console.log(
      `Ruth: Task moved to ${newDate} - ${moved.title}`
    );

    return;
  }

  // ========================================================
  // EDIT TASK
  // ========================================================

  const editMatch =
    input.match(
      /^edit\s+(\d+)\s+(.+)$/i
    );

  if (editMatch) {
    const taskNumber =
      Number(editMatch[1]);

    const newTitle =
      editMatch[2].trim();

    const pendingTasks =
      getPendingTasks();

    const task =
      pendingTasks[
        taskNumber - 1
      ];

    if (!task) {
      console.log(
        "Ruth: Aa task number dorakaledu."
      );

      return;
    }

    if (!newTitle) {
      console.log(
        "Ruth: New task title ivvu."
      );

      return;
    }

    const edited =
      editTask(
        taskNumber,
        newTitle
      );

    if (!edited) {
      console.log(
        "Ruth: Task update cheyyalekapoyanu."
      );

      return;
    }

    console.log(
      `Ruth: Task updated - ${edited.title}`
    );

    return;
  }

  // ========================================================
  // PROJECT / CODE ANALYSIS
  // ========================================================

  const handled =
    await handleProjectRequest(
      input
    );

  if (handled) {
    return;
  }

  // ========================================================
  // REGISTERED COMMAND / OLLAMA
  // ========================================================

  const command =
    Object.hasOwn(
      commands,
      directCommand
    )
      ? directCommand
      : await understandCommand(
          input
        );

  // ========================================================
  // UNKNOWN
  // ========================================================

  if (
    !command ||
    !Object.hasOwn(
      commands,
      command
    )
  ) {
    console.log(
      "Ruth: Ee request inka support cheyyadam ledu ra. " +
        "Try a registered command or ask me to check the current project."
    );

    return;
  }

  if (
    await handleWorkspaceOpenCommand(
      command,
      rl
    )
  ) {
    return;
  }

  // ========================================================
  // REGISTERED ACTION
  // ========================================================

  await executeRegisteredCommand(
    command,
    rl
  );
}