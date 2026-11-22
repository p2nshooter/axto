/**
 * Panggung player teks (perintah pemilik #52 „banyak yg keluar garis, banyak yg nempel garis"): karya tampil persegi,
 * teks HANYA di dalam kotak aman bingkai (koordinat kanvas 1000×1000), ukuran huruf dikecilkan otomatis sampai muat
 * (diukur di perangkat). Kotak aman tidak pernah turun di bawah 84% tinggi panggung agar tidak tertutup bilah tombol.
 */
export function stageCss([x, y, w, h]) {
  const bottom = Math.min(y + h, 840);
  return `:root{--S:min(100vw,100vh)}@media (max-aspect-ratio:4/5){:root{--S:min(100vw,calc(100vh - 64px))}}html,body{margin:0;height:100%;overflow:hidden}#stage{position:fixed;top:0;left:50%;transform:translateX(-50%);width:var(--S);height:var(--S)}#stage>#art{position:absolute;inset:0;pointer-events:none}#stage>#art svg{width:100%;height:100%;display:block}#safe{position:absolute;left:${x / 10}%;top:${y / 10}%;width:${w / 10}%;height:${(bottom - y) / 10}%;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;align-items:center;justify-content:safe center;box-sizing:border-box;padding:0 2px;scrollbar-width:thin;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}#safe>*{max-width:100%}`;
}

/** Skrip penyesuai ukuran: k = ukuran awal relatif terhadap lebar panggung; min px. scroll=true → tidak dikecilkan (mushaf). */
export const FIT_JS = `
function axFit(){const st=document.getElementById('stage'),s=document.getElementById('safe');if(!st||!s)return;const S=st.clientWidth;
 if(s.dataset.scroll){s.style.fontSize=(S*(+s.dataset.k)*(+(s.dataset.z||1)))+'px';return}
 let f=S*(+s.dataset.k);const min=+s.dataset.min||11;s.style.fontSize=f+'px';let g=0;
 while(s.scrollHeight>s.clientHeight+1&&f>min&&g++<120){f*=0.96;s.style.fontSize=f+'px'}}
addEventListener('resize',axFit);if(document.fonts)document.fonts.ready.then(axFit);axFit();setTimeout(axFit,400);
`;
