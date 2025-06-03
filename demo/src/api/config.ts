// Configuration file with side effects only
const API_BASE_URL = "https://api.example.com";

// Set up interceptors or global configuration
if (typeof window !== "undefined") {
  window.__API_CONFIG__ = {
    baseUrl: API_BASE_URL,
    version: "1.0.0",
  };
}

declare global {
  interface Window {
    __API_CONFIG__: {
      baseUrl: string;
      version: string;
    };
  }
}
