figma.showUI(__html__, { width: 360, height: 620, themeColors: true });
let afBusy = false;
const afStatus = (type, text) => figma.ui.postMessage({ type, text });

figma.ui.onmessage = async message => {
  if (afBusy) return;
  if (!message || !["rebuild", "import-svg"].includes(message.type)) return;
  afBusy = true;
  try {
    if (message.type === "rebuild") {
      const result = await afRebuild(message.tokens || AUREFORM_TOKENS, {
        palette: message.palette, mode: message.mode, prefix: message.prefix,
      }, text => afStatus("progress", text));
      const board = await figma.getNodeByIdAsync(result.boardId);
      if (board && "visible" in board) {
        figma.currentPage.selection = [board];
        figma.viewport.scrollAndZoomIntoView([board]);
      }
      afStatus("success", result.reused ? "This board already exists; selected it without changing it." :
        `Created ${result.componentVariants} starter variants and ${result.createdVariableIds.length} variables. Your existing layers are preserved.`);
    } else {
      if (!Array.isArray(message.files) || message.files.length < 1 || message.files.length > 8) {
        throw new Error("Choose between one and eight supplied SVG snapshots.");
      }
      for (const file of message.files) {
        if (typeof file.content !== "string" || file.content.length > 4 * 1024 * 1024 ||
            !file.content.includes("<svg") || /<(script|foreignObject|!DOCTYPE)\b/i.test(file.content) ||
            /(?:href|xlink:href)\s*=\s*["'](?!#|data:)/i.test(file.content) ||
            /url\s*\(\s*["']?(?:https?:|\/\/)/i.test(file.content)) {
          throw new Error("Use the self-contained SVG snapshots supplied with Aureform.");
        }
      }
      const roots = [];
      const page = figma.currentPage;
      let x = Math.max(0, ...page.children.map(node => node.x + node.width)) + 160;
      try {
        for (const file of message.files) {
          const root = figma.createNodeFromSvg(file.content);
          root.name = `Aureform snapshot / ${String(file.name).slice(0, 80)}`;
          page.appendChild(root); root.x = x; root.y = 80;
          x += root.width + 120; roots.push(root);
        }
      } catch (error) {
        roots.forEach(root => root.remove());
        throw error;
      }
      page.selection = roots; figma.viewport.scrollAndZoomIntoView(roots);
      afStatus("success", `Imported ${roots.length} vector snapshots. Outlined text and photos keep their exported form.`);
    }
  } catch (error) {
    afStatus("error", error instanceof Error ? error.message : "The operation could not complete.");
  } finally {
    afBusy = false;
  }
};
