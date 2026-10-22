// Rounded parchment bubbles for town characters. World-space so speech
// stays anchored above the NPC's head at all camera zoom levels. Kept small (two lines) so a busy square never
// disappears under text; they pop in and fade out, and only step aside for other bubbles and the hero. Chats at the
// forge (game/homunculus.js) set n.bubbleLines = 3 for a wider bubble; the cursed axe's are dark (n.dark).
import { G } from '../state.js';
import { clamp } from '../core/util.js';

export function drawTownSpeech(ctx, n, x, spriteTop) {
  if (!n.talkText || n.talkT <= 0) { n.bubbleRect=null; return; }
  ctx.save();
  const age=n.talkAge??1, k=Math.min(1,age/0.18), fade=Math.min(1,n.talkT/0.35);
  ctx.globalAlpha=Math.min(k,fade);
  ctx.font=`${n.dark?'italic ':''}600 11px "Alegreya Sans", "Segoe UI", sans-serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const maxLines=n.bubbleLines||2, maxWidth=maxLines>2?196:150;
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
    const l=maxLines-1;
    while(lines[l].length&&ctx.measureText(lines[l]+'…').width>maxWidth-24)
      lines[l]=lines[l].slice(0,-1);
    lines[l]+='…';
  }
  const width=Math.min(maxWidth,Math.max(60,...lines.map(l=>ctx.measureText(l).width+22)));
  const height=lines.length*14+12;
  const startX=x-width/2, startY=spriteTop-height-12+(1-k)*6;
  const occupied=[...(G.world?.npcs||[]).filter(q=>q!==n&&q.talkT>0).map(q=>q.bubbleRect),n!==G.player&&G.player?.talkT>0&&G.player.bubbleRect,n!==G.player&&G.player?.sbox].filter(Boolean);
  const intersects=(bx,by)=>occupied.some(([l,t,r,b])=>bx<r+5&&bx+width>l-5&&by<b+5&&by+height>t-5);
  const offsets=[[0,0],[-38,-6],[38,-6],[0,-height-6],[-70,-10],[70,-10],[-38,-height-8],[38,-height-8]];
  const [ox,oy]=offsets.find(([dx,dy])=>!intersects(startX+dx,startY+dy))||[0,0];
  const bx=Math.round(startX+ox), by=Math.round(startY+oy), radius=8;
  n.bubbleRect=[bx-3,by-3,bx+width+3,by+height+9];
  const rounded=(x0,y0,w,h,r)=>{
    ctx.beginPath();ctx.moveTo(x0+r,y0);ctx.lineTo(x0+w-r,y0);
    ctx.quadraticCurveTo(x0+w,y0,x0+w,y0+r);ctx.lineTo(x0+w,y0+h-r);
    ctx.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);ctx.lineTo(x0+r,y0+h);
    ctx.quadraticCurveTo(x0,y0+h,x0,y0+h-r);ctx.lineTo(x0,y0+r);
    ctx.quadraticCurveTo(x0,y0,x0+r,y0);ctx.closePath();
  };
  // Soft shadow, double-trimmed rounded parchment and anchored tail.
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=6;ctx.shadowOffsetY=2;
  ctx.fillStyle='#19100d';rounded(bx-3,by-3,width+6,height+6,radius+2);ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  const [rimC,paper,inkC,lineC]=n.dark?['#4fae88','#16211f','#bff4dc','#2e6a58']:['#bb9360','#f0dfbc','#302115','#7b573b'];
  ctx.fillStyle=rimC;rounded(bx-1,by-1,width+2,height+2,radius+1);ctx.fill();
  ctx.fillStyle=paper;rounded(bx+1,by+1,width-2,height-2,radius);ctx.fill();
  ctx.strokeStyle=lineC;ctx.lineWidth=.9;rounded(bx+3,by+3,width-6,height-6,radius-1);ctx.stroke();
  const baseX=clamp(x,bx+15,bx+width-15),bottom=by+height;
  const tipY=spriteTop-2;
  ctx.fillStyle='#19100d';ctx.beginPath();
  ctx.moveTo(baseX-8,bottom-2);ctx.lineTo(baseX+8,bottom-2);ctx.lineTo(x,tipY);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=paper;ctx.beginPath();
  ctx.moveTo(baseX-5,bottom-4);ctx.lineTo(baseX+5,bottom-4);ctx.lineTo(x,tipY-2);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=inkC;
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],bx+width/2,by+13+i*14);
  ctx.restore();
}
