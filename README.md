# CORE NEWS API — установка (Cloudflare Workers)

Это настоящий бэкенд для новостной ленты: сторонняя CMS сможет публиковать
новости через `POST`, а сайт будет их читать через `GET`. Бесплатно, на
твоём уже существующем аккаунте Cloudflare.

Понадобится 15–20 минут. Два пути: через сайт Cloudflare (проще, без
терминала) или через CLI-инструмент Wrangler (быстрее для повторных
деплоев). Ниже — оба варианта.

---

## Вариант A — через сайт Cloudflare (без терминала)

### 1. Создай KV namespace (хранилище данных)

1. Зайди на [dash.cloudflare.com](https://dash.cloudflare.com)
2. В левом меню → **Workers & Pages** → вкладка **KV**
3. Нажми **Create a namespace**
4. Название: `coreplus-news`
5. Нажми **Add** — скопируй появившийся **Namespace ID**, он понадобится дальше

### 2. Создай Worker

1. **Workers & Pages** → **Create application** → **Create Worker**
2. Название: `coreplus-news-api`
3. Нажми **Deploy** (создастся заглушка — это нормально)
4. Нажми **Edit code**
5. Удали весь код-заглушку и вставь содержимое файла `worker.js` из этой папки
6. Нажми **Save and Deploy**

### 3. Привяжи KV к Worker

1. В настройках Worker → вкладка **Settings** → **Variables**
2. Раздел **KV Namespace Bindings** → **Add binding**
3. Variable name: `NEWS_KV`
4. KV namespace: выбери `coreplus-news` (созданный в шаге 1)
5. **Save**

### 4. Добавь секретный токен (пароль для CMS)

1. Там же в **Settings** → **Variables** → **Environment Variables**
2. **Add variable**, тип — **Secret** (обязательно Secret, не Text!)
3. Variable name: `API_TOKEN`
4. Value: придумай длинный случайный пароль, например:
   ```
   coreplus_news_9f3a7b2e1d8c4f6a0b5e9d2c7a1f4b8e
   ```
   Сохрани его — это то, что ты дашь сторонней CMS для публикации новостей.
5. **Save**

### 5. Подключи домен

1. **Settings** → **Domains & Routes** → **Add**
2. Custom domain: `api.coreplus-tech.ru`
3. Cloudflare сам добавит нужную DNS-запись — жди 1–2 минуты

Готово! API будет доступен по адресу `https://api.coreplus-tech.ru/api/news`

---

## Вариант B — через Wrangler (терминал)

Если удобнее из VS Code:

```bash
npm install -g wrangler
cd api
wrangler login

# создать KV и получить его id
wrangler kv namespace create "NEWS_KV"
# скопируй id из вывода и вставь в wrangler.toml вместо PASTE_YOUR_KV_NAMESPACE_ID_HERE

# добавить секретный токен
wrangler secret put API_TOKEN
# введёт запросит значение — вставь свой длинный пароль

# задеплоить
wrangler deploy
```

---

## Проверка, что всё работает

Открой в браузере:
```
https://api.coreplus-tech.ru/api/news
```
Должно вернуться `{"items":[]}` — пусто, но без ошибок. Значит API работает.

## Подключение к сайту

Открой `news.html`, найди строку:
```js
const API_URL = ''; // e.g. 'https://api.coreplus-tech.ru/api/news'
```
Впиши туда свой адрес:
```js
const API_URL = 'https://api.coreplus-tech.ru/api/news';
```
Сохрани, запушь на GitHub — сайт начнёт брать новости из API вместо
локального `news-data.json`.

---

## Как публиковать новости

### Вручную (curl / Postman)

```bash
curl -X POST https://api.coreplus-tech.ru/api/news \
  -H "Authorization: Bearer ТВОЙ_ТОКЕН" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Заголовок новости",
    "excerpt": "Краткое описание в одно-два предложения",
    "source": "coreplus",
    "url": "https://coreplus-tech.ru/events.html",
    "date": "2026-08-16",
    "featured": true
  }'
```

`source` — один из: `coreplus`, `telegram`, `dzen`, `vc`, `habr`, `rbc`

### Из сторонней CMS

Дай CMS-платформе (WordPress, Strapi, Notion + Zapier, Make.com,
собственный скрипт и т.д.) два параметра:

- **Endpoint:** `https://api.coreplus-tech.ru/api/news`
- **Метод:** `POST`
- **Заголовок:** `Authorization: Bearer <твой API_TOKEN>`
- **Тело запроса (JSON):** `title`, `excerpt`, `source`, `url`, `date`, `featured`

Большинство no-code инструментов (Zapier, Make, n8n) умеют делать такой
запрос через блок "HTTP Request" / "Webhook" без единой строчки кода.

### Обновление и удаление

```bash
# обновить
curl -X PUT https://api.coreplus-tech.ru/api/news/ID_НОВОСТИ \
  -H "Authorization: Bearer ТВОЙ_ТОКЕН" \
  -H "Content-Type: application/json" \
  -d '{"title": "Новый заголовок"}'

# удалить
curl -X DELETE https://api.coreplus-tech.ru/api/news/ID_НОВОСТИ \
  -H "Authorization: Bearer ТВОЙ_ТОКЕН"
```

---

## Важно про безопасность

- **Никогда не публикуй `API_TOKEN` в открытом виде** — не вставляй его в
  `news.html` или любой публичный файл на сайте. Он нужен только на
  стороне CMS/сервера, который публикует новости.
- Чтение (`GET /api/news`) — открытое, без токена, это нормально: ленту
  новостей видят все посетители сайта.
- Запись (`POST`/`PUT`/`DELETE`) — защищена токеном.

## Бесплатные лимиты Cloudflare

- Workers: 100 000 запросов в день — бесплатно
- KV: 100 000 чтений и 1 000 записей в день — бесплатно

Для новостной ленты сайта этого хватит с большим запасом.
