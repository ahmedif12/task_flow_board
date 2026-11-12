// Task Flow — vanilla JavaScript Kanban board
"use strict";

const STORAGE_KEY = "task-flow-items";
const THEME_KEY = "task-flow-theme";
const STATUSES = ["todo", "in-progress", "completed"];

const taskForm = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskDescription = document.getElementById("task-description");
const taskCategory = document.getElementById("task-category");
const taskPriority = document.getElementById("task-priority");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const themeToggle = document.getElementById("theme-toggle");
const toast = document.getElementById("toast");

const lists = {
  todo: document.getElementById("list-todo"),
  "in-progress": document.getElementById("list-in-progress"),
  completed: document.getElementById("list-completed")
};
const countElements = {
  todo: document.getElementById("count-todo"),
  "in-progress": document.getElementById("count-in-progress"),
  completed: document.getElementById("count-completed")
};

let tasks = loadTasks();
let draggedTaskId = null;
let toastTimeout;

// Load saved tasks safely and ignore malformed localStorage data.
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(task =>
      task && typeof task.id === "string" &&
      typeof task.title === "string" && STATUSES.includes(task.status)
    ).map(task => ({
      id: task.id,
      title: task.title,
      description: typeof task.description === "string" ? task.description : "",
      category: ["Development", "Design", "Marketing"].includes(task.category) ? task.category : "Development",
      priority: ["Low", "Medium", "High"].includes(task.priority) ? task.priority : "Medium",
      status: task.status
    }));
  } catch (error) {
    console.warn("Could not read saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showToast("Could not save tasks in this browser.");
    console.error("Could not save tasks:", error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

function handleAddTask(event) {
  event.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) {
    taskTitle.focus();
    return;
  }

  const newTask = {
    id: (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description: taskDescription.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    status: "todo"
  };

  tasks.unshift(newTask);
  saveTasks();
  taskForm.reset();
  renderTasks();
  taskTitle.focus();
  showToast("Task added to To Do.");
}

function updateTaskStatus(id, newStatus) {
  if (!STATUSES.includes(newStatus)) return;
  tasks = tasks.map(task => task.id === id ? { ...task, status: newStatus } : task);
  saveTasks();
  renderTasks();
  showToast(`Task moved to ${statusLabel(newStatus)}.`);
}

function deleteTask(id) {
  if (!tasks.some(task => task.id === id)) return;
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
  showToast("Task deleted.");
}

function statusLabel(status) {
  return { todo: "To Do", "in-progress": "In Progress", completed: "Completed" }[status];
}

function renderTasks() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase();
  const selectedCategory = categoryFilter.value;
  const counts = { todo: 0, "in-progress": 0, completed: 0 };

  Object.values(lists).forEach(list => list.replaceChildren());

  const visibleTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLocaleLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === "All" || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  visibleTasks.forEach(task => {
    counts[task.status] += 1;
    lists[task.status].appendChild(createTaskCard(task));
  });

  STATUSES.forEach(status => {
    countElements[status].textContent = counts[status];
    if (!lists[status].children.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = (searchTerm || selectedCategory !== "All")
        ? "No matching tasks."
        : status === "todo" ? "No tasks here yet."
        : status === "in-progress" ? "Drop a task here when you start."
        : "Finished tasks will appear here.";
      lists[status].appendChild(empty);
    }
  });

  const completed = tasks.filter(task => task.status === "completed").length;
  document.getElementById("active-count").textContent = tasks.length - completed;
  document.getElementById("completed-count").textContent = completed;
  document.getElementById("total-count").textContent = tasks.length;
}

// Build cards with DOM methods and textContent to safely display user input.
function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.dataset.priority = task.priority;
  card.dataset.taskId = task.id;
  card.draggable = true;

  const title = document.createElement("h3");
  title.className = "task-card-title";
  title.textContent = task.title;
  card.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    card.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const category = document.createElement("span");
  category.className = "meta-chip";
  category.textContent = task.category;
  const priority = document.createElement("span");
  priority.className = "meta-chip priority-chip";
  priority.dataset.priority = task.priority;
  priority.textContent = `${task.priority} priority`;
  meta.append(category, priority);
  card.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const statusSelect = document.createElement("select");
  statusSelect.setAttribute("aria-label", `Change status for ${task.title}`);
  STATUSES.forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = statusLabel(status);
    option.selected = task.status === status;
    statusSelect.appendChild(option);
  });
  statusSelect.addEventListener("change", () => updateTaskStatus(task.id, statusSelect.value));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn-danger";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));
  actions.append(statusSelect, deleteButton);
  card.appendChild(actions);

  // Native HTML5 drag-and-drop support.
  card.addEventListener("dragstart", event => {
    draggedTaskId = task.id;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  });
  card.addEventListener("dragend", () => {
    draggedTaskId = null;
    card.classList.remove("dragging");
    document.querySelectorAll(".column").forEach(column => column.classList.remove("drag-over"));
  });

  return card;
}

function setupDropZones() {
  document.querySelectorAll(".column").forEach(column => {
    const status = column.dataset.status;
    column.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", event => {
      if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
    });
    column.addEventListener("drop", event => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const id = event.dataTransfer.getData("text/plain") || draggedTaskId;
      if (id && STATUSES.includes(status)) updateTaskStatus(id, status);
    });
  });
}

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.getElementById("theme-icon").textContent = isDark ? "☀" : "☾";
  document.getElementById("theme-label").textContent = isDark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  try { localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch (error) {
    console.warn("Could not save theme preference:", error);
  }
}

function initialise() {
  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "light"; } catch (error) {}
  setTheme(savedTheme);

  taskForm.addEventListener("submit", handleAddTask);
  searchInput.addEventListener("input", renderTasks);
  categoryFilter.addEventListener("change", renderTasks);
  document.getElementById("clear-filters").addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "All";
    renderTasks();
  });
  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  setupDropZones();
  renderTasks();
}

document.addEventListener("DOMContentLoaded", initialise);
