// ==============================
// ORBIT - Navigation System
// ==============================

const sidebar = document.querySelector(".sidebar");
const menuToggle = document.getElementById("menuToggle");

const navLinks = document.querySelectorAll(".nav-link");
const pageTitle = document.getElementById("pageTitle");

// Page Titles
const pageTitles = {
  dashboard: "Dashboard",
  tasks: "Task Manager",
  projects: "Projects",
  calendar: "Calendar",
  focus: "Focus Mode",
  analytics: "Analytics",
  settings: "Settings",
};

// ==============================
// Sidebar Toggle
// ==============================

menuToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  sidebar?.classList.toggle("active");
});

// Close Sidebar Outside Click
document.addEventListener("click", (event) => {
  if (
    sidebar &&
    menuToggle &&
    !sidebar.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    sidebar.classList.remove("active");
  }
});

// Close Sidebar With Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    sidebar?.classList.remove("active");
  }
});

// ==============================
// Page Navigation
// ==============================

function navigateToPage(page, updateHistory = true) {
  const targetPage = document.getElementById(page);

  // Don't navigate to a page that doesn't exist
  if (!targetPage) {
    console.warn(`ORBIT: Page "${page}" does not exist.`);
    return;
  }

  // Hide all pages
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected page
  targetPage.classList.add("active");

  // Update active navigation link
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  // Update page title
  if (pageTitle) {
    pageTitle.textContent = pageTitles[page] || page;
  }

  // Update browser URL
  if (updateHistory) {
    history.pushState({ page }, "", `#${page}`);
  }

  // Close mobile sidebar
  sidebar?.classList.remove("active");
}

// Navigation Link Events
navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const page = link.dataset.page;

    if (page) {
      navigateToPage(page);
    }
  });
});

// ==============================
// Browser Back / Forward
// ==============================

window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  navigateToPage(page, false);
});

// ==============================
// Initial Page
// ==============================

const initialPage = location.hash.replace("#", "") || "dashboard";

navigateToPage(initialPage, false);
