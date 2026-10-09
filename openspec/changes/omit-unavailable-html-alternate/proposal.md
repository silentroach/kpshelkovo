# Proposal

## Why

Negotiated Markdown `/meetings/` объявляет HTML alternate, хотя HTML по этому адресу отвечает 404. HTTP-клиент получает ссылку на несуществующее представление. Задача: [#942](https://github.com/silentroach/kpshelkovo/issues/942).

## What Changes

- Общий Markdown-обработчик получает необязательное значение обратного HTML alternate от конфигурации маршрута.
- Markdown-only вход не объявляет HTML, а существующие HTML/Markdown-пары сохраняют обнаружение альтернатив в GET и HEAD.
- Сохраняются MIME, robots, кеширование, `Vary` и прямой Markdown URL.
- HTML-хаб #139, JSON/API #479, генератор nginx и изменение deploy-потока не входят в объём.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `public-markdown-delivery`: уточнить применение HTTP alternate к GET и HEAD и явный сценарий без опубликованного HTML.

## Impact

- `/ops/nginx/kpshelkovo-online.conf`, локальная адресная HTTP-проверка настоящим nginx. Существующий deploy уже проверяет и устанавливает конфиг; workflow не меняется.
- Production-приёмка обязательна: после человеческого merge/deploy проверить GET и HEAD Markdown-only входа, прямой Markdown URL и опубликованную HTML/Markdown-пару, сохранив MIME и заголовки обнаружения.
- Готовый PR использует `Refs #942`. Issue остаётся открыт, а sync/archive откладываются до подтверждённой production-приёмки и завершающего изменения документов. Сам PR не разрешает агенту merge или production deploy.
