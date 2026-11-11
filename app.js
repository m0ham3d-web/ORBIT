(() => {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const STORAGE_KEY = "orbit-workspace-v1";
  const THEME_KEY = "orbit-theme";
  const uid = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const seed = {
    projects: [
      {
        id: "p-personal",
        name: "Personal growth",
        description: "Small steps toward bigger goals.",
        createdAt: Date.now(),
      },
      {
        id: "p-work",
        name: "Website launch",
        description: "Build and polish the next web experience.",
        createdAt: Date.now(),
      },
    ],
    tasks: [
      {
        id: "t-1",
        title: "Plan the week ahead",
        description: "Choose the three most important outcomes.",
        priority: "high",
        status: "todo",
        dueDate: todayISO(),
        projectId: "p-personal",
        createdAt: Date.now(),
      },
      {
        id: "t-2",
        title: "Review landing page layout",
        description: "Check spacing, hierarchy, and mobile behavior.",
        priority: "medium",
        status: "progress",
        dueDate: "",
        projectId: "p-work",
        createdAt: Date.now(),
      },
      {
        id: "t-3",
        title: "Organize workspace",
        description: "Create a clear home for ongoing work.",
        priority: "low",
        status: "completed",
        dueDate: "",
        projectId: "p-personal",
        createdAt: Date.now(),
      },
    ],
  };
  let data = loadData();
  let currentPage = location.hash.slice(1) || "dashboard";
  let calendarDate = new Date();
  let timerSeconds = 25 * 60,
    timerInitial = 25 * 60,
    timerInterval = null;

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.projects))
        return saved;
    } catch (error) {
      console.warn("Could not read ORBIT data:", error);
    }
    return structuredClone(seed);
  }
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => el.classList.remove("show"), 2300);
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const isDark = theme === "dark";
    $("#themeToggle").textContent = isDark ? "☼" : "☾";
    $("#themeSwitch").setAttribute("aria-checked", String(isDark));
  }
  setTheme(localStorage.getItem(THEME_KEY) || "dark");
  $("#themeToggle").addEventListener("click", () =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  );
  $("#themeSwitch").addEventListener("click", () =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  );

  function navigate(page) {
    if (!document.getElementById(page)) return;
    currentPage = page;
    $$(".page-section").forEach((section) =>
      section.classList.toggle("active", section.id === page),
    );
    $$(".nav-link[data-page]").forEach((link) =>
      link.classList.toggle("active", link.dataset.page === page),
    );
    $("#pageTitle").textContent =
      {
        dashboard: "Overview",
        tasks: "My Tasks",
        projects: "Projects",
        calendar: "Calendar",
        focus: "Focus Room",
        analytics: "Analytics",
        settings: "Settings",
      }[page] || page;
    history.replaceState(null, "", `#${page}`);
    $("#sidebar").classList.remove("open");
    if (page === "calendar") renderCalendar();
    if (page === "analytics") renderAnalytics();
  }
  $$(".nav-link[data-page]").forEach((link) =>
    link.addEventListener("click", () => navigate(link.dataset.page)),
  );
  $$("[data-go]").forEach((button) =>
    button.addEventListener("click", () => navigate(button.dataset.go)),
  );
  window.addEventListener("hashchange", () =>
    navigate(location.hash.slice(1) || "dashboard"),
  );
  $("#menuBtn").addEventListener("click", () =>
    $("#sidebar").classList.toggle("open"),
  );
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 760 &&
      !$("#sidebar").contains(e.target) &&
      !$("#menuBtn").contains(e.target)
    )
      $("#sidebar").classList.remove("open");
  });
  $("#quickFocusBtn").addEventListener("click", () => navigate("focus"));

  const taskModal = $("#taskModal"),
    projectModal = $("#projectModal");
  function openTaskModal(task = null) {
    $("#taskForm").reset();
    $("#editTaskId").value = task?.id || "";
    $("#taskModalTitle").textContent = task ? "Edit task" : "Create a task";
    $("#taskTitle").value = task?.title || "";
    $("#taskDescription").value = task?.description || "";
    $("#taskPriority").value = task?.priority || "medium";
    $("#taskStatus").value = task?.status || "todo";
    $("#taskDate").value = task?.dueDate || "";
    $("#taskProject").value = task?.projectId || "";
    taskModal.classList.add("open");
    taskModal.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#taskTitle").focus(), 50);
  }
  function closeModal(modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  $$("[data-open-task]").forEach((button) =>
    button.addEventListener("click", () => openTaskModal()),
  );
  $$("[data-close-modal]").forEach((button) =>
    button.addEventListener("click", () => closeModal(taskModal)),
  );
  taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) closeModal(taskModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(taskModal);
      closeModal(projectModal);
    }
  });

  $("#taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#editTaskId").value;
    const previous = data.tasks.find((task) => task.id === id);
    const task = {
      id: id || uid(),
      title: $("#taskTitle").value.trim(),
      description: $("#taskDescription").value.trim(),
      priority: $("#taskPriority").value,
      status: $("#taskStatus").value,
      dueDate: $("#taskDate").value,
      projectId: $("#taskProject").value,
      createdAt: previous?.createdAt || Date.now(),
    };
    if (!task.title) return;
    if (previous)
      data.tasks = data.tasks.map((item) => (item.id === id ? task : item));
    else data.tasks.unshift(task);
    saveData();
    closeModal(taskModal);
    renderAll();
    toast(previous ? "Task updated" : "Task created");
  });

  function renderProjectOptions() {
    const options = data.projects
      .map(
        (project) =>
          `<option value="${escapeHTML(project.id)}">${escapeHTML(project.name)}</option>`,
      )
      .join("");
    $("#taskProject").innerHTML =
      `<option value="">No project</option>${options}`;
    const current = $("#projectFilter").value;
    $("#projectFilter").innerHTML =
      `<option value="all">All projects</option>${options}`;
    $("#projectFilter").value = data.projects.some((p) => p.id === current)
      ? current
      : "all";
  }
  function projectName(id) {
    return data.projects.find((p) => p.id === id)?.name || "No project";
  }
  function taskCard(task) {
    return `<article class="task-card" draggable="true" data-task-id="${escapeHTML(task.id)}">
      <div><span class="priority-tag priority-${task.priority}">${task.priority} priority</span></div>
      <h3>${escapeHTML(task.title)}</h3>${task.description ? `<p>${escapeHTML(task.description)}</p>` : ""}
      <div class="task-meta"><span>${escapeHTML(projectName(task.projectId))}</span><span>${task.dueDate ? `Due ${escapeHTML(task.dueDate)}` : "No due date"}</span></div>
      <div class="task-card-footer"><select aria-label="Change task status" data-status-select="${escapeHTML(task.id)}"><option value="todo" ${task.status === "todo" ? "selected" : ""}>To do</option><option value="progress" ${task.status === "progress" ? "selected" : ""}>In progress</option><option value="completed" ${task.status === "completed" ? "selected" : ""}>Completed</option></select><div class="card-actions"><button class="mini-btn" data-edit="${escapeHTML(task.id)}" aria-label="Edit task">✎</button><button class="mini-btn" data-delete="${escapeHTML(task.id)}" aria-label="Delete task">×</button></div></div>
    </article>`;
  }
  function filteredTasks() {
    const query = $("#taskSearch").value.trim().toLowerCase();
    const priority = $("#priorityFilter").value,
      project = $("#projectFilter").value;
    return data.tasks.filter(
      (task) =>
        (!query ||
          `${task.title} ${task.description}`.toLowerCase().includes(query)) &&
        (priority === "all" || task.priority === priority) &&
        (project === "all" || task.projectId === project),
    );
  }
  function renderTasks() {
    const tasks = filteredTasks();
    const groups = {
      todo: $("#todoList"),
      progress: $("#progressList"),
      completed: $("#completedList"),
    };
    Object.entries(groups).forEach(([status, element]) => {
      const matching = tasks.filter((task) => task.status === status);
      element.innerHTML = matching.length
        ? matching.map(taskCard).join("")
        : `<div class="empty-state">Nothing here yet</div>`;
      const countId =
        status === "todo"
          ? "todoCount"
          : status === "progress"
            ? "progressCount"
            : "completedCount";
      $("#" + countId).textContent = matching.length;
    });
    $("#navTaskCount").textContent = data.tasks.filter(
      (t) => t.status !== "completed",
    ).length;
    $$("#tasks [data-edit]").forEach((btn) =>
      btn.addEventListener("click", () =>
        openTaskModal(data.tasks.find((t) => t.id === btn.dataset.edit)),
      ),
    );
    $$("#tasks [data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const task = data.tasks.find((t) => t.id === btn.dataset.delete);
        if (task && confirm(`Delete "${task.title}"?`)) {
          data.tasks = data.tasks.filter((t) => t.id !== task.id);
          saveData();
          renderAll();
          toast("Task deleted");
        }
      }),
    );
    $$("[data-status-select]").forEach((select) =>
      select.addEventListener("change", () => {
        const task = data.tasks.find(
          (t) => t.id === select.dataset.statusSelect,
        );
        if (task) {
          task.status = select.value;
          saveData();
          renderAll();
          toast("Task moved");
        }
      }),
    );
    $$(".task-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.dataset.taskId);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    $$(".task-list").forEach((list) => {
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      list.addEventListener("drop", (e) => {
        e.preventDefault();
        const task = data.tasks.find(
          (t) => t.id === e.dataTransfer.getData("text/plain"),
        );
        if (task) {
          task.status = list.dataset.status;
          saveData();
          renderAll();
          toast("Task moved");
        }
      });
    });
  }
  $("#taskSearch").addEventListener("input", renderTasks);
  $("#priorityFilter").addEventListener("change", renderTasks);
  $("#projectFilter").addEventListener("change", renderTasks);
  $("#clearFilters").addEventListener("click", () => {
    $("#taskSearch").value = "";
    $("#priorityFilter").value = "all";
    $("#projectFilter").value = "all";
    renderTasks();
  });

  $("#addProjectBtn").addEventListener("click", () => {
    $("#projectForm").reset();
    projectModal.classList.add("open");
  });
  $$("[data-close-project]").forEach((btn) =>
    btn.addEventListener("click", () => closeModal(projectModal)),
  );
  projectModal.addEventListener("click", (e) => {
    if (e.target === projectModal) closeModal(projectModal);
  });
  $("#projectForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#projectName").value.trim();
    if (!name) return;
    data.projects.push({
      id: uid(),
      name,
      description: $("#projectDescription").value.trim(),
      createdAt: Date.now(),
    });
    saveData();
    closeModal(projectModal);
    renderAll();
    toast("Project created");
  });
  function renderProjects() {
    $("#projectGrid").innerHTML = data.projects.length
      ? data.projects
          .map((project) => {
            const tasks = data.tasks.filter((t) => t.projectId === project.id),
              done = tasks.filter((t) => t.status === "completed").length,
              percent = tasks.length
                ? Math.round((done / tasks.length) * 100)
                : 0;
            return `<article class="project-card"><div class="project-color">▦</div><h3>${escapeHTML(project.name)}</h3><p>${escapeHTML(project.description || "No description added.")}</p><div class="project-progress"><span style="width:${percent}%"></span></div><div class="project-foot"><span>${done} of ${tasks.length} completed</span><b>${percent}%</b></div></article>`;
          })
          .join("")
      : `<div class="empty-state">Create your first project to organize your work.</div>`;
  }

  function renderDashboard() {
    const total = data.tasks.length,
      done = data.tasks.filter((t) => t.status === "completed").length,
      progress = data.tasks.filter((t) => t.status === "progress").length,
      rate = total ? Math.round((done / total) * 100) : 0;
    $("#statTotal").textContent = total;
    $("#statProgress").textContent = progress;
    $("#statCompleted").textContent = done;
    $("#statRate").textContent = rate + "%";
    $("#ringValue").textContent = rate + "%";
    $("#ringCount").textContent = `${done} ${done === 1 ? "task" : "tasks"}`;
    $("#progressRing").style.background =
      `conic-gradient(var(--accent) ${rate * 3.6}deg, var(--surface3) 0deg)`;
    const priorities = data.tasks
      .filter((t) => t.status !== "completed")
      .sort(
        (a, b) =>
          ({ high: 0, medium: 1, low: 2 })[a.priority] -
          { high: 0, medium: 1, low: 2 }[b.priority],
      )
      .slice(0, 4);
    $("#priorityPreview").classList.toggle("empty-state", !priorities.length);
    $("#priorityPreview").innerHTML = priorities.length
      ? priorities
          .map(
            (t) =>
              `<div class="preview-item"><span class="column-dot ${t.priority === "high" ? "todo-dot" : t.priority === "medium" ? "progress-dot" : "done-dot"}"></span><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(projectName(t.projectId))}</small></div><span class="priority-tag priority-${t.priority}">${t.priority}</span></div>`,
          )
          .join("")
      : "No active tasks. Add one to get started.";
    const upcoming = data.tasks
      .filter((t) => t.status !== "completed" && t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);
    $("#upcomingList").classList.toggle("empty-state", !upcoming.length);
    $("#upcomingList").innerHTML = upcoming.length
      ? upcoming
          .map((t) => {
            const d = new Date(t.dueDate + "T00:00:00");
            return `<div class="upcoming-item"><div class="date-chip"><b>${d.getDate()}</b><small>${d.toLocaleString("en", { month: "short" })}</small></div><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(projectName(t.projectId))}</small></div></div>`;
          })
          .join("")
      : "Nothing scheduled yet.";
    $("#todayLabel").textContent = new Date()
      .toLocaleDateString("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
      .toUpperCase();
  }
  function renderCalendar() {
    const year = calendarDate.getFullYear(),
      month = calendarDate.getMonth();
    $("#calendarMonth").textContent = calendarDate.toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    const first = new Date(year, month, 1),
      start = first.getDay(),
      days = new Date(year, month + 1, 0).getDate(),
      prevDays = new Date(year, month, 0).getDate();
    const today = todayISO();
    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map((d) => `<div class="calendar-day-label">${d}</div>`)
      .join("");
    for (let i = 0; i < 42; i++) {
      let dateNum,
        date,
        outside = false;
      if (i < start) {
        dateNum = prevDays - start + i + 1;
        date = new Date(year, month - 1, dateNum);
        outside = true;
      } else if (i >= start + days) {
        dateNum = i - start - days + 1;
        date = new Date(year, month + 1, dateNum);
        outside = true;
      } else {
        dateNum = i - start + 1;
        date = new Date(year, month, dateNum);
      }
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const events = data.tasks.filter((t) => t.dueDate === iso);
      html += `<div class="calendar-cell ${outside ? "muted-day" : ""} ${iso === today ? "today" : ""}"><span class="day-num">${dateNum}</span>${events
        .slice(0, 2)
        .map(
          (t) =>
            `<span class="calendar-event" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>`,
        )
        .join("")}</div>`;
    }
    $("#calendarGrid").innerHTML = html;
  }
  $("#prevMonth").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  $("#nextMonth").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
  function renderAnalytics() {
    const total = data.tasks.length,
      done = data.tasks.filter((t) => t.status === "completed").length,
      active = total - done;
    $("#analyticsTotal").textContent = total;
    $("#analyticsDone").textContent = done;
    $("#analyticsActive").textContent = active;
    const rows = [
        ["To do", data.tasks.filter((t) => t.status === "todo").length],
        [
          "In progress",
          data.tasks.filter((t) => t.status === "progress").length,
        ],
        ["Completed", done],
      ],
      max = Math.max(1, ...rows.map((r) => r[1]));
    $("#analyticsChart").innerHTML = rows
      .map(
        ([name, value]) =>
          `<div class="bar-row"><span>${name}</span><div class="bar-track"><span style="width:${(value / max) * 100}%"></span></div><b>${value}</b></div>`,
      )
      .join("");
  }

  function renderAll() {
    renderProjectOptions();
    renderTasks();
    renderProjects();
    renderDashboard();
    renderCalendar();
    renderAnalytics();
  }
  $("#globalSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      navigate("tasks");
      $("#taskSearch").value = e.target.value;
      renderTasks();
    }
  });
  $("#notificationBtn").addEventListener("click", () =>
    toast("You're all caught up."),
  );
  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `orbit-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exported");
  });
  $("#importInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.tasks) || !Array.isArray(imported.projects))
        throw new Error("Invalid backup");
      data = imported;
      saveData();
      renderAll();
      toast("Workspace imported");
    } catch (error) {
      alert("This file doesn't look like a valid ORBIT backup.");
    }
    e.target.value = "";
  });
  $("#resetBtn").addEventListener("click", () => {
    if (
      confirm(
        "This will permanently clear all ORBIT tasks and projects saved in this browser. Continue?",
      )
    ) {
      data = { tasks: [], projects: [] };
      saveData();
      renderAll();
      toast("Workspace reset");
    }
  });

  function updateTimer() {
    const m = Math.floor(timerSeconds / 60),
      s = timerSeconds % 60;
    $("#timerDisplay").textContent =
      `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  $("#timerStart").addEventListener("click", () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      $("#timerStart").textContent = "Resume";
      $("#timerStatus").textContent = "Paused — take a breath";
      return;
    }
    if (timerSeconds <= 0) timerSeconds = timerInitial;
    $("#timerStart").textContent = "Pause";
    $("#timerStatus").textContent = "Stay with one thing";
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimer();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        $("#timerStart").textContent = "Start again";
        $("#timerStatus").textContent = "Session complete. Nice work.";
        toast("Focus session complete");
      }
    }, 1000);
  });
  $("#timerReset").addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = timerInitial;
    updateTimer();
    $("#timerStart").textContent = "Start session";
    $("#timerStatus").textContent = "Ready when you are";
  });
  $$(".preset").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".preset").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      timerInitial = Number(btn.dataset.minutes) * 60;
      $("#timerReset").click();
    }),
  );

  renderAll();
  navigate(currentPage);
})();
