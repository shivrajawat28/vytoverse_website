# VytoVerse

**Where Innovation Meets Code** — A futuristic full-stack college technology club platform.

![VytoVerse](https://img.shields.io/badge/Built_with-React%20%2B%20FastAPI-00D4FF?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-00D4FF?style=for-the-badge)

---

## Features

### Public Pages
- **Home** — Hero with interactive 3D visualization, animated stats, events preview, team preview
- **About** — Mission, vision, journey timeline, why join section
- **Events** — Upcoming and completed events with filtering
- **Team** — Team member profiles with social links and search
- **Library** — Learning resources with category/type filters and search

### User Features
- JWT authentication (login/signup)
- Profile management with image upload
- Stars gamification display
- Social links

### Admin Dashboard
- Overview statistics
- User management with role/star assignment
- Team membership and role management
- Event CRUD (create, edit, delete)
- Library resource CRUD
- File uploads for events and resources

### Design System
- Dark cyber/space aesthetic with glassmorphism
- Custom color palette (navy, cyan, violet accents)
- Responsive design (mobile → desktop)
- Smooth animations with Framer Motion
- Interactive 3D hero with Three.js / React Three Fiber
- Accessible forms and keyboard navigation

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| Three.js / R3F | 3D visualization |
| React Router v7 | Routing |
| Lucide React | Icons |
| Axios | HTTP client |
| react-hot-toast | Notifications |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | Web framework |
| PostgreSQL | Database |
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| python-jose | JWT authentication |
| passlib/bcrypt | Password hashing |
| Alembic | Database migrations |

---

## Project Structure

```
vytoverse_wb/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # Database connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routes/              # API routes
│   │   ├── auth/                # Authentication
│   │   └── utils/
│   │       └── seed.py          # Development seed data
│   ├── uploads/                 # File uploads (local dev)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Page components
│   │   ├── layouts/
│   │   ├── context/
│   │   ├── services/
│   │   ├── types/
│   │   ├── index.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── netlify.toml
│   ├── package.json
│   └── vite.config.ts
│
├── netlify.toml                 # Netlify build config
├── README.md
└── .gitignore
```

---

## Local Development

### Prerequisites
- **Node.js** 18+
- **Python** 3.10+
- **PostgreSQL** 14+

### 1. Clone the repository

```bash
git clone <repository-url>
cd vytoverse_wb
```

### 2. Database setup

```bash
psql -U postgres -c "CREATE DATABASE vytoverse;"
```

### 3. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Seed development data (optional)
python -c "from app.utils.seed import seed_database; seed_database()"

# Start the backend
uvicorn app.main:app --reload --port 8000
```

Backend available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at `http://localhost:5173`

The Vite dev server proxies `/api` requests to the backend automatically.

### Default Development Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@vytoverse.com | admin123 |
| User | aarav@example.com | password123 |

> ⚠️ These are **development-only** credentials. Do not use in production.

---

## Production Architecture

```
Browser
  ↓
Netlify (Frontend)
  ↓  HTTPS
Render (FastAPI Backend)
  ↓  SSL
Render PostgreSQL
```

### Services

| Service | Platform | Purpose |
|---|---|---|
| Frontend | Netlify | Static React SPA |
| Backend | Render Web Service | FastAPI API server |
| Database | Render PostgreSQL | Persistent data |

---

## Environment Variables

### Backend (set in Render)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens | *(generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`)* |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `1440` |
| `FRONTEND_URL` | Deployed frontend URL for CORS | `https://your-app.netlify.app` |
| `BACKEND_URL` | Deployed backend URL | `https://your-app.onrender.com` |
| `PORT` | Server port (set by Render) | *(auto-set by Render)* |
| `UPLOAD_DIR` | Upload storage directory | `uploads` |

### Frontend (set in Netlify)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://your-app.onrender.com` |

> ⚠️ Only public client-side variables may use the `VITE_` prefix.

---

## Deployment

### Render (Backend + Database)

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → New → PostgreSQL
   - Choose the same region as your web service
   - Copy the **Internal Database URL**

2. **Create Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Configure:
     - **Environment:** Python
     - **Build Command:** `pip install -r backend/requirements.txt`
     - **Start Command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables:
     - `DATABASE_URL` = *(Internal Database URL from step 1)*
     - `JWT_SECRET` = *(generate a strong random secret)*
     - `FRONTEND_URL` = `https://your-app.netlify.app`
     - `BACKEND_URL` = `https://your-app.onrender.com`
     - `UPLOAD_DIR` = `uploads`

3. **Seed Production Data (optional)**
   - After first deploy, use Render Shell to run:
   ```bash
   cd backend && python -c "from app.utils.seed import seed_database; seed_database()"
   ```
   - Or create an admin user manually via the API

### Netlify (Frontend)

1. Go to Netlify Dashboard → New site from Git
2. Connect your GitHub repository
3. Configure:
   - **Base directory:** *(leave empty — netlify.toml handles it)*
   - **Build command:** *(handled by netlify.toml)*
   - **Publish directory:** *(handled by netlify.toml)*
4. Add environment variable:
   - `VITE_API_URL` = `https://your-app.onrender.com`
5. Deploy

> The `netlify.toml` in the repository root handles build configuration and SPA routing automatically.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/signup` | Create account | No |
| POST | `/auth/login` | Login | No |
| GET | `/auth/me` | Get current user | Yes |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users/me` | Get profile | Yes |
| PUT | `/users/me` | Update profile | Yes |
| POST | `/users/me/profile-image` | Upload profile image | Yes |

### Team
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/team` | List team members | No |

### Events (Public)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/events` | List events | No |
| GET | `/events/upcoming` | Upcoming events | No |
| GET | `/events/{id}` | Event detail | No |

### Library (Public)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/library` | List resources | No |
| GET | `/library/categories` | List categories | No |
| GET | `/library/{id}` | Resource detail | No |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/users` | List users | Admin |
| PUT | `/admin/users/{id}` | Update user | Admin |
| PUT | `/admin/users/{id}/team` | Manage team membership | Admin |
| POST | `/admin/users/{id}/stars` | Assign stars | Admin |
| POST | `/admin/events` | Create event | Admin |
| PUT | `/admin/events/{id}` | Update event | Admin |
| DELETE | `/admin/events/{id}` | Delete event | Admin |
| POST | `/admin/library` | Create resource | Admin |
| PUT | `/admin/library/{id}` | Update resource | Admin |
| DELETE | `/admin/library/{id}` | Delete resource | Admin |

### Health
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | API info | No |
| GET | `/health` | Health check | No |

---

## Production Limitations

### File Uploads
File uploads (profile images, event images, library files) are currently stored on the local filesystem. On Render's ephemeral filesystem, **uploaded files will be lost on redeploy**.

To persist uploads in production, configure cloud object storage (e.g. AWS S3, Cloudflare R2) by setting the `STORAGE_*` environment variables. The storage abstraction is designed to make this switch straightforward.

### Seed Data
The development seed data (admin credentials, sample users, events) is for local development only. Do not run the seed script in production unless you intend to create demo data.

---

## License

MIT
# vytoverse_website
