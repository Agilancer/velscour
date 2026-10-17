// Rounded parchment bubbles for town characters. World-space so speech
// stays anchored above the NPC's head at all camera zoom levels.
import { G } from '../state.js';
import { clamp } from '../core/util.js';

export function drawTownSpeech(ctx, n, x, spriteTop) {
  if (!n.talkText || n.talkT <= 0) { n.bubbleRect=null; return; }
  ctx.save();
  ctx.font='12px Georgia, "Times New Roman", serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const maxWidth=170, maxLines=3;
  const lines=[];
  let line='';
  for(const word of String(n.talkText).split(/\s+/)){
    const next=line?line+' '+word:word;
    if(line&&ctx.measureText(next).width>maxWidth-24){lines.push(line);line=word;}
    else line=next;
  }
  if(line)lines.push(line);
  if(lines.length>maxLines){
    lines.length=maxLines;
    while(lines[2].length&&ctx.measureText(lines[2]+'…').width>maxWidth-24)
      lines[2]=lines[2].slice(0,-1);
    lines[2]+='…';
  }
  const width=Math.min(maxWidth,Math.max(100,...lines.map(l=>ctx.measureText(l).width+28)));
  const height=lines.length*17+20;
  const startX=x-width/2, startY=spriteTop-height-15;
  const occupied=[...(G.world?.npcs||[]).filter(q=>q!==n).flatMap(q=>[q.sbox,q.bubbleRect]),
    ...(G.world?.creatures||[]).filter(q=>q!==G.player&&!q.dead).map(q=>q.sbox)].filter(Boolean);
  const intersects=(bx,by)=>occupied.some(([l,t,r,b])=>bx<r+5&&bx+width>l-5&&by<b+5&&by+height>t-5);
  const offsets=[[0,0],[-42,0],[42,0],[-80,0],[80,0],[0,-height-9],[-42,-height-9],[42,-height-9]];
  const [ox,oy]=offsets.find(([dx,dy])=>!intersects(startX+dx,startY+dy))||[0,0];
  const bx=Math.round(startX+ox), by=Math.round(startY+oy), radius=10;
  n.bubbleRect=[bx-3,by-3,bx+width+3,by+height+9];
  const rounded=(x0,y0,w,h,r)=>{
    ctx.beginPath();ctx.moveTo(x0+r,y0);ctx.lineTo(x0+w-r,y0);
    ctx.quadraticCurveTo(x0+w,y0,x0+w,y0+r);ctx.lineTo(x0+w,y0+h-r);
    ctx.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);ctx.lineTo(x0+r,y0+h);
    ctx.quadraticCurveTo(x0,y0+h,x0,y0+h-r);ctx.lineTo(x0,y0+r);
    ctx.quadraticCurveTo(x0,y0,x0+r,y0);ctx.closePath();
  };
  // Soft shadow, double-trimmed rounded parchment and anchored tail.
  ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;
  ctx.fillStyle='#19100d';rounded(bx-3,by-3,width+6,height+6,radius+2);ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.fillStyle='#bb9360';rounded(bx-1,by-1,width+2,height+2,radius+1);ctx.fill();
  ctx.fillStyle='#f0dfbc';rounded(bx+1,by+1,width-2,height-2,radius);ctx.fill();
  ctx.strokeStyle='#7b573b';ctx.lineWidth=.9;rounded(bx+3,by+3,width-6,height-6,radius-1);ctx.stroke();
  const baseX=clamp(x,bx+15,bx+width-15),bottom=by+height;
  const tipY=spriteTop-4;
  ctx.fillStyle='#19100d';ctx.beginPath();
  ctx.moveTo(baseX-8,bottom-2);ctx.lineTo(baseX+8,bottom-2);ctx.lineTo(x,tipY);
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#f0dfbc';ctx.beginPath();
  ctx.moveTo(baseX-5,bottom-4);ctx.lineTo(baseX+5,bottom-4);ctx.lineTo(x,tipY-2);
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#302115';
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],bx+width/2,by+17+i*17);
  ctx.restore();
}
