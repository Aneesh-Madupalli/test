document.addEventListener("DOMContentLoaded", async () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  const response = await fetch("../assets/navbar.html");
  navbarContainer.innerHTML = await response.text();

  // Bind nav buttons
  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");
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
});
