# Service Desk (PC Doc)

Монорепозиторий: **React (Vite + TypeScript)** и **ASP.NET Core 8 Web API** с **Identity**, **JWT** и **PostgreSQL**.

## Структура

| Папка | Описание |
|--------|----------|
| `client/` | SPA: Ant Design, React Router, TanStack Query |
| `server/ServiceDesk.API/` | REST API, EF Core, Swagger |

## Требования

- [Node.js](https://nodejs.org/) 18+ и npm  
- [.NET SDK 8](https://dotnet.microsoft.com/download/dotnet/8.0)  
- [PostgreSQL](https://www.postgresql.org/) (локально или удалённо)

## База данных

1. Создайте БД и пользователя в PostgreSQL (или используйте существующие).  
2. Укажите строку подключения в `server/ServiceDesk.API/appsettings.Development.json` в секции `ConnectionStrings` → `Postgres`.  
3. При первом запуске API применяются миграции (`MigrateAsync` в `Program.cs`).  
4. В среде **Development** выполняется сид ролей и демо-пользователей (`DbInitializer`).

При смене модели сущностей:

```powershell
cd server\ServiceDesk.API
dotnet ef migrations add <ИмяМиграции>
dotnet ef database update
```

(Пакет `dotnet-ef`: `dotnet tool install --global dotnet-ef`.)

## Запуск backend

```powershell
cd server\ServiceDesk.API
dotnet restore
dotnet run
```

- HTTP: `http://localhost:5051`  
- Swagger: `http://localhost:5051/swagger`  
- Health: `GET /health`

## Запуск frontend

Прокси Vite перенаправляет `/api` и `/health` на `http://localhost:5051` (см. `client/vite.config.ts`). Сначала запустите API.

```powershell
cd client
npm install
npm run dev
```

Откройте в браузере адрес, который выведет Vite (по умолчанию `http://localhost:5173`).

Сборка production:

```powershell
cd client
npm run build
```

## Роли и демо-аккаунты

В API используются роли **client**, **master**, **admin**. Новые пользователи при регистрации получают роль **client**.

После чистой БД и сида (Development):

| Роль   | Email               | Пароль       |
|--------|---------------------|-------------|
| admin  | admin@demo.com      | Admin123!   |
| master | operator1@demo.com  | Operator123!|
| client | student1@demo.com   | Student123! |

## Переменные и секреты

- Ключ JWT задаётся в `appsettings.json` / `appsettings.Development.json` (`Jwt:Key`, длина не менее 32 символов).  
- Для production используйте переменные окружения или User Secrets, не коммитьте реальные пароли и ключи.

## Лицензия

Учебный проект.
