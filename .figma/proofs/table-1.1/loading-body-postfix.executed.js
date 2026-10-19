const page=await figma.getNodeByIdAsync('2:3');
if(!page||page.type!=='PAGE')throw new Error('Core page unavailable');
await figma.setCurrentPageAsync(page);
const roots=await Promise.all(['164:1465','164:2869','164:4273','164:5677'].map(id=>figma.getNodeByIdAsync(id)));
const box=n=>[n.x,n.y,n.width,n.height];
const parts=[];const fonts=new Map();
for(const root of roots){
 if(!root||root.type!=='COMPONENT'||root.parent?.id!=='23:443'||root.variantProperties.State!=='Loading'||root.variantProperties.Density!=='Comfortable'||root.layoutMode!=='VERTICAL')throw new Error('Unexpected Loading scope');
 const body=root.children.find(n=>n.name==='Table / loading body');
 const footer=root.children.find(n=>n.name==='Table / pagination');
 if(!body||!footer||body.layoutMode!=='VERTICAL'||body.children.length!==5||body.children.some(n=>n.type!=='INSTANCE'||n.children.length!==3||n.children.some(c=>c.type!=='RECTANGLE')))throw new Error('Loading structure changed');
 for(const text of root.findAllWithCriteria({types:['TEXT']}))for(const segment of text.getStyledTextSegments(['fontName']))fonts.set(JSON.stringify(segment.fontName),segment.fontName);
 const mains=await Promise.all(body.children.map(n=>n.getMainComponentAsync()));
 if(mains.some(n=>!n||n.id!=='24:502'||n.parent?.id!=='24:512'))throw new Error('Global Skeleton link changed');
 parts.push({root,body,footer,instances:[...body.children],before:{root:box(root),body:box(body),footer:box(footer)},bodyHorizontal:body.layoutSizingHorizontal});
}
await Promise.all([...fonts.values()].map(font=>figma.loadFontAsync(font)));
const main=await figma.getNodeByIdAsync('24:502');
const masterSnapshot=()=>JSON.stringify({id:main.id,box:box(main),gap:main.itemSpacing,padding:[main.paddingTop,main.paddingRight,main.paddingBottom,main.paddingLeft],bindings:main.boundVariables,children:main.children.map(n=>({id:n.id,box:box(n),bindings:n.boundVariables}))});
const masterBefore=masterSnapshot();const mutated=new Set();
for(const part of parts){
 for(const instance of part.instances){
  const contentHeight=instance.paddingTop+instance.children.reduce((sum,n)=>sum+n.height,0)+instance.itemSpacing*(instance.children.length-1)+instance.paddingBottom;
  if(contentHeight!==46)throw new Error('Unexpected live Skeleton content height');
  instance.resize(instance.width,contentHeight);
  instance.layoutSizingVertical='FIXED';instance.layoutSizingHorizontal='FIXED';
  mutated.add(instance.id);
 }
 const bodyHeight=part.body.paddingTop+part.instances.reduce((sum,n)=>sum+n.height,0)+part.body.itemSpacing*(part.instances.length-1)+part.body.paddingBottom;
 part.body.resize(part.body.width,bodyHeight);
 part.body.layoutSizingHorizontal=part.bodyHorizontal;
 part.body.layoutSizingVertical='HUG';
 part.root.layoutSizingVertical='HUG';
 mutated.add(part.body.id);mutated.add(part.root.id);mutated.add(part.footer.id);
}
const failures=[];const variants=[];
for(const part of parts){
 const {root,body,footer,instances,before}=part;
 const skeletons=[];
 for(const instance of instances){
  const linked=await instance.getMainComponentAsync();
  const bars=instance.children.map(n=>[n.id,n.x,n.y,n.width,n.height]);
  const contentBottom=Math.max(...instance.children.map(n=>n.y+n.height));
  if(linked?.id!=='24:502'||contentBottom>instance.height+.01)failures.push(instance.id+': content overflow or link mismatch');
  skeletons.push({id:instance.id,mainId:linked?.id,bounds:box(instance),contentBottom,bars});
 }
 let previousBottom=body.paddingTop;
 for(const instance of instances){
  if(instance.y<previousBottom-.01)failures.push(instance.id+': previous row overlap');
  previousBottom=instance.y+instance.height;
 }
 const bodyContentBottom=body.y+previousBottom;
 if(bodyContentBottom+body.paddingBottom>footer.y+.01)failures.push(root.id+': body/footer overlap');
 if(footer.width!==before.footer[2]||footer.height!==before.footer[3]||footer.x!==before.footer[0])failures.push(root.id+': footer dimensions changed');
 variants.push({id:root.id,appearance:root.variantProperties.Appearance,state:root.variantProperties.State,density:root.variantProperties.Density,bodyId:body.id,footerId:footer.id,before,after:{root:box(root),body:box(body),footer:box(footer)},bodyContentBottom,footerTop:footer.y,footerClearance:footer.y-bodyContentBottom,skeletons});
}
const propagatedNodeIds=[];const reviewProof=[];
for(const id of ['169:3437','169:3518']){
 const root=await figma.getNodeByIdAsync(id);
 if(!root||root.type!=='INSTANCE'){failures.push(id+': review instance missing');continue;}
 const body=root.children.find(n=>n.name==='Table / loading body');
 const footer=root.children.find(n=>n.name==='Table / pagination');
 if(!body||!footer||!('children'in body)||body.children.length!==5){failures.push(id+': review structure changed');continue;}
 propagatedNodeIds.push(root.id,body.id,footer.id);
 const rows=[];
 let previousBottom=body.paddingTop;
 for(const instance of body.children){
  propagatedNodeIds.push(instance.id,...instance.children.map(n=>n.id));
  const bottom=Math.max(...instance.children.map(n=>n.y+n.height));
  if(bottom>instance.height+.01||instance.y<previousBottom-.01)failures.push(instance.id+': review overflow');
  previousBottom=instance.y+instance.height;
  rows.push([instance.id,instance.y,instance.height,bottom]);
 }
 const bodyContentBottom=body.y+previousBottom;
 if(bodyContentBottom+body.paddingBottom>footer.y+.01)failures.push(id+': review footer overlap');
 reviewProof.push({id,mainId:(await root.getMainComponentAsync())?.id,bounds:box(root),bodyId:body.id,footerId:footer.id,bodyBounds:box(body),footerBounds:box(footer),footerClearance:footer.y-bodyContentBottom,skeletons:rows});
}
const masterUnchanged=masterSnapshot()===masterBefore;
if(!masterUnchanged)failures.push('Global Skeleton master changed');
const board=await figma.getNodeByIdAsync('169:2062');
return{status:failures.length?'NEEDS_TARGETED_FIX':'PASS',scope:'four Loading Comfortable only; authorized real-content body alternative',pageId:page.id,boardId:board?.id,boardBounds:board?box(board):null,createdNodeIds:[],mutatedNodeIds:[...mutated],removedNodeIds:[],propagatedNodeIds,counts:{variants:4,linkedSkeletons:20,directMutatedNodes:mutated.size,reviewPropagatedNodes:propagatedNodeIds.length},geometry:{actualBarHeights:[14,12,12],gap:4,padding:0,instanceHeight:46,bodyHeight:358},globalSkeletonMainId:'24:502',globalSkeletonSetId:'24:512',masterUnchanged,loadedFonts:[...fonts.values()],variants,reviewProof,failures};