"use strict";

// El navegador únicamente interactúa con la API. PostgreSQL NO se consulta aquí.
const $ = (id) => document.getElementById(id);
const state = { token: sessionStorage.getItem("studyflow-jwt") || "", user: null, tasks: [], filter: "all", mode: "login" };

function showMessage(element, message = "", error = false) {
  element.textContent = message;
  element.classList.toggle("error", Boolean(error));
}

async function api(url, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (_) {
    throw new Error("No hay conexión con el servidor. Comprueba que Node.js esté ejecutándose.");
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function setAuthMode(mode) {
  state.mode = mode;
  const register = mode === "register";
  $("name-field").hidden = !register;
  $("auth-name").required = register;
  $("auth-password").autocomplete = register ? "new-password" : "current-password";
  $("auth-title").textContent = register ? "Crear cuenta" : "Iniciar sesión";
  $("auth-description").textContent = register ? "Crea tu espacio de organización en segundos." : "Continúa donde dejaste tus pendientes.";
  $("auth-submit").innerHTML = register ? 'Crear mi cuenta <span aria-hidden="true">→</span>' : 'Iniciar sesión <span aria-hidden="true">→</span>';
  $("tab-login").classList.toggle("active", !register);
  $("tab-register").classList.toggle("active", register);
  $("tab-login").setAttribute("aria-pressed", String(!register));
  $("tab-register").setAttribute("aria-pressed", String(register));
  showMessage($("auth-message"));
}

function logout(message = "") {
  state.token = "";
  state.user = null;
  state.tasks = [];
  sessionStorage.removeItem("studyflow-jwt");
  $("auth-section").hidden = false;
  $("dashboard-section").hidden = true;
  $("logout-button").hidden = true;
  $("auth-password").value = "";
  if (message) showMessage($("auth-message"), message, true);
}

async function enterApp(data) {
  state.token = data.token || state.token;
  state.user = data.user;
  sessionStorage.setItem("studyflow-jwt", state.token);
  $("auth-section").hidden = true;
  $("dashboard-section").hidden = false;
  $("logout-button").hidden = false;
  $("user-name").textContent = state.user.name.split(" ")[0];
  await refreshTasks();
}

async function refreshTasks() {
  const data = await api("/api/tasks");
  state.tasks = data.tasks;
  renderTasks();
}

function makeButton(text, className, action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = className;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", action);
  return button;
}

async function modifyTask(id, changes, successMessage = "Cambio guardado.") {
  try {
    await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
    await refreshTasks();
    showMessage($("app-message"), successMessage);
  } catch (error) {
    showMessage($("app-message"), error.message, true);
  }
}

function renderTasks() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.completed).length;
  $("total-count").textContent = total;
  $("done-count").textContent = done;
  $("pending-count").textContent = total - done;
  $("task-counter").textContent = `${done} de ${total} completadas`;
  const percent = total ? Math.round(done * 100 / total) : 0;
  $("progress-fill").style.width = `${percent}%`;
  $("progress").setAttribute("aria-valuenow", String(percent));

  const visible = state.tasks.filter((t) => state.filter === "all" || (state.filter === "completed" ? t.completed : !t.completed));
  $("results-label").textContent = `${visible.length} resultado${visible.length === 1 ? "" : "s"}`;
  const list = $("task-list");
  list.replaceChildren();
  $("empty-state").hidden = visible.length !== 0;

  visible.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.completed;
    check.setAttribute("aria-label", `${task.completed ? "Marcar pendiente" : "Marcar completada"}: ${task.title}`);
    check.addEventListener("change", () => modifyTask(task.id, { completed: check.checked }, "Estado actualizado."));
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title; // Nunca se interpreta el contenido del usuario como HTML.
    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      makeButton("Editar", "small-btn", async () => {
        const updated = prompt("Editar nombre de la tarea:", task.title);
        if (updated === null) return;
        if (!updated.trim() || updated.trim().length > 140) {
          showMessage($("app-message"), "El título debe tener entre 1 y 140 caracteres.", true);
          return;
        }
        await modifyTask(task.id, { title: updated.trim() }, "Tarea editada.");
      }, `Editar ${task.title}`),
      makeButton("Eliminar", "small-btn danger", async () => {
        if (!confirm(`¿Eliminar "${task.title}"?`)) return;
        try {
          await api(`/api/tasks/${task.id}`, { method: "DELETE" });
          await refreshTasks();
          showMessage($("app-message"), "Tarea eliminada.");
        } catch (error) {
          showMessage($("app-message"), error.message, true);
        }
      }, `Eliminar ${task.title}`),
    );
    item.append(check, title, actions);
    list.appendChild(item);
  });
}

$("tab-login").addEventListener("click", () => setAuthMode("login"));
$("tab-register").addEventListener("click", () => setAuthMode("register"));
$("logout-button").addEventListener("click", () => logout());

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("auth-submit");
  const credentials = { email: $("auth-email").value.trim(), password: $("auth-password").value };
  if (state.mode === "register") credentials.name = $("auth-name").value.trim();
  if (state.mode === "register" && !credentials.name) {
    showMessage($("auth-message"), "Escribe tu nombre.", true);
    return;
  }
  if (!$("auth-email").checkValidity() || credentials.password.length < 8) {
    showMessage($("auth-message"), "Comprueba tu correo y una contraseña de al menos 8 caracteres.", true);
    return;
  }
  button.disabled = true;
  try {
    const data = await api(`/api/auth/${state.mode === "register" ? "register" : "login"}`, {
      method: "POST", body: JSON.stringify(credentials),
    });
    await enterApp(data);
  } catch (error) {
    showMessage($("auth-message"), error.message, true);
  } finally {
    button.disabled = false;
  }
});

$("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("task-input").value.trim();
  if (!title) return showMessage($("app-message"), "Escribe el nombre de la tarea.", true);
  const button = $("task-form").querySelector("button");
  button.disabled = true;
  try {
    await api("/api/tasks", { method: "POST", body: JSON.stringify({ title }) });
    $("task-input").value = "";
    await refreshTasks();
    showMessage($("app-message"), "Tarea creada correctamente.");
  } catch (error) {
    showMessage($("app-message"), error.message, true);
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((b) => {
      const active = b === button;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderTasks();
  });
});

$("today-label").textContent = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

// Si existe una sesión, consulta al backend para validar el JWT antes de mostrar datos.
(async () => {
  if (!state.token) return;
  try {
    const data = await api("/api/auth/me");
    await enterApp({ token: state.token, user: data.user });
  } catch (error) {
    logout("Tu sesión terminó. Inicia sesión de nuevo.");
  }
})();
