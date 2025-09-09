document.addEventListener("DOMContentLoaded", async () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  // ✅ Load navbar from assets
  const response = await fetch("../assets/navbar.html");
  navbarContainer.innerHTML = await response.text();

  // Highlight current page
  const currentPage = window.location.pathname.split("/").pop().replace(".html", "");
  const buttons = navbarContainer.querySelectorAll(".nav-links button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetPage = btn.getAttribute("data-page");
      window.electronAPI.navigate(targetPage);
    });
    if (btn.getAttribute("data-page") === currentPage) {
      btn.classList.add("active");
    }
  });

  // ✅ Window control buttons
  document.getElementById("min-btn")?.addEventListener("click", () => {
    window.electronAPI.windowControl("minimize");
  });

  const maxBtn = document.getElementById("max-btn");
  maxBtn?.addEventListener("click", () => {
    window.electronAPI.windowControl("maximize");
  });

  document.getElementById("close-btn")?.addEventListener("click", () => {
    window.electronAPI.windowControl("close");
  });

  // ✅ Update maximize/restore icon
  window.electronAPI.onWindowState((state) => {
    if (maxBtn) {
      maxBtn.textContent = state.isMaximized ? "🗗" : "🗖";
    }
  });
});
