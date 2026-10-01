#!/usr/bin/env python3
import json, os, shutil, subprocess, time, urllib.request, urllib.error
from datetime import datetime, timezone

API_URL = os.environ.get('HOME_LAB_API_URL', '').rstrip('/') + '/api/ingest'
TOKEN = os.environ.get('HOME_LAB_TOKEN', '')
INTERVAL = int(os.environ.get('HOME_LAB_INTERVAL', '60'))


def cmd(args):
    try:
        return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL, timeout=10).strip()
    except Exception:
        return ''


def cpu_percent():
    def sample():
        vals = list(map(int, cmd(['awk', '/^cpu /{print $2,$3,$4,$5,$6,$7,$8,$9}', '/proc/stat']).split()))
        idle = vals[3] + vals[4]
        total = sum(vals)
        return total, idle
    a = sample(); time.sleep(0.5); b = sample()
    total = b[0] - a[0]; idle = b[1] - a[1]
    return round((1 - idle / total) * 100, 1) if total else 0


def memory_percent():
    data = {}
    with open('/proc/meminfo') as f:
        for line in f:
            k, v = line.split(':', 1)
            data[k] = int(v.strip().split()[0])
    total = data.get('MemTotal', 0); avail = data.get('MemAvailable', 0)
    return round((total - avail) / total * 100, 1) if total else 0


def temperatures():
    temps = []
    base = '/sys/class/thermal'
    if os.path.isdir(base):
        for name in os.listdir(base):
            p = os.path.join(base, name, 'temp')
            try:
                v = int(open(p).read().strip()) / 1000
                if 10 <= v <= 110: temps.append(v)
            except Exception: pass
    if not temps:
        out = cmd(['sensors', '-j'])
        if out:
            try:
                def walk(x):
                    if isinstance(x, dict):
                        for k, v in x.items():
                            if isinstance(v, (int, float)) and k.endswith('_input') and 10 <= v <= 110: temps.append(float(v))
                            else: walk(v)
                    elif isinstance(x, list):
                        for v in x: walk(v)
                walk(json.loads(out))
            except Exception: pass
    return round(max(temps), 1) if temps else None


def resources():
    paths = {}
    for p in ['/', '/Storage']:
        if os.path.exists(p):
            u = shutil.disk_usage(p)
            paths[p] = {'used_gb': round(u.used/1024**3, 1), 'total_gb': round(u.total/1024**3, 1), 'used_percent': round(u.used/u.total*100, 1)}
    return paths


def vms():
    raw = cmd(['pvesh', 'get', '/cluster/resources', '--type', 'vm', '--output-format', 'json'])
    if not raw: return []
    try:
        rows = json.loads(raw)
        return [{'id': r.get('vmid'), 'name': r.get('name'), 'type': r.get('type'), 'status': r.get('status'), 'cpu': round((r.get('cpu') or 0)*100, 1), 'mem_gb': round((r.get('mem') or 0)/1024**3, 2), 'maxmem_gb': round((r.get('maxmem') or 0)/1024**3, 2)} for r in rows]
    except Exception:
        return []


def uptime():
    try:
        seconds = float(open('/proc/uptime').read().split()[0])
        d, rem = divmod(int(seconds), 86400); h, rem = divmod(rem, 3600); m, _ = divmod(rem, 60)
        return f'{d} дн. {h:02d} ч. {m:02d} мин.'
    except Exception: return None


def payload():
    return {'source': 'proxmox-agent', 'host': os.uname().nodename, 'timestamp': datetime.now(timezone.utc).isoformat(), 'cpu': cpu_percent(), 'ram': memory_percent(), 'temperature': temperatures(), 'uptime': uptime(), 'storage': resources(), 'vms': vms()}


def send(data):
    req = urllib.request.Request(API_URL, data=json.dumps(data).encode(), headers={'Content-Type':'application/json', 'Authorization':f'Bearer {TOKEN}'}, method='POST')
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode()

if __name__ == '__main__':
    if not API_URL or not TOKEN:
        raise SystemExit('Set HOME_LAB_API_URL and HOME_LAB_TOKEN')
    while True:
        try:
            print(send(payload()), flush=True)
        except Exception as e:
            print(f'ERROR: {e}', flush=True)
        time.sleep(INTERVAL)
