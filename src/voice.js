// تسجيل رسالة صوتية (حد أقصى 60 ثانية، ضغط منخفض ~24kbps ليبقى الحجم صغيرًا)
const MAX=60;
export async function startRecording(onTick){
 const stream=await navigator.mediaDevices.getUserMedia({audio:true});
 const mt=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||"";
 const rec=new MediaRecorder(stream,{...(mt?{mimeType:mt}:{}),audioBitsPerSecond:24000}),chunks=[],t0=Date.now();let cancelled=false,done,iv;
 const fin=new Promise(r=>done=r);
 rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
 rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(iv);done()};
 iv=setInterval(()=>{const s=(Date.now()-t0)/1000;onTick(Math.min(s,MAX));if(s>=MAX&&rec.state!=="inactive")rec.stop()},250);
 rec.start();
 return{
  async stop(){if(rec.state!=="inactive")rec.stop();await fin;if(cancelled)return null;
   const blob=new Blob(chunks,{type:rec.mimeType||mt||"audio/webm"});
   const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)});
   if(data.length>650000)throw Error("الرسالة الصوتية كبيرة، سجّل مدة أقصر");
   return{data,dur:Math.min(Math.round((Date.now()-t0)/1000),MAX)}},
  cancel(){cancelled=true;if(rec.state!=="inactive")rec.stop()}};
}
