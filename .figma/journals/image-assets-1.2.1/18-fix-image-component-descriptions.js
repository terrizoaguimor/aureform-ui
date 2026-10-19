const page = await figma.getNodeByIdAsync("2:3");
await figma.setCurrentPageAsync(page);
const specs=[
 ["25:585","Aureform Gallery. Native editable controls and captions with generated editorial IMAGE fills from the source collection; six 3:2 thumbnails and a 3:2 full-image preview. Callers without dimensions retain the source default ratio."],
 ["25:511","Aureform Carousel. Native editable manual controls and captions with generated editorial IMAGE fills; native specimens retain the controlled 16:10 crop. Source collection images are 1200 by 800."],
 ["25:638","Aureform VideoPlayer. Native editable playback controls with a generated Quiet forms IMAGE fill for the paused poster. The original vector motion specimen and unavailable fallback are preserved."]
];
const nodes=[];const fonts=new Map();
for(const [id,after] of specs){const n=await figma.getNodeByIdAsync(id);if(n?.type!=="COMPONENT_SET")throw Error("Missing image component set "+id);nodes.push({node:n,before:n.description,after});for(const t of n.findAllWithCriteria({types:["TEXT"]}))for(const s of t.getStyledTextSegments(["fontName"]))fonts.set(JSON.stringify(s.fontName),s.fontName);}
await Promise.all([...fonts.values()].map(f=>figma.loadFontAsync(f)));
const mutatedNodeIds=[];
for(const r of nodes)if(r.before!==r.after){r.node.description=r.after;mutatedNodeIds.push(r.node.id);}
return {status:"affected-image-descriptions-corrected",changes:nodes.map(r=>({id:r.node.id,name:r.node.name,before:r.before,after:r.node.description})),visibleLayoutChanged:false,approvedProofsRemainCurrent:true,createdNodeIds:[],mutatedNodeIds,removedNodeIds:[]};
