const page = await figma.getNodeByIdAsync("2:5");
await figma.setCurrentPageAsync(page);
const node = await figma.getNodeByIdAsync("I59:3078;29:224;59:3252;29:137");
if (node?.type !== "TEXT") throw Error("Missing Media description text");
const before = node.characters;
const after = "A prepared GPT Image 2.5 editorial collection, a controlled carousel and an accessible video pattern.";
if (before !== "Original vector compositions, a controlled carousel and an accessible video pattern." && before !== after) throw Error("Unexpected Media description drift");
const fonts = new Map(node.getStyledTextSegments(["fontName"]).map(s => [JSON.stringify(s.fontName),s.fontName]));
await Promise.all([...fonts.values()].map(f => figma.loadFontAsync(f)));
const mutatedNodeIds=[];
if(before !== after){node.characters=after;mutatedNodeIds.push(node.id);}
return {status:"native-media-description-matches-current-source",rootId:"59:3077",textNodeId:node.id,before,after:node.characters,fonts:[...fonts.values()],source:{file:"src/components/templates/media-studio.tsx",export:"MediaTemplate"},createdNodeIds:[],mutatedNodeIds,removedNodeIds:[]};
