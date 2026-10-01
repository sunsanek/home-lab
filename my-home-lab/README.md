# My Home Lab

Первая версия личной панели инфраструктуры для Cloudflare Pages.

## Что уже есть

- обзор Proxmox / VPN / Smart Home / Backup / Docker;
- отдельные разделы;
- AI Hub;
- база знаний;
- журнал событий;
- адаптивный интерфейс для ПК и телефона;
- `/api/health` как первая Pages Function;
- все показатели пока демонстрационные.

## Деплой в Cloudflare Pages

Для этой версии не нужен build step: это обычный статический HTML + Pages Function.

В Cloudflare: Workers & Pages → Create application → Pages → Connect to Git.

Build command: `exit 0`
Build output directory: `.`
Production branch: `main`

После подключения GitHub каждое изменение в `main` будет автоматически деплоиться.

## Важно перед подключением реальных данных

Не помещать пароли/API-токены Proxmox, Home Assistant, Keenetic или VPN в `app.js`.

Следующий этап:

1. сделать маленький агент на твоём Proxmox/мини-ПК;
2. агент собирает безопасные метрики;
3. отправляет их в защищённый Cloudflare API;
4. токены хранить в Cloudflare Secrets;
5. саму панель закрыть Cloudflare Access.

## Следующий этап подключения

### Proxmox
Нужно будет получать:
- CPU/RAM/temperature;
- VM/LXC status;
- storage usage;
- uptime;
- SMART/ZFS при необходимости.

### Home Assistant
Подключим состояние HA и выбранных устройств, не открывая HA наружу.

### VPN
Добавим ping/handshake и доступность серверов.

### Backups
Добавим последний успешный запуск rclone и размер/статус.
