/** Runs before hydration. The cached paint is generated from a validated config. */
export const appearanceBootstrap = `(function(){try{
var root=document.documentElement,raw=localStorage.getItem("aureform:appearance:v1"),paint=JSON.parse(localStorage.getItem("aureform:appearance-paint:v1")||"null");
if(raw&&paint&&paint.config===raw){
var config=JSON.parse(raw);
if(config.version!==1||!["light","dark"].includes(config.theme)||!["aurora","violet","ocean","mint","ember","rose"].includes(config.palette))return;
root.classList.toggle("dark",config.theme==="dark");root.style.colorScheme=config.theme;
var attrs={palette:config.palette,material:config.material,motionLevel:config.motion,hoverEffect:config.hover,density:config.density,typography:config.typography};
Object.entries(attrs).forEach(function(pair){if(typeof pair[1]==="string"&&/^[a-z]+$/.test(pair[1]))root.dataset[pair[0]]=pair[1]});
Object.entries(paint.variables||{}).forEach(function(pair){if(/^--[a-z0-9-]+$/.test(pair[0])&&typeof pair[1]==="string"&&pair[1].length<1500&&!/[<>;\\r\\n]|url\\s*\\(|expression\\s*\\(|@import/i.test(pair[1]))root.style.setProperty(pair[0],pair[1])});
}else{var theme=localStorage.getItem("aureform:theme");if(theme==="light"||theme==="dark"){root.classList.toggle("dark",theme==="dark");root.style.colorScheme=theme}}
}catch(e){}})();`;
