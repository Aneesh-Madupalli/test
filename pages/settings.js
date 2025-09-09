document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("protectionToggle");

  if (toggle) {
    toggle.addEventListener("change", (e) => {
      window.electronAPI.setContentProtection(e.target.checked);
    });
  }
});
