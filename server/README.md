# Service Desk — Лаба 3

## Структура

```
server/
  ServiceDesk.API/   — ASP.NET Core 8 Backend
  src/               — Frontend (обновлённые файлы для клиентской части)
```

---

## Backend — запуск

### 1. Установить зависимости
- [.NET SDK 8](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- SQL Server Express **или** PostgreSQL

### 2. Выбрать базу данных

**SQL Server (по умолчанию)** — ничего менять не нужно, строка подключения:
```
Server=(localdb)\mssqllocaldb;Database=ServiceDeskDb;Trusted_Connection=True;
```

**PostgreSQL** — в `Program.cs` закомментируйте блок SQL Server и раскомментируйте Postgres,
затем в `appsettings.Development.json` укажите свои данные:
```json
"Postgres": "Host=localhost;Port=5432;Database=servicedesk;Username=postgres;Password=yourpassword"
```

### 3. Восстановить и мигрировать

```bash
cd ServiceDesk.API
dotnet restore
dotnet tool install --global dotnet-ef   # если не установлен
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 4. Запустить

```bash
dotnet run
```

Swagger UI: http://localhost:5051/swagger

---

## Frontend — обновление

Скопируйте из папки `server/src/` в вашу папку `client/src/`:
- `api/api.ts`
- `contexts/AuthContext.tsx`
- `pages/public/LoginPage.tsx`
- `pages/public/RegisterPage.tsx`

Скопируйте `server/vite.config.ts` в корень папки `client/`.

```bash
cd client
npm run dev
```

---

## Демо-аккаунты

| Роль     | Email                  | Пароль        |
|----------|------------------------|---------------|
| Admin    | admin@demo.com         | Admin123!     |
| Operator | operator1@demo.com     | Operator123!  |
| Operator | operator2@demo.com     | Operator123!  |
| Student  | student1@demo.com      | Student123!   |
| Student  | student2@demo.com      | Student123!   |
| Student  | student3@demo.com      | Student123!   |

---

## Endpoints

| Метод | Путь               | Описание                        |
|-------|--------------------|---------------------------------|
| POST  | /api/auth/register | Регистрация → accessToken       |
| POST  | /api/auth/login    | Вход → accessToken              |
| GET   | /api/auth/me       | Текущий пользователь (Bearer)   |
| GET   | /health            | Проверка работы сервера         |
