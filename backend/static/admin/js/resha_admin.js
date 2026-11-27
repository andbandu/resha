"use strict";
document.addEventListener("DOMContentLoaded", function () {
  const navFilter = document.getElementById("nav-filter");
  if (navFilter) {
    document.addEventListener("keydown", function (event) {
      const target = event.target;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (event.key === "/" && !isInput) {
        event.preventDefault();
        navFilter.focus();
        navFilter.select();
      }
    });
  }
});
