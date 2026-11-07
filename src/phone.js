// توحيد أرقام الهاتف: كل صيغ الأرقام المصرية (010 / 011 / 012 / 015) تتحول لصيغة واحدة 01XXXXXXXXX
// 01012345678 = 1012345678 = +20 101 234 5678 = 0020 101 234 5678
export const canon=s=>{let d=String(s).replace(/\D/g,"").replace(/^00/,"");
 if(d.length===12&&d.startsWith("201"))d="0"+d.slice(2);else if(d.length===10&&/^1[0125]/.test(d))d="0"+d;return d};
export const isEg=d=>/^01[0125]\d{8}$/.test(d);
