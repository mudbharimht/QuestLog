self.addEventListener("install", (event) => {
  console.log("Service worker installed");
});

self.addEventListener("fetch", (event) => {
  // no caching logic yet, just needs to exist to satisfy install requirements
});