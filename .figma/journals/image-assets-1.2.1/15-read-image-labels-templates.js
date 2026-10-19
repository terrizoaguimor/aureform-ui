const page = await figma.getNodeByIdAsync("2:5");
await figma.setCurrentPageAsync(page);
const results = [];
for (const id of ["59:3077", "59:3605"]) {
  const root = await figma.getNodeByIdAsync(id);
  if (!root || !("findAllWithCriteria" in root)) throw Error("Missing image-bearing route " + id);
  const matches = root.findAllWithCriteria({types:["TEXT"]}).filter(t => /vector|editorial collection|compositions/i.test(t.characters));
  for (const t of matches) {
    const ancestry=[];
    for(let n=t.parent,depth=0;n && depth<5;n=n.parent,depth++) ancestry.push({id:n.id,type:n.type,name:n.name});
    results.push({id:t.id,text:t.characters,rootId:id,ancestry});
  }
}
return {status:"read-only-image-label-inventory",pageId:page.id,labels:results,createdNodeIds:[],mutatedNodeIds:[],removedNodeIds:[]};
