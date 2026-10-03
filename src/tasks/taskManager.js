import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ==========================================================
// RUTH TASK STORAGE
// ==========================================================

const CURRENT_FILE = fileURLToPath(import.meta.url);

const TASKS_FOLDER = path.resolve(
  path.dirname(CURRENT_FILE),
  "..",
  "..",
  "data"
);

const TASKS_FILE = path.join(
  TASKS_FOLDER,
  "tasks.json"
);

// ==========================================================
// ENSURE TASK FILE
// ==========================================================

function ensureTaskFile() {
  if (!fs.existsSync(TASKS_FOLDER)) {
    fs.mkdirSync(TASKS_FOLDER, {
      recursive: true,
    });
  }

  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(
      TASKS_FILE,
      "[]",
      "utf8"
    );
  }
}

// ==========================================================
// READ TASKS
// ==========================================================

function readTasks() {
  ensureTaskFile();

  try {
    const content = fs.readFileSync(
      TASKS_FILE,
      "utf8"
    );

    const tasks = JSON.parse(content);

    return Array.isArray(tasks)
      ? tasks
      : [];
  } catch (error) {
    console.error(
      "Ruth: tasks.json read cheyyalekapoyanu:",
      error.message
    );

    return [];
  }
}

// ==========================================================
// SAVE TASKS
// ==========================================================

function saveTasks(tasks) {
  ensureTaskFile();

  fs.writeFileSync(
    TASKS_FILE,
    JSON.stringify(tasks, null, 2),
    "utf8"
  );
}

// ==========================================================
// DATE HELPERS
// ==========================================================

function formatDate(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDate() {
  return formatDate(new Date());
}

function tomorrowDate() {
  const date = new Date();

  date.setDate(
    date.getDate() + 1
  );

  return formatDate(date);
}

// ==========================================================
// PARSE TASK DATE
// ==========================================================

function parseTaskDate(dateText) {
  const value = dateText
    .trim()
    .toLowerCase();

  if (value === "today") {
    return todayDate();
  }

  if (value === "tomorrow") {
    return tomorrowDate();
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    const date = new Date(
      `${value}T00:00:00`
    );

    if (!Number.isNaN(date.getTime())) {
      return value;
    }
  }

  const ddmmyyyy = value.match(
    /^(\d{2})-(\d{2})-(\d{4})$/
  );

  if (ddmmyyyy) {
    const day = ddmmyyyy[1];
    const month = ddmmyyyy[2];
    const year = ddmmyyyy[3];

    const date = new Date(
      `${year}-${month}-${day}T00:00:00`
    );

    if (!Number.isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

// ==========================================================
// ADD TASK
// ==========================================================

export function addTask({
  title,
  dueDate,
}) {
  const tasks = readTasks();

  const task = {
    id:
      tasks.length > 0
        ? Math.max(
            ...tasks.map(
              (item) =>
                Number(item.id) || 0
            )
          ) + 1
        : 1,

    title: title.trim(),

    dueDate,

    completed: false,

    createdAt:
      new Date().toISOString(),

    completedAt: null,
  };

  tasks.push(task);

  saveTasks(tasks);

  return task;
}

// ==========================================================
// GET ALL TASKS
// ==========================================================

export function getTasks() {
  return readTasks();
}

// ==========================================================
// GET PENDING TASKS
// ==========================================================

export function getPendingTasks() {
  return readTasks().filter(
    (task) =>
      !task.completed
  );
}

// ==========================================================
// GET DUE TASKS
// ==========================================================

export function getDueTasks() {
  const today = todayDate();

  return getPendingTasks().filter(
    (task) =>
      task.dueDate <= today
  );
}

// ==========================================================
// FIND PENDING TASK BY DISPLAY NUMBER
// ==========================================================

function findPendingTaskByNumber(
  taskNumber
) {
  const pendingTasks =
    getPendingTasks();

  const index =
    Number(taskNumber) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingTasks.length
  ) {
    return null;
  }

  return pendingTasks[index];
}

// ==========================================================
// COMPLETE TASK
// ==========================================================

export function completeTask(
  taskNumber
) {
  const tasks = readTasks();

  const pendingTasks =
    tasks.filter(
      (task) =>
        !task.completed
    );

  const index =
    Number(taskNumber) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingTasks.length
  ) {
    return null;
  }

  const selectedTask =
    pendingTasks[index];

  const taskIndex =
    tasks.findIndex(
      (item) =>
        Number(item.id) ===
        Number(selectedTask.id)
    );

  if (taskIndex === -1) {
    return null;
  }

  tasks[taskIndex].completed =
    true;

  tasks[taskIndex].completedAt =
    new Date().toISOString();

  saveTasks(tasks);

  return tasks[taskIndex];
}

// ==========================================================
// DELETE TASK
// ==========================================================

export function deleteTask(
  taskNumber
) {
  const tasks = readTasks();

  const pendingTasks =
    tasks.filter(
      (task) =>
        !task.completed
    );

  const index =
    Number(taskNumber) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingTasks.length
  ) {
    return null;
  }

  const selectedTask =
    pendingTasks[index];

  const taskIndex =
    tasks.findIndex(
      (item) =>
        Number(item.id) ===
        Number(selectedTask.id)
    );

  if (taskIndex === -1) {
    return null;
  }

  const deleted =
    tasks[taskIndex];

  tasks.splice(
    taskIndex,
    1
  );

  saveTasks(tasks);

  return deleted;
}

// ==========================================================
// EDIT TASK
// ==========================================================

export function editTask(
  taskNumber,
  newTitle
) {
  const tasks = readTasks();

  const pendingTasks =
    tasks.filter(
      (task) =>
        !task.completed
    );

  const index =
    Number(taskNumber) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingTasks.length
  ) {
    return null;
  }

  const selectedTask =
    pendingTasks[index];

  const taskIndex =
    tasks.findIndex(
      (item) =>
        Number(item.id) ===
        Number(selectedTask.id)
    );

  if (taskIndex === -1) {
    return null;
  }

  tasks[taskIndex].title =
    newTitle.trim();

  saveTasks(tasks);

  return tasks[taskIndex];
}

// ==========================================================
// MOVE TASK
// ==========================================================

export function moveTask(
  taskNumber,
  newDate
) {
  const tasks = readTasks();

  const pendingTasks =
    tasks.filter(
      (task) =>
        !task.completed
    );

  const index =
    Number(taskNumber) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingTasks.length
  ) {
    return null;
  }

  const selectedTask =
    pendingTasks[index];

  const taskIndex =
    tasks.findIndex(
      (item) =>
        Number(item.id) ===
        Number(selectedTask.id)
    );

  if (taskIndex === -1) {
    return null;
  }

  tasks[taskIndex].dueDate =
    newDate;

  saveTasks(tasks);

  return tasks[taskIndex];
}

// ==========================================================
// PRINT ALL PENDING TASKS
// ==========================================================

export function printTasks() {
  const tasks =
    getPendingTasks();

  console.log(
    "\n📋 RUTH TASKS"
  );

  console.log(
    "========================================"
  );

  if (tasks.length === 0) {
    console.log(
      "No pending tasks."
    );

    console.log(
      "========================================"
    );

    return;
  }

  tasks.forEach(
    (task, index) => {
      console.log(
        `[${index + 1}] ${task.dueDate} — ${task.title}`
      );
    }
  );

  console.log(
    "========================================"
  );
}

// ==========================================================
// PRINT TODAY / OVERDUE TASKS
// ==========================================================

export function printDueTasks() {
  const tasks =
    getDueTasks();

  if (tasks.length === 0) {
    return;
  }

  const today =
    todayDate();

  console.log(
    "\n📋 TODAY'S / OVERDUE TASKS"
  );

  console.log(
    "========================================"
  );

  tasks.forEach(
    (task, index) => {
      const label =
        task.dueDate < today
          ? "OVERDUE"
          : "TODAY";

      console.log(
        `[${index + 1}] ${label} — ${task.title}`
      );
    }
  );

  console.log(
    "========================================"
  );
}

// ==========================================================
// EXPORT HELPERS
// ==========================================================

export {
  todayDate,
  tomorrowDate,
  parseTaskDate,
};