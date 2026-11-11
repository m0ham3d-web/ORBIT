// ==============================
// ORBIT - Settings
// ==============================

const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem("orbit-theme") || "dark";

body.setAttribute("data-theme", savedTheme);

// Update theme icon
function updateThemeIcon(theme) {
  const icon = themeToggle?.querySelector("i");

  if (!icon) return;

  icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

// Toggle theme
themeToggle?.addEventListener("click", () => {
  const currentTheme = body.getAttribute("data-theme");

  const newTheme = currentTheme === "dark" ? "light" : "dark";

  body.setAttribute("data-theme", newTheme);

  localStorage.setItem("orbit-theme", newTheme);

  updateThemeIcon(newTheme);
});

// Set initial icon
updateThemeIcon(savedTheme);
