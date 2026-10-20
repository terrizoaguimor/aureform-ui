export function excludeQualitySource(path) {
  return (
    path === "public/build-info.json" ||
    /^public\/build-info\.json\.[^.]+\.tmp$/.test(path) ||
    path === "docs/quality/lighthouse/.import.lock" ||
    (path.startsWith("docs/quality/lighthouse/") &&
      path !== "docs/quality/lighthouse/index.json")
  );
}
