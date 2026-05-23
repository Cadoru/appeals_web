# Appeals Frontend (UI Client)

Flask-приложение — только UI-клиент для backend API. Бизнес-логика и БД на стороне backend.

## Структура

```
├── app.py              # маршруты Flask (шаблоны + static)
├── requirements.txt
├── .env.example
├── templates/          # Jinja2
├── static/
│   ├── css/style.css
│   └── js/
│       ├── api.js      # Fetch-обёртки, JWT в localStorage
│       └── main.js     # логика страниц
└── README.md
```

## Требования

- Python 3.10+
- Запущенный backend API (по умолчанию `http://localhost:5000/api`)

## Установка и запуск

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# при необходимости отредактируйте BACKEND_API_URL в .env
python app.py
```

Приложение откроется на `http://127.0.0.1:3000`.

## Страницы

| URL | Описание |
|-----|----------|
| `/` | Публичная форма обращения |
| `/admin/login` | Вход администратора |
| `/admin/users` | Управление пользователями |
| `/admin/topics` | Управление темами |
| `/admin/appeals` | Список и статусы обращений |

JWT сохраняется в `localStorage` (`access_token`). При ответе `401` токен очищается и выполняется редирект на `/admin/login`.

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `BACKEND_API_URL` | `http://localhost:5000/api` | Базовый URL backend API |

## CORS

Если frontend и backend на разных origin, backend должен разрешать CORS для origin frontend (например `http://127.0.0.1:3000`).
