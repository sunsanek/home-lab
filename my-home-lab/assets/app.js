const data={
 overview:{title:'Обзор'},
 proxmox:{title:'Proxmox'}, network:{title:'Сеть и VPN'}, smart:{title:'Умный дом'}, backup:{title:'Бэкапы'}, docker:{title:'Docker'}, ai:{title:'AI Hub'}, knowledge:{title:'База знаний'}, events:{title:'Журнал'}
};
const demo={cpu:18,ram:43,temp:57,storage:82,uptime:'17 дн. 06 ч.',vpnPing:42,ha:37,backup:'18 ч. назад'};
let live=null;
let historyData=[];
let historyHours=24;
let historyLoading=false;
const el=s=>document.querySelector(s);
function storagePercent(path='/Storage'){return live?.storage?.[path]?.used_percent ?? (path==='/'?21:demo.storage);}
function vmlist(){return live?.vms || [];}
function runningCount(){return vmlist().filter(x=>x.status==='running').length;}
function stoppedCount(){return vmlist().filter(x=>x.status!=='running').length;}
let proxmoxSort={key:'default',dir:1};
function sortProxmox(key){
  if(proxmoxSort.key===key) proxmoxSort.dir*=-1;
  else {proxmoxSort.key=key; proxmoxSort.dir=1;}
  render();
}
function sortArrow(key){
  if(proxmoxSort.key!=='default' && proxmoxSort.key===key) return proxmoxSort.dir===1?' ↑':' ↓';
  return '';
}
function sortedVms(){
  const rows=vmlist().slice();
  if(proxmoxSort.key==='default'){
    return rows.sort((a,b)=>
      (a.status==='running'?0:1)-(b.status==='running'?0:1) ||
      Number(a.id)-Number(b.id)
    );
  }
  const key=proxmoxSort.key, dir=proxmoxSort.dir;
  return rows.sort((a,b)=>{
    let av,bv;
    if(key==='id'){av=Number(a.id)||0;bv=Number(b.id)||0;}
    else if(key==='name'){av=String(a.name||'').toLowerCase();bv=String(b.name||'').toLowerCase();}
    else if(key==='type'){av=String(a.type||'').toLowerCase();bv=String(b.type||'').toLowerCase();}
    else if(key==='status'){av=a.status==='running'?1:0;bv=b.status==='running'?1:0;}
    else if(key==='cpu'){av=Number(a.cpu)||0;bv=Number(b.cpu)||0;}
    else if(key==='mem'){av=Number(a.mem_gb)||0;bv=Number(b.mem_gb)||0;}
    return (av< bv ? -1 : av>bv ? 1 : 0) * dir;
  });
}
function fmtTemp(){return live?.temperature != null ? `${live.temperature}°C` : `${demo.temp}°C`;}
function stat(title,value,sub,status='ok'){return `<div class="card stat"><div class="stat-top"><span>${title}</span><span class="status ${status==='ok'?'':status}">${status==='ok'?'ONLINE':status==='warn'?'ВНИМАНИЕ':'ОШИБКА'}</span></div><div class="stat-value">${value}</div><div class="muted" style="font-size:11px;margin-top:5px">${sub}</div></div>`}
function health(name,desc,status='ok'){return `<div class="health"><div class="health-line"><span class="dot ${status}"></span><strong>${name}</strong></div><small>${desc}</small></div>`}
function pct(value){return Math.max(0,Math.min(100,Number(value)||0));}
function serviceRows(){
  const running=runningCount();
  return [
    health('Proxmox',`${live?.host||'pve'} · ${running} из ${vmlist().length} VM/LXC запущено`),
    health('Home Assistant',live?.vms?.find(x=>x.id===113)?.status==='running'?'VM 113 · haos · RUNNING':'VM 113 · haos · STOPPED',live?.vms?.find(x=>x.id===113)?.status==='running'?'ok':'warn'),
    health('AdGuard Home',live?.vms?.find(x=>x.id===105)?.status==='running'?'LXC 105 · RUNNING':'LXC 105 · STOPPED',live?.vms?.find(x=>x.id===105)?.status==='running'?'ok':'warn'),
    health('rclone',live?.vms?.find(x=>x.id===112)?.status==='running'?'LXC 112 · RUNNING':'LXC 112 · STOPPED',live?.vms?.find(x=>x.id===112)?.status==='running'?'ok':'warn'),
    health('Pulse',live?.vms?.find(x=>x.id===114)?.status==='running'?'LXC 114 · RUNNING':'LXC 114 · STOPPED',live?.vms?.find(x=>x.id===114)?.status==='running'?'ok':'warn'),
    health('WireGuard','Germany VPS · проверка будет подключена следующим этапом'),
    health('Zigbee','Sonoff Bridge · Home Assistant'),
    health('Google Drive','rclone · проверка будет подключена следующим этапом','warn')
  ].join('');
}
function overview(){
  const cpu=live?.cpu??demo.cpu, ram=live?.ram??demo.ram, storage=storagePercent();
  return `<div class="grid stats">${stat('Proxmox',`${cpu}%`,'CPU load')}${stat('RAM',`${ram}%`,'использование')}${stat('Storage',`${storage}%`,'/Storage',storage>=80?'warn':'ok')}${stat('Температура',fmtTemp(),live?'Beelink / Proxmox':'mini PC')}</div>
  <div class="grid two" style="margin-top:14px"><div class="card hero"><div><div class="eyebrow">SYSTEM HEALTH</div><h2>${live?'Инфраструктура подключена':'Инфраструктура работает'}</h2><p>${live?`Реальные данные с ${live.host||'Proxmox'} · обновляются каждую минуту.`:'Тестовый режим.'}</p></div><div class="hero-badge">● ${live?'LIVE':'DEMO'}</div></div><div class="card"><div class="section-title" style="margin-top:0">Быстрый доступ</div><div class="actions"><button class="action" onclick="go('proxmox')">Proxmox</button><button class="action" onclick="go('network')">VPN</button><button class="action" onclick="go('smart')">Умный дом</button><button class="action" onclick="go('backup')">Бэкапы</button><button class="action" onclick="go('ai')">AI Hub</button></div></div></div>
  <div class="section-title">Состояние сервисов</div><div class="card health-list">${serviceRows()}</div>
  <div class="section-title">Ресурсы Proxmox</div><div class="grid three"><div class="card"><div class="stat-top"><span>CPU</span><span>${cpu}%</span></div><div class="meter"><span style="width:${pct(cpu)}%"></span></div></div><div class="card"><div class="stat-top"><span>RAM</span><span>${ram}%</span></div><div class="meter"><span style="width:${pct(ram)}%"></span></div></div><div class="card"><div class="stat-top"><span>/Storage</span><span>${storage}%</span></div><div class="meter"><span style="width:${pct(storage)}%"></span></div></div></div>
  <div class="section-title">Хост</div><div class="card"><div class="row"><span>Hostname</span><strong>${live?.host||'pve'}</strong></div><div class="row"><span>Uptime</span><span class="muted">${live?.uptime||demo.uptime}</span></div><div class="row"><span>Корневой диск</span><span class="muted">${live?.storage?.['/']?.used_gb??'—'} / ${live?.storage?.['/']?.total_gb??'—'} GB · ${storagePercent('/')}%</span></div><div class="row"><span>Последнее обновление</span><span class="muted">${live?.updated_at?new Date(live.updated_at).toLocaleString('ru-RU'):'—'}</span></div></div>`;
}
function chartModel(points,key,unit='%',digits=1,w=760,h=220,padLeft=48,padRight=16,padTop=18,padBottom=30){
  const vals=points.map(p=>Number(p[key])).filter(Number.isFinite);
  if(!vals.length)return null;

  let min=Math.min(...vals), max=Math.max(...vals);

  if(unit==='%'){
    min=0;
    max=100;
  }else{
    const span=Math.max(1,max-min);
    const margin=span*0.12;
    min=Math.max(0,min-margin);
    max=max+margin;
  }

  if(max===min)max=min+1;

  const plotW=w-padLeft-padRight;
  const plotH=h-padTop-padBottom;
  const span=max-min;

  const coords=points.map((p,i)=>{
    const v=Number(p[key]);
    if(!Number.isFinite(v))return null;

    const x=padLeft+(i/Math.max(1,points.length-1))*plotW;
    const y=padTop+((max-v)/span)*plotH;

    return {x,y,v,p};
  }).filter(Boolean);

  if(!coords.length)return null;

  const path=coords
    .map((c,i)=>`${i?'L':'M'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const mid=min+(max-min)/2;
  const fmt=v=>Number(v).toFixed(digits)+unit;

  const timeOf=p=>{
    const raw=p?.updated_at??p?.timestamp??p?.ts??p?.time;
    if(raw==null)return '';

    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return '';

    if(historyHours>=168){
      return d.toLocaleString(
        'ru-RU',
        {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}
      );
    }

    return d.toLocaleTimeString(
      'ru-RU',
      {hour:'2-digit',minute:'2-digit'}
    );
  };

  // До 5 подписей времени равномерно по всей оси X.
  const timeTicks=[];
  const tickCount=Math.min(5,coords.length);

  for(let i=0;i<tickCount;i++){
    const index=Math.round(
      i*(coords.length-1)/Math.max(1,tickCount-1)
    );

    const point=coords[index];
    const label=timeOf(point.p);

    if(label){
      timeTicks.push({
        x:point.x,
        label
      });
    }
  }

  return {
    path,
    min,
    max,
    mid,
    fmt,
    coords,
    first:coords[0],
    last:coords[coords.length-1],
    timeTicks
  };
}

function chartCard(title,key,unit='%',digits=1){
  const vals=historyData.map(p=>Number(p[key])).filter(Number.isFinite);
  const current=vals.length?vals[vals.length-1]:null;
  const min=vals.length?Math.min(...vals):null;
  const max=vals.length?Math.max(...vals):null;
  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  const model=chartModel(historyData,key,unit,digits);

  const value=v=>v==null?'—':Number(v).toFixed(digits)+unit;
  const statBox=(label,v)=>`<div style="padding:8px 12px;border:1px solid var(--border);border-radius:10px;min-width:88px"><div class="muted" style="font-size:10px">${label}</div><strong style="font-size:16px">${value(v)}</strong></div>`;

  return `<div class="card history-card">
    <div class="chart-head">
      <div>
        <strong>${title}</strong>
        <div class="muted">текущее: ${value(current)}</div>
      </div>
    </div>
    ${model?`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px">
        ${statBox('МИН',min)}
        ${statBox('СРЕДНЕЕ',avg)}
        ${statBox('МАКС',max)}
      </div>
      <svg class="history-svg" viewBox="0 0 760 220" preserveAspectRatio="none" aria-label="${title}">
        <path class="chart-gridline" d="M48 18H744 M48 110H744 M48 190H744"></path>
        <path class="chart-line" d="${model.path}"></path>
        <circle cx="${model.last.x.toFixed(1)}" cy="${model.last.y.toFixed(1)}" r="4"></circle>
        <text class="chart-axis-label" x="4" y="22">${model.fmt(model.max)}</text>
        <text class="chart-axis-label" x="4" y="114">${model.fmt(model.mid)}</text>
        <text class="chart-axis-label" x="4" y="194">${model.fmt(model.min)}</text>
        ${model.timeTicks.map(t=>`
          <line
            x1="${t.x.toFixed(1)}"
            y1="190"
            x2="${t.x.toFixed(1)}"
            y2="194"
            class="chart-axis-tick"
          ></line>
          <text
            class="chart-time-label"
            x="${t.x.toFixed(1)}"
            y="214"
            text-anchor="middle"
          >${t.label}</text>
        `).join('')}
        <text
          class="chart-current-label"
          x="${Math.min(700,Math.max(58,model.last.x-20)).toFixed(1)}"
          y="${Math.max(12,model.last.y-8).toFixed(1)}"
        >${value(model.last.v)}</text>
      </svg>
    `:`<div class="chart-empty">Пока нет истории. Новые измерения появятся автоматически.</div>`}
  </div>`;
}
function historyBlock(){
  return `<div class="section-title">История ресурсов</div>
  <div class="history-toolbar">
    <button class="range-btn ${historyHours===1?'active':''}" onclick="setHistoryHours(1)">1 ч</button>
    <button class="range-btn ${historyHours===6?'active':''}" onclick="setHistoryHours(6)">6 ч</button>
    <button class="range-btn ${historyHours===24?'active':''}" onclick="setHistoryHours(24)">24 ч</button>
    <button class="range-btn ${historyHours===168?'active':''}" onclick="setHistoryHours(168)">7 дней</button>
    <span class="muted history-note">${historyLoading?'загрузка…':`${historyData.length} измерений`}</span>
  </div>
  <div class="grid two">${chartCard('CPU','cpu')}${chartCard('RAM','ram')}</div>
  <div class="grid two">${chartCard('Температура','temperature','°C',0)}${chartCard('/Storage','storage_used')}</div>`;
}
async function loadHistory(hours=historyHours){
  historyLoading=true;
  try{
    const r=await fetch(`/api/history?hours=${hours}`,{cache:'no-store'});
    const j=await r.json();
    historyData=Array.isArray(j.points)?j.points:[];
  }catch(e){historyData=[];}
  historyLoading=false;
  if(location.hash==='#proxmox') render();
}
function setHistoryHours(hours){
  historyHours=hours;
  loadHistory(hours);
}
function proxmox(){
  const rows=sortedVms();
  const vmRows=rows.length?rows.map(r=>`<tr>
    <td>${r.id??''}</td>
    <td><strong>${r.name??''}</strong></td>
    <td>${r.type??''}</td>
    <td><span class="pill ${r.status==='running'?'':'warn'}">${r.status==='running'?'RUNNING':'STOPPED'}</span></td>
    <td>${r.status==='running'?`${r.cpu??0}% CPU · ${r.mem_gb??0} / ${r.maxmem_gb??0} GB`: '—'}</td>
  </tr>`).join(''):`<tr><td colspan="5" class="empty">Нет данных</td></tr>`;
  return `<div class="notice ${live?'live-notice':''}">${live?`LIVE · ${live.host||'pve'} · данные поступают от агента каждые 60 секунд.`:'Сейчас отображаются демонстрационные данные.'}</div>
  <div class="grid stats">${stat('CPU',`${live?.cpu??demo.cpu}%`,'host load')}${stat('RAM',`${live?.ram??demo.ram}%`,'host memory')}${stat('Температура',fmtTemp(),'mini PC')}${stat('Uptime',live?.uptime??demo.uptime,'host')}</div>
  <div class="grid three" style="margin-top:14px">${stat('Запущено',runningCount(),`из ${vmlist().length||'—'} VM/LXC`)}${stat('Остановлено',stoppedCount(),'VM/LXC',stoppedCount()>0?'warn':'ok')}${stat('/Storage',`${storagePercent()}%`,live?.storage?.['/Storage']?`${live.storage['/Storage'].used_gb} / ${live.storage['/Storage'].total_gb} GB`:'storage')}</div>
  <div class="section-title">Виртуальные машины и контейнеры</div>
  <div class="card">
    <div class="table-hint">Нажми на заголовок столбца для сортировки. Повторное нажатие меняет направление.</div>
    <table class="table sortable-table">
      <thead><tr>
        <th class="sortable" onclick="sortProxmox('id')">ID<span class="sort-arrow">${sortArrow('id')}</span></th>
        <th class="sortable" onclick="sortProxmox('name')">Имя<span class="sort-arrow">${sortArrow('name')}</span></th>
        <th class="sortable" onclick="sortProxmox('type')">Тип<span class="sort-arrow">${sortArrow('type')}</span></th>
        <th class="sortable" onclick="sortProxmox('status')">Состояние<span class="sort-arrow">${sortArrow('status')}</span></th>
        <th class="sortable" onclick="sortProxmox('cpu')">Ресурсы / CPU<span class="sort-arrow">${sortArrow('cpu')}</span></th>
      </tr></thead>
      <tbody>${vmRows}</tbody>
    </table>
  </div>
  <div class="section-title">Storage</div><div class="grid two"><div class="card"><div class="row"><span>/Storage</span><strong>${storagePercent()}%</strong></div><div class="meter"><span style="width:${pct(storagePercent())}%"></span></div>${live?.storage?.['/Storage']?`<div class="row"><span>Занято</span><span class="muted">${live.storage['/Storage'].used_gb} / ${live.storage['/Storage'].total_gb} GB</span></div>`:''}</div><div class="card"><div class="row"><span>/</span><strong>${storagePercent('/')}%</strong></div><div class="meter"><span style="width:${pct(storagePercent('/'))}%"></span></div>${live?.storage?.['/']?`<div class="row"><span>Занято</span><span class="muted">${live.storage['/'].used_gb} / ${live.storage['/'].total_gb} GB</span></div>`:''}</div></div>${historyBlock()}`;
}

function network(){
  const net=live?.network?.keenetic;
  const internet=net?.internet;
  const amnezia=net?.amnezia;
  const warp=net?.warp;
  const zerotier=net?.zerotier;

  const isOnline=x=>x?.online===true || x?.connected===true;

  const fmtBytes=v=>{
    const n=Number(v);
    if(!Number.isFinite(n)) return '—';
    if(n>=1024**3) return `${(n/1024**3).toFixed(1)} GB`;
    if(n>=1024**2) return `${(n/1024**2).toFixed(1)} MB`;
    return `${(n/1024).toFixed(0)} KB`;
  };

  const amneziaStatus=isOnline(amnezia)?'ok':'warn';
  const warpStatus=isOnline(warp)?'ok':'warn';
  const ztStatus=zerotier?.status==='OK'?'ok':'warn';
  const internetStatus=internet?.connected?'ok':'warn';

  return `
    <div class="grid stats">
      ${stat('Интернет',internet?.connected?'ONLINE':'OFFLINE',internet?.description||'Keenetic · PPPoE',internetStatus)}
      ${stat('VPN Germany',isOnline(amnezia)?'ONLINE':'OFFLINE',amnezia?.description||'WireGuard',amneziaStatus)}
      ${stat('WARP',isOnline(warp)?'ONLINE':'OFF',warp?.description||'WireGuard',warpStatus)}
      ${stat('ZeroTier',zerotier?.status==='OK'?'ONLINE':'OFFLINE',zerotier?.network_name||'mesh',ztStatus)}
    </div>

    <div class="section-title">Keenetic · VPN Germany</div>

    <div class="card">
      <div class="row"><span>Состояние</span><strong>${isOnline(amnezia)?'ONLINE':'OFFLINE'}</strong></div>
      <div class="row"><span>Интерфейс</span><span class="muted">${amnezia?.description||'—'}</span></div>
      <div class="row"><span>Локальный IP</span><span class="muted">${amnezia?.address||'—'}</span></div>
      <div class="row"><span>Endpoint</span><span class="muted">${amnezia?.remote_endpoint||'—'}${amnezia?.remote_port?':'+amnezia.remote_port:''}</span></div>
      <div class="row"><span>Последний handshake</span><span class="muted">${Number.isFinite(Number(amnezia?.last_handshake))?`${amnezia.last_handshake} сек. назад`:'—'}</span></div>
      <div class="row"><span>Передано</span><span class="muted">↑ ${fmtBytes(amnezia?.tx_bytes)}</span></div>
      <div class="row"><span>Получено</span><span class="muted">↓ ${fmtBytes(amnezia?.rx_bytes)}</span></div>
    </div>

    <div class="section-title">ZeroTier</div>

    <div class="card">
      <div class="row"><span>Состояние</span><strong>${zerotier?.status==='OK'?'ONLINE':'OFFLINE'}</strong></div>
      <div class="row"><span>Сеть</span><span class="muted">${zerotier?.network_name||'—'}</span></div>
      <div class="row"><span>IP</span><span class="muted">${zerotier?.address||'—'}</span></div>
      <div class="row"><span>Endpoint</span><span class="muted">${zerotier?.remote_endpoint||'—'}</span></div>
    </div>

    <div class="section-title">Маршрутизация</div>

    <div class="card">
      <table class="table">
        <thead><tr><th>Назначение</th><th>Маршрут</th><th>Состояние</th></tr></thead>
        <tbody>
          <tr><td>YouTube</td><td>VPN 1</td><td><span class="pill">OK</span></td></tr>
          <tr><td>ChatGPT</td><td>VPN 2</td><td><span class="pill">OK</span></td></tr>
          <tr><td>Telegram</td><td>VPN 2</td><td><span class="pill">OK</span></td></tr>
          <tr><td>Остальной трафик</td><td>DIRECT</td><td><span class="pill">OK</span></td></tr>
        </tbody>
      </table>
    </div>

    <div class="section-title">Диагностика</div>

    <div class="card health-list">
      ${health('Internet',internet?.connected?`${internet.description||'PPPoE'} · ${internet.address||''}`:'Keenetic · соединение отсутствует',internet?.connected?'ok':'warn')}
      ${health('WireGuard Germany',isOnline(amnezia)?`handshake ${amnezia.last_handshake ?? '—'} сек. · ${amnezia.remote_endpoint||'—'}`:'VPN отключён',isOnline(amnezia)?'ok':'warn')}
      ${health('WARP',isOnline(warp)?'подключён':'выключен',isOnline(warp)?'ok':'warn')}
      ${health('ZeroTier',zerotier?.status==='OK'?`${zerotier.network_name||'mesh'} · ${zerotier.address||'—'}`:'соединение отсутствует',zerotier?.status==='OK'?'ok':'warn')}
      ${health('AdGuard Home',live?.vms?.find(x=>x.id===105)?.status==='running'?'LXC 105 · RUNNING':'LXC 105 · STOPPED',live?.vms?.find(x=>x.id===105)?.status==='running'?'ok':'warn')}
    </div>
  `;
}
function smart(){return `<div class="grid stats">${stat('Устройства',demo.ha,'Home Assistant')}${stat('Свет','8 / 12','включено')}${stat('Zigbee','ONLINE','Sonoff Bridge')}${stat('eWeLink','ONLINE','cloud')}</div><div class="notice">Home Assistant пока не подключён к панели. Следующим этапом получим реальные устройства, температуры, свет и Zigbee.</div><div class="section-title">Дом</div><div class="card health-list">${health('Home Assistant','VM 113 · главный контроллер')}${health('Zigbee','Sonoff Zigbee Bridge')}${health('eWeLink','Sonoff LAN / cloud')}${health('Яндекс','умные устройства')}</div><div class="section-title">Быстрые действия</div><div class="card actions"><button class="action">Выключить свет</button><button class="action">Включить ночной режим</button><button class="action">Перезапустить Zigbee</button><button class="action">Открыть Home Assistant</button></div>`}
function backup(){return `<div class="grid stats">${stat('Google Drive','OK','rclone')}${stat('Последний backup',demo.backup,'требует внимания','warn')}${stat('Кэш','40 GB','vfs cache')}${stat('Takeout','есть','архивы')}</div><div class="notice">Бэкапы пока не подключены к мониторингу. Сделаем отдельный агент для rclone без передачи содержимого файлов.</div><div class="section-title">История</div><div class="card"><div class="event"><time>03:04</time><span class="dot ok bullet"></span><div><p>Backup завершён</p><small>Google Drive · rclone</small></div></div><div class="event"><time>02:51</time><span class="dot ok bullet"></span><div><p>Immich thumbs синхронизированы</p><small>/Storage/Immich/thumbs</small></div></div></div>`}
function docker(){return `<div class="grid stats">${stat('Docker','на LXC 102','будет подключён')}${stat('Immich','3 / 3','healthy')}${stat('Postgres','ONLINE','database')}${stat('ML','ONLINE','machine learning')}</div><div class="notice">Docker API пока не передаётся агентом. Подключим его отдельно, чтобы не давать панели права управления контейнерами.</div><div class="section-title">Ожидаемые контейнеры</div><div class="card"><table class="table"><thead><tr><th>Контейнер</th><th>Состояние</th><th>Назначение</th></tr></thead><tbody><tr><td>immich_server</td><td><span class="pill">healthy</span></td><td>Immich</td></tr><tr><td>immich_machine_learning</td><td><span class="pill">healthy</span></td><td>ML</td></tr><tr><td>immich_postgres</td><td><span class="pill">healthy</span></td><td>PostgreSQL</td></tr><tr><td>portainer</td><td><span class="pill">running</span></td><td>Docker management</td></tr></tbody></table></div>`}
function ai(){let cards=[['✦','ChatGPT','анализ, код, диагностика'],['◈','Claude','тексты и документы'],['◇','Gemini','поиск и multimodal'],['⊙','Perplexity','исследование'],['◆','DeepSeek','код и reasoning'],['◎','Grok','поиск и задачи']];return `<div class="card hero"><div><div class="eyebrow">AI TOOLBOX</div><h2>Мои нейросети</h2><p>Единая точка входа и библиотека готовых промптов.</p></div></div><div class="section-title">Инструменты</div><div class="grid three">${cards.map(c=>`<div class="card ai-card"><div class="ai-icon">${c[0]}</div><strong>${c[1]}</strong><div class="muted" style="font-size:11px;margin-top:6px">${c[2]}</div></div>`).join('')}</div><div class="section-title">Готовые промпты</div><div class="card"><div class="row"><span>Диагностика Linux</span><button class="action">Копировать</button></div><div class="row"><span>Proxmox: анализ вывода команд</span><button class="action">Копировать</button></div><div class="row"><span>Home Assistant: создать automation</span><button class="action">Копировать</button></div><div class="row"><span>WireGuard: проверить конфигурацию</span><button class="action">Копировать</button></div></div>`}
function knowledge(){return `<div class="card"><input class="search" placeholder="Поиск по моей базе знаний…" /></div><div class="section-title">Разделы</div><div class="grid two"><div class="card"><div class="knowledge-item"><strong>Proxmox</strong><p>VM, LXC, Storage, ZFS, уменьшение дисков</p></div><div class="knowledge-item"><strong>Network</strong><p>Keenetic, WireGuard, ZeroTier, DNS, AdGuard</p></div><div class="knowledge-item"><strong>Smart Home</strong><p>Home Assistant, Zigbee, eWeLink, Яндекс</p></div></div><div class="card"><div class="knowledge-item"><strong>Servers</strong><p>VPS, Docker, Immich, rclone</p></div><div class="knowledge-item"><strong>Backups</strong><p>Google Drive, rclone, восстановление</p></div><div class="knowledge-item"><strong>Hardware</strong><p>мини-ПК, диски, температура, SMART</p></div></div></div>`}
function events(){return `<div class="notice">Журнал событий станет реальным после подключения истории метрик. Сейчас отображаются только подготовленные записи.</div><div class="card"><div class="event"><time>сейчас</time><span class="dot ok bullet"></span><div><p>Proxmox agent передал данные</p><small>${live?.host||'pve'} · CPU ${live?.cpu??'—'}% · RAM ${live?.ram??'—'}%</small></div></div><div class="event"><time>сейчас</time><span class="dot ${storagePercent()>=80?'warn':'ok'} bullet"></span><div><p>/Storage ${storagePercent()}%</p><small>${live?.storage?.['/Storage']?.used_gb??'—'} / ${live?.storage?.['/Storage']?.total_gb??'—'} GB</small></div></div><div class="event"><time>сейчас</time><span class="dot ok bullet"></span><div><p>Home Lab API работает</p><small>D1 · Pages Functions · LIVE</small></div></div></div>`}
const pages={overview,proxmox,network,smart,backup,docker,ai,knowledge,events};
function bindRefresh(){const b=el('#refreshBtn');if(b)b.onclick=()=>loadLive();}
function render(){const name=location.hash.slice(1);const page=pages[name]?name:'overview';document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));el('#pageTitle').textContent=data[page].title;el('#page').innerHTML=pages[page]();el('#lastUpdate').textContent=live?.updated_at?`обновлено ${new Date(live.updated_at).toLocaleTimeString('ru-RU')}`:'обновление…';}
function go(name){history.replaceState(null,'','#'+name);render();}
async function loadLive(){
  try{
    const r=await fetch('/api/status',{cache:'no-store'});
    const j=await r.json();
    live=j.live?j:null;
    const bottom=el('.sidebar-bottom');
    if(bottom){bottom.innerHTML=`<span class="dot ${live?'ok':'warn'}"></span> ${live?'LIVE':'DEMO'} <button id="refreshBtn" class="mini-btn">↻</button>`;bindRefresh();}
    render();
  }catch(e){
    live=null;render();
  }
}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>go(b.dataset.page));
el('#themeBtn').onclick=()=>document.body.classList.toggle('light');
window.go=go;
window.sortProxmox=sortProxmox;
window.setHistoryHours=setHistoryHours;
render();loadLive();loadHistory(24);setInterval(loadLive,60000);setInterval(()=>loadHistory(historyHours),60000);