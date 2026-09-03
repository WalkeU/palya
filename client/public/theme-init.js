(function () {
  try {
    if (window.localStorage.getItem("pálya-theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
