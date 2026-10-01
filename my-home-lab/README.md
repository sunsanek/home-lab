# My Home Lab

Личная панель домашней инфраструктуры для Cloudflare Pages.

## Сейчас
- Dashboard с разделами Proxmox / VPN / Smart Home / Backups / Docker / AI / Knowledge / Journal.
- Demo-данные заменяются реальными после подключения D1 и Proxmox agent.
- Pages Functions: `/api/health`, `/api/status`, `/api/ingest`.

## Подключение Proxmox
1. Создай D1 database, например `home-lab`.
2. Выполни `db/schema.sql`.
3. В Cloudflare Pages → Settings → Functions/Bindings добавь D1 binding с переменной `HOME_LAB_DB`.
4. В Variables and Secrets добавь secret `INGEST_TOKEN` со случайной длинной строкой.
5. После деплоя на Proxmox скопируй `agent/home_lab_agent.py` в `/opt/home-lab-agent/`.
6. Создай `/etc/home-lab-agent.env` по образцу `agent/home-lab-agent.env.example`, указав URL сайта и тот же токен.
7. Скопируй `agent/home-lab-agent.service` в `/etc/systemd/system/`.
8. Выполни:
   `systemctl daemon-reload && systemctl enable --now home-lab-agent`

Агент делает исходящее HTTPS-соединение к Cloudflare. Proxmox не нужно публиковать в интернет.

## Безопасность
- Не помещай токен в GitHub.
- Не отправляй root-пароль в чат.
- Для панели желательно включить Cloudflare Access, прежде чем добавлять чувствительные данные.
