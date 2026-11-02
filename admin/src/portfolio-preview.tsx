import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AdminVisualizations from './pages/admin/AdminVisualizations';
import { preparePortfolioImage } from './lib/portfolio-images';
import './index.css';
function Preview(){
 const [result,setResult]=React.useState('');
 return <QueryClientProvider client={new QueryClient()}><div style={{padding:32}}><AdminVisualizations/><hr/><label>Kontrola komprese<input aria-label="Soubor pro kontrolu komprese" type="file" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{const b=await createImageBitmap(f);const c=document.createElement('canvas');c.width=4000;c.height=Math.round(4000*b.height/b.width);c.getContext('2d')!.drawImage(b,0,0,c.width,c.height);b.close();const png=await new Promise<Blob>(resolve=>c.toBlob(blob=>resolve(blob!),'image/png'));const p=await preparePortfolioImage(new File([png],'compression-fixture.png',{type:'image/png'}));if(Math.max(p.full.width,p.full.height)>2560||Math.max(p.thumb.width,p.thumb.height)>1000||p.full.blob.size+p.thumb.blob.size>=png.size)throw Error('Compression assertion failed');setResult(JSON.stringify({passed:true,source:png.size,full:p.full.blob.size,thumb:p.thumb.blob.size,width:p.full.width,height:p.full.height,type:p.full.blob.type}));}catch(err){setResult(String(err));}}}/></label><output>{result}</output></div><Toaster/></QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
