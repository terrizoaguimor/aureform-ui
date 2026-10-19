const page = await figma.getNodeByIdAsync("2:3");
await figma.setCurrentPageAsync(page);
figma.skipInvisibleInstanceChildren=false;
const specs=[["28:599","quiet-forms",1.5],["28:607","studio",1.5],["28:615","arc",1.5],["28:624","morrow",1.5],["28:632","silhouette",1.5],["28:640","goodform",1.5],["25:576","quiet-forms",1.5],["25:451","quiet-forms",1.6],["25:472","arc",1.6],["25:492","goodform",1.6],["25:587","quiet-forms",1.7777777777777777]];
const imageHashes={"studio":"0b2c8366dd48d588342f7a28864dffb5bb8f3170","goodform":"b9d975eb69764139d1b96f344f5039f39fcc2710","quiet-forms":"d3ee962499d363e9c65b9535e1d2ae1a4c1615da","morrow":"870cab8b1cd152cadcd34ed22ba97b99ad7f99ae","arc":"504133e4d0fc0cd1edbb0270720c3edbf143459e","silhouette":"1c52aa468aabfe6f3a2edac713a136b616fb1450"};
const areas=[], labelOwners=new Map(), priorAffected=new Set();
for(const [id,assetId,ratio] of specs){
 const n=await figma.getNodeByIdAsync(id);
 if(!n || !("fills" in n) || !("children" in n)) throw Error("Missing image area "+id);
 const fills=n.fills.filter(p=>p.type==="IMAGE");
 const vectors=n.children.filter(c=>c.type==="VECTOR");
 priorAffected.add(n.id);for(const c of vectors) priorAffected.add(c.id);
 areas.push({nodeId:n.id,assetId,imageHash:fills[0]?.imageHash,fillMatches:fills.length===1&&fills[0].imageHash===imageHashes[assetId],width:n.width,height:n.height,expectedRatio:ratio,ratioMatches:Math.abs(n.width/n.height-ratio)<0.01,hiddenVectors:vectors.filter(c=>!c.visible).length,visibleVectors:vectors.filter(c=>c.visible).length});
 for(let p=n.parent;p && p.type!=="PAGE";p=p.parent){if(p.type==="COMPONENT"||p.type==="COMPONENT_SET") labelOwners.set(p.id,p);}
}
const profileMasters=[];
for(const id of ["29:66","29:127"]){
 const n=await figma.getNodeByIdAsync(id);const texts=n.findAllWithCriteria({types:["TEXT"]});
 priorAffected.add(n.id);for(const t of texts)priorAffected.add(t.id);
 profileMasters.push({nodeId:id,imageHash:n.fills.find(p=>p.type==="IMAGE")?.imageHash,initialTextIds:texts.map(t=>t.id),allInitialsHidden:texts.every(t=>!t.visible)});
}
const wrongLabels=[];
for(const n of labelOwners.values()){
 if(/vector|svg/i.test(n.description)) wrongLabels.push({id:n.id,type:n.type,name:n.name,kind:"description",text:n.description});
 for(const t of n.findAllWithCriteria({types:["TEXT"]})) if(/vector|svg/i.test(t.characters)) wrongLabels.push({id:t.id,ownerId:n.id,kind:"text",text:t.characters});
}
const rowSet=await figma.getNodeByIdAsync("31:1504");
if(rowSet?.type!=="COMPONENT_SET") throw Error("Missing ApplicationRecordRow set");
const thumbnailSlots=rowSet.children.map(n=>({variantId:n.id,name:n.name,slots:n.findAllWithCriteria({types:["FRAME"]}).filter(c=>c.name==="Product thumbnail").map(c=>({id:c.id,width:c.width,height:c.height,visible:c.visible,references:c.componentPropertyReferences})),propertyKeys:Object.keys(rowSet.componentPropertyDefinitions)}));
const avatar=await figma.getNodeByIdAsync("3:149");
const avatarFallbacks=avatar.children.map(n=>({id:n.id,name:n.name,imageFills:n.fills.filter(p=>p.type==="IMAGE").length}));
const collections=await figma.variables.getLocalVariableCollectionsAsync();
return {status:"scoped-current-native-image-master-inspection",pageId:page.id,areas,profileMasters,wrongLabels,thumbnailSlots,avatarFallbacks,collections:collections.map(c=>({id:c.id,name:c.name})),observedPriorMutatedNodeIds:[...priorAffected],createdNodeIds:[],mutatedNodeIds:[],removedNodeIds:[]};
