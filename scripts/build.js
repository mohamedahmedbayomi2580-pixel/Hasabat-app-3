// بناء الواجهة: يجمع الملفات في www. الإشعارات على الأندرويد تُفعَّل فقط لو وُجد google-services.json (PUSH_ENABLED=true)
const esbuild=require("esbuild"),fs=require("fs");
esbuild.buildSync({entryPoints:["src/app.js","src/admin.js"],bundle:true,minify:true,outdir:"www",define:{__PUSH__:String(process.env.PUSH_ENABLED==="true")}});
for(const f of fs.readdirSync("src"))if(/\.(html|css)$/.test(f)||f==="firebase-messaging-sw.js")fs.copyFileSync("src/"+f,"www/"+f);
console.log("build ok, push:",process.env.PUSH_ENABLED==="true");
