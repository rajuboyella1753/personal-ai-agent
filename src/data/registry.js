import os from "node:os";
import path from "node:path";

const projectFolder = process.cwd();
const homeFolder = os.homedir();

const vscodePath = path.join(
  homeFolder,
  "AppData",
  "Local",
  "Programs",
  "Microsoft VS Code",
  "Code.exe"
);

const website = (description, url) => ({
  description,
  executable: "explorer.exe",
  args: [url],
});

const windowsApp = (
  description,
  executable,
  args = []
) => ({
  description,
  executable,
  args,
});

const powershell = (
  description,
  command
) => ({
  description,
  executable: "powershell.exe",
  args: [
    "-NoProfile",
    "-NoLogo",
    "-Command",
    command,
  ],
});

export const commands = {
  // ==========================================
  // WEBSITES
  // ==========================================

  "open youtube": website(
    "Open YouTube in the default browser",
    "https://www.youtube.com"
  ),

  "open google": website(
    "Open Google",
    "https://www.google.com"
  ),

  "open gmail": website(
    "Open Gmail",
    "https://mail.google.com"
  ),

  "open github": website(
    "Open GitHub",
    "https://github.com"
  ),

  "open chatgpt": website(
    "Open ChatGPT",
    "https://chatgpt.com"
  ),

  "open facebook": website(
    "Open Facebook",
    "https://www.facebook.com"
  ),

  "open instagram": website(
    "Open Instagram",
    "https://www.instagram.com"
  ),

  "open whatsapp web": website(
    "Open WhatsApp Web",
    "https://web.whatsapp.com"
  ),

  "open linkedin": website(
    "Open LinkedIn",
    "https://www.linkedin.com"
  ),

  "open stackoverflow": website(
    "Open Stack Overflow",
    "https://stackoverflow.com"
  ),

  "open stack overflow": website(
    "Open Stack Overflow",
    "https://stackoverflow.com"
  ),

  "open microsoft": website(
    "Open Microsoft",
    "https://www.microsoft.com"
  ),

  "open outlook": website(
    "Open Outlook",
    "https://outlook.live.com"
  ),

  "open google drive": website(
    "Open Google Drive",
    "https://drive.google.com"
  ),

  "open google maps": website(
    "Open Google Maps",
    "https://maps.google.com"
  ),

  "open amazon": website(
    "Open Amazon India",
    "https://www.amazon.in"
  ),

  "open wikipedia": website(
    "Open Wikipedia",
    "https://www.wikipedia.org"
  ),

  // ==========================================
  // WINDOWS APPLICATIONS
  // ==========================================

  "open notepad": windowsApp(
    "Open Notepad",
    "notepad.exe"
  ),

  "open calculator": windowsApp(
    "Open Calculator",
    "calc.exe"
  ),

  "open file manager": windowsApp(
    "Open Windows File Explorer",
    "explorer.exe"
  ),

  "open file explorer": windowsApp(
    "Open Windows File Explorer",
    "explorer.exe"
  ),

  "open explorer": windowsApp(
    "Open the current project folder",
    "explorer.exe",
    [projectFolder]
  ),

  "open paint": windowsApp(
    "Open Microsoft Paint",
    "mspaint.exe"
  ),

  "open task manager": windowsApp(
    "Open Task Manager",
    "taskmgr.exe"
  ),

  "open command prompt": windowsApp(
    "Open Command Prompt",
    "cmd.exe"
  ),

  "open powershell": windowsApp(
    "Open PowerShell",
    "powershell.exe"
  ),

  "open settings": windowsApp(
    "Open Windows Settings",
    "explorer.exe",
    ["ms-settings:"]
  ),

  "open control panel": windowsApp(
    "Open Control Panel",
    "control.exe"
  ),

  "open services": windowsApp(
    "Open Windows Services",
    "services.msc"
  ),

  // ==========================================
  // DEVELOPMENT TOOLS
  // ==========================================

  "open vscode": windowsApp(
    "Open the current project in VS Code",
    vscodePath,
    [projectFolder]
  ),

  "open vs code": windowsApp(
    "Open the current project in VS Code",
    vscodePath,
    [projectFolder]
  ),

  "open code": windowsApp(
    "Open the current project in VS Code",
    vscodePath,
    [projectFolder]
  ),

  "open cursor": windowsApp(
    "Open the current project in Cursor",
    "cursor",
    [projectFolder]
  ),

  "open project folder": windowsApp(
    "Open the current project folder",
    "explorer.exe",
    [projectFolder]
  ),

  "open the project folder": windowsApp(
    "Open the current project folder",
    "explorer.exe",
    [projectFolder]
  ),

  // ==========================================
  // COMMON FOLDERS
  // ==========================================

  "open downloads": windowsApp(
    "Open Downloads folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Downloads"
      ),
    ]
  ),

  "open documents": windowsApp(
    "Open Documents folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Documents"
      ),
    ]
  ),

  "open desktop": windowsApp(
    "Open Desktop folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Desktop"
      ),
    ]
  ),

  "open pictures": windowsApp(
    "Open Pictures folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Pictures"
      ),
    ]
  ),

  "open music": windowsApp(
    "Open Music folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Music"
      ),
    ]
  ),

  "open videos": windowsApp(
    "Open Videos folder",
    "explorer.exe",
    [
      path.join(
        homeFolder,
        "Videos"
      ),
    ]
  ),

  // ==========================================
  // WHATSAPP
  // ==========================================

  "open whatsapp": windowsApp(
    "Open WhatsApp using its application link",
    "explorer.exe",
    ["whatsapp://"]
  ),

  // ==========================================
  // FILES & FOLDERS
  // ==========================================

  "pwd": powershell(
    "Show current folder",
    "Get-Location"
  ),

  "get location": powershell(
    "Show current folder",
    "Get-Location"
  ),

  "ls": powershell(
    "List files and folders",
    "Get-ChildItem"
  ),

  "dir": powershell(
    "List files and folders",
    "Get-ChildItem"
  ),

  "list files": powershell(
    "List files and folders",
    "Get-ChildItem"
  ),

  "list folders": powershell(
    "List files and folders",
    "Get-ChildItem -Directory"
  ),

  "cd home": powershell(
    "Go to home folder",
    "Set-Location $HOME; Get-Location"
  ),

  "create folder": powershell(
    "Create a folder",
    "New-Item -ItemType Directory"
  ),

  "create file": powershell(
    "Create a file",
    "New-Item -ItemType File"
  ),

  // ==========================================
  // FILE READING
  // ==========================================

  "show package json": powershell(
    "Show package.json",
    "Get-Content package.json"
  ),

  "show gitignore": powershell(
    "Show .gitignore",
    "Get-Content .gitignore"
  ),

  "read file": powershell(
    "Read a file",
    "Get-Content"
  ),

  "show file": powershell(
    "Show file contents",
    "Get-Content"
  ),

  "last 20 lines": powershell(
    "Show last 20 lines",
    "Get-Content -Tail 20"
  ),

  // ==========================================
  // SEARCH
  // ==========================================

  "search files": powershell(
    "Search files recursively",
    "Get-ChildItem -Recurse"
  ),

  "search js files": powershell(
    "Search JavaScript files",
    'Get-ChildItem -Recurse -Filter "*.js"'
  ),

  "search todo": powershell(
    "Search TODO in project",
    'Get-ChildItem -Recurse | Select-String "TODO"'
  ),

  "find todo": powershell(
    "Find TODO in project",
    'Get-ChildItem -Recurse | Select-String "TODO"'
  ),

  // ==========================================
  // PROCESSES
  // ==========================================

  "show processes": powershell(
    "Show running processes",
    "Get-Process"
  ),

  "show chrome process": powershell(
    "Show Chrome process",
    "Get-Process chrome"
  ),

  "processes": powershell(
    "Show running processes",
    "Get-Process"
  ),

  // ==========================================
  // INTERNET / NETWORK
  // ==========================================

  "test internet": powershell(
    "Test internet connection",
    "Test-Connection google.com"
  ),

  "show ip": powershell(
    "Show IP configuration",
    "ipconfig"
  ),

  "show network": powershell(
    "Show complete network information",
    "ipconfig /all"
  ),

  "show ip addresses": powershell(
    "Show computer IP addresses",
    "Get-NetIPAddress"
  ),

  "get ip addresses": powershell(
    "Show computer IP addresses",
    "Get-NetIPAddress"
  ),

  // ==========================================
  // PORTS
  // ==========================================

  "show listening ports": powershell(
    "Show listening ports",
    "Get-NetTCPConnection -State Listen"
  ),

  "show port 5000": powershell(
    "Check port 5000",
    "Get-NetTCPConnection -LocalPort 5000"
  ),

  "show port 3000": powershell(
    "Check port 3000",
    "Get-NetTCPConnection -LocalPort 3000"
  ),

  "show port 5173": powershell(
    "Check port 5173",
    "Get-NetTCPConnection -LocalPort 5173"
  ),

  "show all ports": powershell(
    "Show all ports and PIDs",
    "netstat -ano"
  ),

  "show port 5000 netstat": powershell(
    "Search port 5000 using netstat",
    "netstat -ano | findstr :5000"
  ),

  // ==========================================
  // COMPUTER INFORMATION
  // ==========================================

  "computer info": powershell(
    "Show computer information",
    "Get-ComputerInfo"
  ),

  "who am i": powershell(
    "Show current username",
    "$env:USERNAME"
  ),

  "show username": powershell(
    "Show current username",
    "$env:USERNAME"
  ),

  "show user profile": powershell(
    "Show user profile path",
    "$env:USERPROFILE"
  ),

  // ==========================================
  // NODE.JS / NPM
  // ==========================================

  "node version": powershell(
    "Show Node.js version",
    "node -v"
  ),

  "npm version": powershell(
    "Show npm version",
    "npm -v"
  ),

  "npm install": powershell(
    "Install project dependencies",
    "npm install"
  ),

  "npm start": powershell(
    "Run npm start",
    "npm start"
  ),

  "npm run dev": powershell(
    "Run npm dev",
    "npm run dev"
  ),

  "npm build": powershell(
    "Build project",
    "npm run build"
  ),

  "npm scripts": powershell(
    "Show npm scripts",
    "npm run"
  ),

  "npm packages": powershell(
    "Show installed npm packages",
    "npm list --depth=0"
  ),

  "npm outdated": powershell(
    "Show outdated npm packages",
    "npm outdated"
  ),

  // ==========================================
  // GIT
  // ==========================================

  "git status": powershell(
    "Show Git status",
    "git status"
  ),

  "git log": powershell(
    "Show Git commit history",
    "git log --oneline"
  ),

  "git branches": powershell(
    "Show Git branches",
    "git branch"
  ),

  "git pull": powershell(
    "Pull latest Git code",
    "git pull"
  ),

  "git add": powershell(
    "Stage all Git changes",
    "git add ."
  ),

  "git push": powershell(
    "Push Git changes",
    "git push"
  ),

  // ==========================================
  // WINDOWS SERVICES
  // ==========================================

  "show services": powershell(
    "Show Windows services",
    "Get-Service"
  ),

  "running services": powershell(
    "Show running Windows services",
    'Get-Service | Where-Object {$_.Status -eq "Running"}'
  ),

  // ==========================================
  // POWERSHELL COMMAND HELP
  // ==========================================

  "powershell commands": powershell(
    "Show available PowerShell commands",
    "Get-Command"
  ),

  "powershell process commands": powershell(
    "Show process-related PowerShell commands",
    "Get-Command *process*"
  ),

  "powershell help": powershell(
    "Show PowerShell help",
    "Get-Help"
  ),

  "get process help": powershell(
    "Show Get-Process help",
    "Get-Help Get-Process"
  ),

  "get process examples": powershell(
    "Show Get-Process examples",
    "Get-Help Get-Process -Examples"
  ),

  "get member": powershell(
    "Show object properties and methods",
    "Get-Member"
  ),

  // ==========================================
  // POWERSHELL SECURITY
  // ==========================================

  "execution policy": powershell(
    "Show PowerShell execution policy",
    "Get-ExecutionPolicy"
  ),

  "execution policy list": powershell(
    "Show all PowerShell execution policies",
    "Get-ExecutionPolicy -List"
  ),

  "set execution policy": powershell(
    "Set CurrentUser execution policy to RemoteSigned",
    "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned"
  ),
};