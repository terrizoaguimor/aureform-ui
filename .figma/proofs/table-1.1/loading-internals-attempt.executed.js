const page=await figma.getNodeByIdAsync('2:3');
if(!page||page.type!=='PAGE')throw new Error('Core page unavailable');
await figma.setCurrentPageAsync(page);
const ids=['164:1465','164:2869','164:4273','164:5677'];
const roots=await Promise.all(ids.map(id=>figma.getNodeByIdAsync(id)));
const box=n=>[n.x,n.y,n.width,n.height];
const parts=[];
const fonts=new Map();
for(const root of roots){
 if(!root||root.type!=='COMPONENT'||root.parent?.id!=='23:443'||root.variantProperties.State!=='Loading'||root.variantProperties.Density!=='Comfortable')throw new Error('Unexpected Loading scope');
 const body=root.children.find(n=>n.name==='Table / loading body');
 const footer=root.children.find(n=>n.name==='Table / pagination');
 if(!body||!footer||!('children'in body)||body.children.length!==5||body.children.some(n=>n.type!=='INSTANCE'||n.children.length!==3||n.children.some(c=>c.type!=='RECTANGLE')))throw new Error('Expected five linked three-bar Skeletons');
 for(const text of root.findAllWithCriteria({types:['TEXT']}))for(const segment of text.getStyledTextSegments(['fontName']))fonts.set(JSON.stringify(segment.fontName),segment.fontName);
 const mains=await Promise.all(body.children.map(n=>n.getMainComponentAsync()));
 if(mains.some(n=>!n||n.id!=='24:502'||n.parent?.id!=='24:512'))throw new Error('Skeleton main link changed');
 parts.push({root,body,footer,before:{root:box(root),body:box(body),footer:box(footer)},instances:[...body.children]});
}
await Promise.all([...fonts.values()].map(font=>figma.loadFontAsync(font)));
const main=await figma.getNodeByIdAsync('24:502');
const masterSnapshot=()=>JSON.stringify({id:main.id,box:box(main),layoutMode:main.layoutMode,gap:main.itemSpacing,padding:[main.paddingTop,main.paddingRight,main.paddingBottom,main.paddingLeft],bindings:main.boundVariables,children:main.children.map(n=>({id:n.id,box:box(n),bindings:n.boundVariables}))});
const masterBefore=masterSnapshot();
const mutated=new Set();
for(const part of parts)for(const instance of part.instances){
 for(const field of ['itemSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','height'])if(instance.boundVariables?.[field])instance.setBoundVariable(field,null);
 instance.itemSpacing=4;
 instance.paddingTop=0;instance.paddingRight=0;instance.paddingBottom=0;instance.paddingLeft=0;
 mutated.add(instance.id);
 for(const bar of instance.children){
  if(bar.boundVariables?.height)bar.setBoundVariable('height',null);
  bar.resize(bar.width,8);
  bar.layoutSizingVertical='FIXED';
  mutated.add(bar.id);
 }
 instance.resize(instance.width,32);
 instance.layoutSizingHorizontal='FIXED';instance.layoutSizingVertical='FIXED';
}
const failures=[];
const variants=[];
for(const part of parts){
 const {root,body,footer,instances,before}=part;
 const after={root:box(root),body:box(body),footer:box(footer)};
 if(JSON.stringify(before)!==JSON.stringify(after))failures.push(root.id+': outer geometry changed');
 const rows=[];
 for(const instance of instances){
  const linked=await instance.getMainComponentAsync();
  const bars=instance.children.map(n=>[n.id,n.x,n.y,n.width,n.height]);
  const bottom=Math.max(...instance.children.map(n=>n.y+n.height));
  if(linked?.id!=='24:502'||instance.height!==32||bottom>32.01||instance.children.some(n=>n.height!==8)||instance.itemSpacing!==4||[instance.paddingTop,instance.paddingRight,instance.paddingBottom,instance.paddingLeft].some(v=>v!==0))failures.push(instance.id+': local geometry or main link mismatch');
  rows.push({id:instance.id,mainId:linked?.id,bounds:box(instance),contentBottom:bottom,bars});
 }
 const last=instances[instances.length-1];
 const lastBarBottom=body.y+last.y+Math.max(...last.children.map(n=>n.y+n.height));
 if(lastBarBottom>footer.y)failures.push(root.id+': footer overlap');
 variants.push({id:root.id,appearance:root.variantProperties.Appearance,state:root.variantProperties.State,density:root.variantProperties.Density,bodyId:body.id,footerId:footer.id,before,after,lastBarBottom,footerTop:footer.y,footerClearance:footer.y-lastBarBottom,skeletons:rows});
}
const propagatedNodeIds=[];
const reviewProof=[];
for(const id of ['169:3437','169:3518']){
 const root=await figma.getNodeByIdAsync(id);
 if(!root||root.type!=='INSTANCE'){failures.push(id+': review instance missing');continue;}
 const body=root.children.find(n=>n.name==='Table / loading body');
 const footer=root.children.find(n=>n.name==='Table / pagination');
 if(!body||!footer||!('children'in body)||body.children.length!==5){failures.push(id+': review structure mismatch');continue;}
 const rows=[];
 for(const instance of body.children){
  propagatedNodeIds.push(instance.id,...instance.children.map(n=>n.id));
  const bottom=Math.max(...instance.children.map(n=>n.y+n.height));
  rows.push([instance.id,instance.height,bottom]);
  if(instance.height!==32||bottom>32.01)failures.push(instance.id+': review overflow');
 }
 const last=body.children[body.children.length-1];
 const lastBarBottom=body.y+last.y+Math.max(...last.children.map(n=>n.y+n.height));
 if(lastBarBottom>footer.y)failures.push(id+': review footer overlap');
 reviewProof.push({id,mainId:(await root.getMainComponentAsync())?.id,bodyId:body.id,footerId:footer.id,bounds:box(root),lastBarBottom,footerTop:footer.y,footerClearance:footer.y-lastBarBottom,skeletons:rows});
}
const masterUnchanged=masterSnapshot()===masterBefore;
if(!masterUnchanged)failures.push('Global Skeleton master changed');
return{status:failures.length?'NEEDS_TARGETED_FIX':'PASS',scope:'four Loading Comfortable only',pageId:page.id,boardId:'169:2062',createdNodeIds:[],mutatedNodeIds:[...mutated],removedNodeIds:[],propagatedNodeIds,counts:{variants:4,linkedSkeletons:20,bars:60,directMutatedNodes:mutated.size,reviewPropagatedNodes:propagatedNodeIds.length},geometry:{barHeight:8,gap:4,padding:0,instanceHeight:32},globalSkeletonMainId:'24:502',globalSkeletonSetId:'24:512',masterUnchanged,loadedFonts:[...fonts.values()],variants,reviewProof,failures};