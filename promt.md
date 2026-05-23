```markdown
# UI-Client Project Prompt (for Cursor AI)

You are a senior Frontend/Flask developer. Create a **UI-only Flask web application** that acts as a frontend client for an existing backend API.

## 📁 Expected Frontend Project Structure
```
appeals_frontend/
├── .env.example
├── requirements.txt
├── app.py
├── .gitignore
├── templates/
│   ├── index.html
│   └── admin/
│       ├── login.html
│       ├── layout.html
│       ├── users.html
│       ├── topics.html
│       └── appeals.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       └── api.js
└── README.md
```

## 📐 Architecture & Stack
- **Framework**: Flask 3.x (only for Jinja2 templates, static files, basic routing, `.env`)
- **UI**: Bootstrap 5, Vanilla JS (ES6+), Fetch API, CSS variables
- **Session**: `localStorage` (store JWT token)
- **Config**: `.env` with `BACKEND_API_URL` (default: `http://localhost:5000/api`)
- **Forbidden**: No ORM, no WTForms, no Flask-Login, no business logic. Pure UI.

## 🔗 Backend API Contract (MUST match exactly)

All requests (except login & public form) must include:
```http
Authorization: Bearer <token>
```

Expected responses:
- Success: `{success: true, data: ...}` or full object
- Error: `{detail: "...", status_code: NNN}`

### 1. Public Form
- `GET /api/public/topics` → `[{id, name}]` (active topics only)
- `POST /api/public/appeals` → `multipart/form-data` with:
  - `topic_id` (int)
  - `text` (string, 1–10000 chars)
  - `files[]` (array of files, optional)
- Returns: `{id, message}` on success

### 2. Authentication
- `POST /api/admin/login` → JSON `{email, password}`
- Returns: `{access_token, token_type: "bearer"}`

### 3. Admin: Users
- `GET /api/admin/users` → `[ {id, email, full_name, role, is_active, ...} ]`
- `POST /api/admin/users` → `{email, full_name, role, password, ...}`
- `PUT /api/admin/users/<id>` → `{full_name, role, is_active, ...}` (partial update allowed)
- `DELETE /api/admin/users/<id>` → soft delete (status 200 OK)

### 4. Admin: Topics
- `GET /api/admin/topics` → `[ {id, name, is_active, sort_order} ]`
- `POST /api/admin/topics` → `{name, sort_order?}`
- `PUT /api/admin/topics/<id>` → `{name, sort_order?, is_active?}`
- `DELETE /api/admin/topics/<id>` → soft delete (200 OK)

### 5. Admin: Appeals
- `GET /api/admin/appeals` → `[ {id, topic_name, text_preview, status, created_at} ]`
- `PATCH /api/admin/appeals/<id>/status` → `{status}` (allowed: new, in_progress, closed)
- `DELETE /api/admin/appeals/<id>` → soft delete
- `GET /api/admin/appeals/<id>` → full data + `file_url`, `created_at`, `updated_at` (no author_email)

## 🎨 UI/UX Requirements

### 1. Public Page (`/`)
- Dropdown: topics (from `GET /api/public/topics`)
- Textarea: appeal text (min 1 char)
- File input: multiple files allowed
- Submit button: enabled only if topic + text are valid
- On submit:
  - Collect data via `FormData`
  - Send POST request to `/api/public/appeals`
  - On success: show toast "Обращение отправлено", clear form, disable button
  - On error: show toast with error message (e.g. "Ошибка: {detail}")
  - Always show user feedback

### 2. Admin Login (`/admin/login`)
- Form: email + password
- On success: save `access_token` to `localStorage`, redirect to `/admin`

### 3. Admin Panel (`/admin/*`)
- Auth guard: redirect to `/admin/login` if no token
- Sidebar nav: Users • Topics • Appeals • Logout
- Users table: columns → Active, Email, Full Name, Role, Actions
  - Modal forms for Create/Edit
- Topics table: Name, Active, Sort Order
- Appeals table: Topic, Text (truncated), Status, Created, Actions
  - View modal: full text, file link, author
  - Status dropdown per row
  - Delete button
- After any operation (create, edit, delete, status change):
  - On success: show toast (e.g. "Пользователь обновлён")
  - On error: show toast with error (e.g. "Ошибка: {detail}")
  - Toast auto-hides after 5 seconds

## ⚙️ JS Implementation
- `api.js`: fetch wrappers with auto `Authorization` header
- Error handling: 401 → clear token + redirect
- Use `FormData` for file uploads
- Async CRUD, no page reloads
- Use `<template>` or DOM creation, avoid `innerHTML`
- Loading spinners, disabled buttons during requests
- Responsive (Bootstrap 5)

## 📦 Output Format
1. Full file tree
2. Each file in block:
   ```py
   # === FILE: app.py ===
   ```
3. `requirements.txt`: flask, python-dotenv
4. `.env.example`: `BACKEND_API_URL=http://localhost:5000/api`
5. Brief setup guide
```

