const assets = [{"id":"alex-morgan","componentId":"263:68","imageHash":"2c7528dec15140ffbebceeb2a78025b96428c271","width":320,"height":320},{"id":"isabel-torres","componentId":"263:73","imageHash":"6bf889679118fd210044ac5e43b1e9944ae914a4","width":320,"height":320},{"id":"leo-martin","componentId":"263:78","imageHash":"7758199bc9ce6da235dc3d679883f5036f9a0c71","width":320,"height":320},{"id":"noor-ahmed","componentId":"263:83","imageHash":"a64136c4ba472ed9e749386d8ef91af3c04238b1","width":320,"height":320},{"id":"daniel-kim","componentId":"263:89","imageHash":"5011e8f43093fa7deee428cab1bee5d36b6681f6","width":320,"height":320},{"id":"olivia-rhye","componentId":"263:94","imageHash":"f6f60f23b3c2b3c7ecbcc2bf90c3ad2847552d47","width":320,"height":320},{"id":"phoenix-baker","componentId":"263:100","imageHash":"1d1c05788234cbd1faf5eb04ec531f4ef5f35ef3","width":320,"height":320},{"id":"lana-steiner","componentId":"263:105","imageHash":"d49a4b21a39ddbe62f17daf4db0efb3438d4b68f","width":320,"height":320},{"id":"demi-wilkinson","componentId":"263:111","imageHash":"5838e6e15a438650cf1c7f78c4430e29d781635a","width":320,"height":320},{"id":"drew-cano","componentId":"263:116","imageHash":"c0c37b01351c1d99b3014b8557eae595483e24f2","width":320,"height":320},{"id":"amelia-wilson","componentId":"263:121","imageHash":"28b4c0675b57f157771f4ae29211b0a165e0fd41","width":320,"height":320},{"id":"matias-vega","componentId":"263:126","imageHash":"31c807a80f6a2261abe0c2b47bb5f7cff572dc7d","width":320,"height":320},{"id":"sofia-chen","componentId":"263:133","imageHash":"9bfc4a480ec020ec05bea8e99dae5905ddce14ac","width":320,"height":320},{"id":"lucas-moreau","componentId":"263:138","imageHash":"ef6d2bd891c047313c51e3c9f305f6969fb1c7e4","width":320,"height":320},{"id":"alex-rivera","componentId":"263:143","imageHash":"d9e57517823be59ba730bf6a35d0e13c2481fc0b","width":320,"height":320},{"id":"isabel-moreno","componentId":"263:148","imageHash":"23cf857ffa9568c3956420c3e689b760fd88d958","width":320,"height":320},{"id":"studio-updates","componentId":"263:154","imageHash":"2a63ece2eae7f36c9e8f859cc8e565f9be34a1e2","width":320,"height":320},{"id":"forma-collective","componentId":"263:159","imageHash":"0eddd2ae0eb85055505b22e9fda84d2a789a35ee","width":320,"height":320},{"id":"forma-desk-lamp","componentId":"263:168","imageHash":"ca70e156edacee34350c8ad00e54a8d6d432972c","width":640,"height":640},{"id":"arc-lounge-chair","componentId":"263:173","imageHash":"2e682f7c926a88b50f17986426da6a9a9ed08d6d","width":640,"height":640},{"id":"linea-notebook","componentId":"263:178","imageHash":"b38bc8c112d6c9bd45d845ca611f08ba1b786a42","width":640,"height":640},{"id":"studio-tote","componentId":"263:183","imageHash":"e29da841582c6513bfc2dd836bd3bb2883a33202","width":640,"height":640},{"id":"morrow-ceramic-cup","componentId":"263:190","imageHash":"5ddca27502ef2e18221fbf3b3dcae433edd95765","width":640,"height":640},{"id":"silhouette-vase","componentId":"263:195","imageHash":"287b8f7ab0c61af5199361eb7083c61cc4217039","width":640,"height":640},{"id":"fold-side-table","componentId":"263:200","imageHash":"a6514bffc89cc48bc3d7ab44288de4dba3972f95","width":640,"height":640},{"id":"essential-wall-print","componentId":"263:205","imageHash":"3c658c2c63a3fe933f9245bb7c657b7df35937b1","width":640,"height":640},{"id":"quiet-forms","componentId":"263:214","imageHash":"a3c02a577b4e27ee0208f50cb3270486dd73e578","width":1200,"height":800},{"id":"studio","componentId":"263:219","imageHash":"53f32a876426c4ef09c91ffda1c2ff4437bdcb91","width":1200,"height":800},{"id":"arc","componentId":"263:224","imageHash":"a9685c2ff7b74545ff65fbebeae1bb9872905c47","width":1200,"height":800},{"id":"morrow","componentId":"263:230","imageHash":"04bf5d74488f615e40c0b24454ac371d3ad1d62c","width":1200,"height":800},{"id":"silhouette","componentId":"263:236","imageHash":"cedf3fc248cd04d3eed85f02cc536fd909dc7313","width":1200,"height":800},{"id":"goodform","componentId":"263:241","imageHash":"de3f8487fc3cb9f210b8eec0b73fe19edc69ef6e","width":1200,"height":800}];
const page = await figma.getNodeByIdAsync("263:59");
if (!page || page.type !== "PAGE") throw Error("Missing recorded image page");
await figma.setCurrentPageAsync(page);
const board = await figma.getNodeByIdAsync("263:60");
const shelf = await figma.getNodeByIdAsync("263:63");
if (!board || !shelf) throw Error("Missing recorded board or masters");
const fonts = new Map();
for (const node of board.findAllWithCriteria({ types: ["TEXT"] }))
  for (const segment of node.getStyledTextSegments(["fontName"]))
    fonts.set(JSON.stringify(segment.fontName), segment.fontName);
await Promise.all([...fonts.values()].map(font => figma.loadFontAsync(font)));
const results = await Promise.all(assets.map(async asset => {
  const node = await figma.getNodeByIdAsync(asset.componentId);
  if (!node || node.type !== "COMPONENT") throw Error("Missing asset component " + asset.id);
  const fill = node.fills.find(p => p.type === "IMAGE");
  if (!fill || fill.imageHash !== asset.imageHash) throw Error("Durable fill mismatch " + asset.id);
  const image = figma.getImageByHash(fill.imageHash);
  if (!image) throw Error("Missing stored image " + asset.id);
  const size = await image.getSizeAsync();
  if (size.width !== asset.width || size.height !== asset.height)
    throw Error("Decoded image dimensions changed " + asset.id);
  return { id: asset.id, componentId: node.id, imageHash: fill.imageHash, decodedWidth: size.width, decodedHeight: size.height };
}));
const background = await figma.variables.getVariableByIdAsync("VariableID:2:37");
if (!background) throw Error("Missing existing background variable");
const mutated = new Set([board.id]);
board.placeholder = false;
const groupSpecs = [
  ["avatars", "263:64"], ["products", "263:164"], ["art", "263:210"],
];
const groups = [];
for (const [name, id] of groupSpecs) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node || node.type !== "FRAME") throw Error("Missing recorded group " + name);
  node.fills = [figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", background)];
  mutated.add(node.id);
  figma.io.write("images-1.2.1-" + name + ".png", await node.exportAsync({
    format: "PNG", constraint: { type: "SCALE", value: 1 },
  }));
  groups.push({ group: name, id, width: node.width, height: node.height });
}
const trees = [board, ...board.findAll(() => true), shelf, ...shelf.findAll(() => true)];
return {
  status: "32-durable-assets-decoded-native-board-awaiting-owner-review",
  pageId: page.id, boardId: board.id, groups, assets: results,
  componentCount: shelf.findAllWithCriteria({ types: ["COMPONENT"] }).length,
  imageFillNodes: trees.filter(n => "fills" in n && Array.isArray(n.fills) &&
    n.fills.some(p => p.type === "IMAGE")).length,
  uniqueImageHashes: [...new Set(results.map(a => a.imageHash))].length,
  fontFamilies: [...new Set([...fonts.values()].map(f => f.family))],
  wholeUiRasterCount: 0,
  createdNodeIds: [], mutatedNodeIds: [...mutated],
};
