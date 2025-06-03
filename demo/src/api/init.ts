// Initialization file with side effects but no exports
console.log("API module initialized");

// Configure global fetch settings
if (typeof globalThis !== "undefined" && globalThis.fetch) {
  // Add any global API configuration here
}

// Set up error handling
window.addEventListener("unhandledrejection", (event) => {
  console.error("API Error:", event.reason);
});
