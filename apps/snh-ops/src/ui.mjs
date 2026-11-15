// The app page. It holds no store data: everything is fetched from /api with a Shopify session token.
// App Bridge + Polaris web components come from Shopify's CDN; the layout also works if a component fails to load.
export const page = (apiKey, devToken = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="shopify-api-key" content="${apiKey}">
<title>SNH Ops</title>
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
<style>
:root{--ink:#202223;--sub:#6d7175;--line:#e1e3e5;--bg:#f6f6f7;--card:#fff;--ok:#008060;--warn:#b98900;--bad:#d72c0d;--accent:#bf4512}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
s-page,s-section{display:block}.wrap{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:0}h2{font-size:16px;margin:0 0 10px}.sub{color:var(--sub);font-size:13px}
.top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
.tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:16px}
.tabs button{border:0;background:none;padding:10px 14px;min-height:44px;font:600 14px/1 inherit;color:var(--sub);border-bottom:3px solid transparent;cursor:pointer;white-space:nowrap}
.tabs button[aria-selected=true]{color:var(--ink);border-color:var(--accent)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:12px;overflow:hidden}
.kpi b{display:block;font-size:24px;line-height:1.2;margin-top:4px}.kpi span{color:var(--sub);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--sub);font-weight:600}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.scroll{overflow-x:auto}
.btn{min-height:40px;padding:0 14px;border:1px solid #babfc3;border-radius:8px;background:#fff;font:600 13px/1 inherit;cursor:pointer}.btn.pri{background:#202223;color:#fff;border-color:#202223}.btn:disabled{opacity:.5}
input[type=search]{min-height:40px;padding:0 12px;border:1px solid #babfc3;border-radius:8px;font:14px inherit;width:min(320px,100%)}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#e4e5e7}.tag.ok{background:#aee9d1}.tag.warn{background:#ffea8a}.tag.bad{background:#fed3d1}
.bars{display:grid;gap:8px}.bar{display:grid;grid-template-columns:70px 1fr 70px;gap:8px;align-items:center}.bar i{display:block;height:14px;border-radius:4px;background:var(--accent)}
.note{background:#f1f8f5;border:1px solid #aee9d1;border-radius:8px;padding:10px 12px;font-size:13px;margin-top:10px}.err{background:#fff4f4;border-color:#fed3d1}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}svg.trend{width:100%;height:120px;display:block}
</style></head><body><s-page><div class="wrap">
<div class="top"><div><h1>SNH Ops</h1><div class="sub" id="stamp">Loading…</div></div><button class="btn pri" id="refresh">Refresh now</button></div>
<div class="tabs" role="tablist">${['Overview', 'Loyalty', 'Bundles', 'Promotions', 'Operations'].map((t, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${t.toLowerCase()}">${t}</button>`).join('')}</div>
<main id="view" aria-live="polite"></main>
</div></s-page>
<script>
(function(){
var DEV=${JSON.stringify(devToken)},view=document.getElementById('view'),stamp=document.getElementById('stamp'),cur='overview',CUR='';
function tok(){return DEV?Promise.resolve(DEV):(window.shopify&&shopify.idToken?shopify.idToken():Promise.reject(new Error('Open this app from Shopify admin.')))}
function api(p,o){return tok().then(function(t){o=o||{};o.headers=Object.assign({Authorization:'Bearer '+t},o.headers||{});return fetch('/api/'+p,o)}).then(function(r){if(r.status===401)throw new Error('Session expired. Reload the app.');return r})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n(x){return x==null?'–':Number(x).toLocaleString('en-US',{maximumFractionDigits:0})}
function money(x){return x==null?'–':(CUR?CUR+' ':'')+Number(x).toLocaleString('en-US',{maximumFractionDigits:0})}
function day(s){return s?String(s).slice(0,10):'–'}
function kpi(l,v,s){return '<div class="card kpi"><span>'+esc(l)+'</span><b>'+v+'</b>'+(s?'<span>'+s+'</span>':'')+'</div>'}
function table(h,rows,empty){if(!rows.length)return '<p class="sub">'+esc(empty||'Nothing to show.')+'</p>';return '<div class="scroll"><table><thead><tr>'+h.map(function(c){return '<th'+(c[1]?' class="n"':'')+'>'+esc(c[0])+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td'+(h[i][1]?' class="n"':'')+'>'+c+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'}
function setStamp(j){var s=j.sync||{};CUR=(j.config&&j.config.currency)||(j.meta&&j.meta.currency)||CUR;stamp.textContent=s.running?('Syncing: '+(s.message||'')):(j.updated_at?'Data from '+new Date(j.updated_at).toLocaleString():'No data yet. Press "Refresh now".');document.getElementById('refresh').disabled=!!s.running;if(s.running)poll()}
var polling=false;function poll(){if(polling)return;polling=true;(function f(){api('status').then(function(r){return r.json()}).then(function(j){var s=j.sync;stamp.textContent=s.running?'Syncing: '+(s.message||''):(s.phase==='error'?'Sync failed: '+(s.message||''):'Sync finished');if(s.running)setTimeout(f,4000);else{polling=false;document.getElementById('refresh').disabled=false;load(cur)}}).catch(function(){polling=false})})()}
var R={
overview:function(j){var d=j.data;if(!d)return empty();var t=d.tiers.tiers,max=Math.max.apply(null,Object.values(t).concat([1])),f=d.flow30,r=d.revenue30;
 return '<div class="grid">'+kpi('Elite members',n(d.members),n(d.newWeek)+' new this week · '+n(d.newMonth)+' this month')+kpi('Points outstanding',n(d.points.points),'worth '+money(d.points.value))+kpi('Points issued, 30 days (estimate)',n(f.issuedEstimate),n(f.earnedOnOrders)+' on orders + '+n(f.welcome)+' welcome')+kpi('Points redeemed, 30 days',n(f.redeemed),n(f.rewardCodesUsed)+' reward codes used')+'</div>'+
 '<div class="card"><h2>Members by tier</h2><div class="bars">'+Object.keys(t).map(function(k){return '<div class="bar"><span>'+esc(k)+'</span><i style="width:'+Math.max(1,Math.round(t[k]/max*100))+'%"></i><b class="n">'+n(t[k])+'</b></div>'}).join('')+'</div>'+((d.tiers.blankTier||d.tiers.otherTier)?'<p class="sub">'+n(d.tiers.blankTier)+' members have points but no tier; '+n(d.tiers.otherTier)+' have an unknown tier.</p>':'')+'</div>'+
 '<div class="card"><h2>Revenue, last 30 days</h2>'+table([['',0],['Revenue',1],['Orders',1]],[['Elite members',money(r.member.revenue),n(r.member.orders)],['Non-members and guests',money(r.nonMember.revenue),n(r.nonMember.orders)]])+'<div class="note">Points issued is an estimate from the earning rules (tier rate × paid order value, plus welcome points). Shopify keeps no points ledger.</div></div>'},
loyalty:function(j){var d=j.data;if(!d)return empty();var h=d.health;
 return '<div class="card"><h2>Members</h2><div class="row"><input type="search" id="q" placeholder="Search name or tier" aria-label="Search members"><button class="btn" id="csv">Export CSV</button></div><div id="members"><p class="sub">Loading…</p></div></div>'+
 '<div class="card"><h2>Close to the next tier ('+n(d.closeCount)+')</h2><p class="sub">Within 10% of the next tier\\'s yearly spend.</p>'+table([['Name',0],['Tier',0],['Annual spend',1],['Next tier',0],['Still to spend',1]],d.close.slice(0,50).map(function(x){return [esc(x.name),esc(x.tier),money(x.annual_spend),esc(x.next),money(x.gap)]}),'Nobody is within 10% right now.')+'</div>'+
 '<div class="card"><h2>'+n((j.config||{}).rewardPoints)+'+ points, not redeemed ('+n(d.redeemableCount)+')</h2>'+table([['Name',0],['Tier',0],['Points',1],['Last order',0]],d.redeemable.slice(0,50).map(function(x){return [esc(x.name),esc(x.tier),n(x.points),day(x.last_order_at)]}),'Nobody is waiting on a reward.')+'</div>'+
 '<div class="card"><h2>Data health</h2>'+table([['Check',0],['Count',1]],[['Customers with blank points',n(h.blankPoints)],['Customers with blank tier',n(h.blankTier)],['Customers with points but no tier',n(h.pointsButNoTier)],['Paid orders in 30 days',n(h.paidOrders30)],['…of those, missing the "points awarded" tag',h.paidMissingAwardTag30==null?'not tracked':n(h.paidMissingAwardTag30)]])+'</div>'},
bundles:function(j){var d=j.data;if(!d)return empty();var mx=Math.max.apply(null,d.trend.map(function(x){return x.revenue}).concat([1])),w=100/d.trend.length;
 return '<div class="grid">'+kpi('Bundle revenue, 30 days',money(d.revenue))+kpi('Orders with a bundle',n(d.orders))+kpi('Bundle units',n(d.units))+kpi('12 months',money(d.allTime.revenue),n(d.allTime.orders)+' orders · '+n(d.allTime.units)+' units')+'</div>'+
 '<div class="card"><h2>30-day trend</h2><svg class="trend" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Bundle revenue per day">'+d.trend.map(function(x,i){var h=x.revenue/mx*38;return '<rect x="'+(i*w+w*.15).toFixed(2)+'" y="'+(40-h).toFixed(2)+'" width="'+(w*.7).toFixed(2)+'" height="'+h.toFixed(2)+'" fill="#bf4512"><title>'+x.day+': '+money(x.revenue)+'</title></rect>'}).join('')+'</svg><p class="sub">'+esc(d.trend[0].day)+' to '+esc(d.trend[d.trend.length-1].day)+'</p>'+
 '<div class="note">These totals count every product with the type "Bundle", whichever app created it. The Shopify Bundles app only reports the bundles it made itself, so its numbers will be lower.</div></div>'+
 '<div class="card"><h2>Top bundles, 30 days</h2>'+table([['Bundle',0],['Revenue',1],['Units',1]],d.top.map(function(x){return [esc(x.title),money(x.revenue),n(x.units)]}),'No bundle sales in the last 30 days.')+'</div>'},
promotions:function(j){var d=j.data;if(!d)return empty();return '<div class="card"><h2>'+esc(d.prefix||'Promo')+' codes</h2>'+table([['Day',0],['Code',0],['Orders',1],['Discount given',1],['Revenue',1]],d.rows.map(function(x){return [esc(x.day),esc(x.code),n(x.orders),money(x.discount),money(x.revenue)]}),'No orders have used these codes yet.')+'</div>'},
operations:function(j){var d=j.data;if(!d)return empty();var s=d.services,k=d.klaviyo||{rows:[]};function st(x){var c=x.status==='running'?'ok':x.status==='not deployed'?'warn':'bad';return '<span class="tag '+c+'">'+esc(x.status)+'</span>'}
 return '<div class="card"><h2>Pickup orders</h2>'+table([['Order',0],['Placed',0],['Payment',0],['Status',0],['Hours ready',1]],d.pickup.map(function(x){return [esc(x.name),day(x.created_at),esc(x.financial),(x.overdue?'<span class="tag bad">Overdue</span> ':'')+esc(x.status),x.readyHours==null?'–':n(x.readyHours)]}),'No open pickup orders.')+'</div>'+
 '<div class="card"><h2>Services</h2>'+table([['Service',0],['Status',0]],[['Click & collect (48-hour hold)',st(s.clickCollect)],['SMS order alerts',st(s.sms)]])+'</div>'+
 '<div class="card"><h2>Klaviyo flows, last 7 days</h2>'+(k.error?'<div class="note err">'+esc(k.error)+'</div>':'')+table([['Flow',0],['Status',0],['Sent',1],['Opened',1],['Clicked',1]],(k.rows||[]).map(function(x){return [esc(x.flow),esc(x.status),n(x.sent),n(x.opened)+(x.sent?' ('+Math.round(x.opened/x.sent*100)+'%)':''),n(x.clicked)]}),k.configured===false?'Klaviyo is not connected.':'No flow emails in the last 7 days.')+'</div>'}};
function empty(){return '<div class="card"><p>No data yet. Press <b>Refresh now</b> to load it. The first load takes a few minutes.</p></div>'}
function members(q,pg){api('members?q='+encodeURIComponent(q||'')+'&page='+(pg||0)).then(function(r){return r.json()}).then(function(j){var el=document.getElementById('members');if(!el)return;var pages=Math.ceil(j.total/j.size);
 el.innerHTML=table([['Name',0],['Tier',0],['Points',1],['Annual spend',1],['Last order',0]],j.rows.map(function(x){return [esc(x.name),esc(x.tier),n(x.points),money(x.annual_spend),day(x.last_order_at)]}),'No members match.')+'<div class="row" style="margin-top:10px"><span class="sub">'+n(j.total)+' members · page '+(j.page+1)+' of '+Math.max(1,pages)+'</span><button class="btn" id="prev"'+(j.page<=0?' disabled':'')+'>Previous</button><button class="btn" id="next"'+(j.page+1>=pages?' disabled':'')+'>Next</button></div>';
 var p=document.getElementById('prev'),x=document.getElementById('next');if(p)p.onclick=function(){members(q,j.page-1)};if(x)x.onclick=function(){members(q,j.page+1)}})}
function load(tab){cur=tab;[].forEach.call(document.querySelectorAll('.tabs button'),function(b){b.setAttribute('aria-selected',String(b.dataset.tab===tab))});view.innerHTML='<div class="card"><p class="sub">Loading…</p></div>';
 api(tab).then(function(r){return r.json()}).then(function(j){if(j.error){view.innerHTML='<div class="card note err">'+esc(j.error)+'</div>';return}setStamp(j);view.innerHTML=R[tab](j);
  if(tab==='loyalty'&&j.data){members('',0);var q=document.getElementById('q'),t;q.oninput=function(){clearTimeout(t);t=setTimeout(function(){members(q.value,0)},300)};
   document.getElementById('csv').onclick=function(){api('members.csv?q='+encodeURIComponent(q.value)).then(function(r){return r.blob()}).then(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='elite-members.csv';a.click()})}}
 }).catch(function(e){view.innerHTML='<div class="card note err">'+esc(e.message||'Could not load.')+'</div>'})}
document.querySelector('.tabs').addEventListener('click',function(e){var b=e.target.closest('button[data-tab]');if(b)load(b.dataset.tab)});
document.getElementById('refresh').onclick=function(){this.disabled=true;stamp.textContent='Starting sync…';api('refresh',{method:'POST'}).then(function(r){return r.json()}).then(function(){poll()}).catch(function(e){stamp.textContent=e.message})};
load('overview');
})();
</script></body></html>`;
