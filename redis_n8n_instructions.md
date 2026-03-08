Для реализации истории диалогов на стороне n8n без изменения кода сайта, отличным решением будет использование In-Memory базы данных **Redis**.

Я отменил изменения в коде вашего сайта `app.js`. Теперь сайт снова передает только `{"message": "текст"}`. 

Вот пошаговая инструкция, как настроить сохранение истории в n8n с помощью Redis:

### Шаг 1: Подготовка Redis
Вам нужен запущенный сервер Redis. Если n8n установлен через Docker, вы можете легко добавить Redis в ваш `docker-compose.yml`:
```yaml
  redis:
    image: redis:alpine
    restart: always
```

### Шаг 2: Установка Redis Node в n8n
Если у вас в n8n нет встроенной ноды Redis, её нужно установить из раздела Community Nodes:
1. Зайдите в **Settings -> Community Nodes**.
2. Установите пакет: `n8n-nodes-redis`.

### Шаг 3: Настройка логики в n8n

Вам нужно перестроить цепочку обработки входящего вебхука. Общая логика должна выглядеть так:

`Webhook` ➡️ `Redis (Get History)` ➡️ `Set (Prepare Prompt)` ➡️ `HTTP Request (OpenAI)` ➡️ `Redis (Save History)` ➡️ `Respond to Webhook`

#### 1. Идентификация сессии
Чтобы Redis понимал, чья это история, вам нужен уникальный идентификатор сессии (Session ID). Так как на сайте нет авторизации, вы можете:
- Либо генерировать случайный ID на фронтенде и отправлять его вместе с сообщением `{"message": "...", "sessionId": "12345"}` (потребует минимальных изменений в `app.js`).
- Либо, если это решение работает только для Telegram-виджета и IP пользователя не меняется часто, использовать IP-адрес из заголовков вебхука в качестве ключа. 

*Рекомендуется первый вариант (передача sessionId), так как IP может быть общим для многих пользователей мобильной сети.*

#### 2. Нода Redis (Get History)
Сразу после вебхука добавьте ноду **Redis**.
- **Operation**: `Get` (или `Custom Command`: `LRANGE chat_history_{{ $json.sessionId }} 0 -1`)
- **Key**: `chat_history_{{ $json.sessionId }}`

Если история пустая (новый диалог), нода вернет пустоту.

#### 3. Формирование промпта (Code Node или Set)
Здесь вам нужно собрать массив `messages` для OpenAI.
Если история есть в Redis, вы парсите её (обычно это JSON-строка) и добавляете в конец новое сообщение пользователя:
```javascript
let history = [];
if ($input.item.json.redis_data) {
  history = JSON.parse($input.item.json.redis_data);
}

// Добавляем текущее сообщение
history.push({
  "role": "user",
  "content": $('Webhook').item.json.body.message
});

return {
  history: history
};
```

В ноде **HTTP Request (OpenAI)** вы отправляете массив `messages`, который состоит из вашего `system_prompt` и массива `history`.

#### 4. Сохранение ответа в Redis (Save History)
После получения ответа от OpenAI (HTTP Request), вам нужно добавить ответ ассистента в историю и сохранить её обратно в Redis.
Добавляем еще одну ноду Data Transformation (Code) для обновления массива:
```javascript
let history = $('Code - Prepare Prompt').item.json.history;

// Добавляем ответ OpenAI
history.push({
  "role": "assistant",
  "content": $input.item.json.choices[0].message.content
});

return {
  historyString: JSON.stringify(history)
};
```

Затем добавляем ноду **Redis**:
- **Operation**: `Set`
- **Key**: `chat_history_{{ $('Webhook').item.json.body.sessionId }}`
- **Value**: `{{ $json.historyString }}`
- Рекомендуется также установить **TTL** (время жизни), например, 3600 секунд (1 час), чтобы старые чаты удалялись и не занимали память.

#### 5. Возврат ответа
Последней нодой идет **Respond to Webhook**, которая возвращает текст ответа клиенту.

Таким образом, ваше приложение (сайт) остается "глупым" интерфейсом, а всё управление состоянием чата происходит на бэкенде в n8n с использованием Redis!
