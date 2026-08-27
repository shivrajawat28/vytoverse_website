from .auth import router as auth_router
from .users import router as users_router
from .events import router as events_router
from .library import router as library_router
from .admin import router as admin_router
from .stats import router as stats_router
from .team import router as team_router
from .tasks import router as tasks_router
from .posters import router as posters_router
from .important_links import router as important_links_router

__all__ = [
    "auth_router",
    "users_router",
    "events_router",
    "library_router",
    "admin_router",
    "stats_router",
    "team_router",
    "tasks_router",
    "posters_router",
    "important_links_router",
]
