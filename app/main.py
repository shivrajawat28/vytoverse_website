from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .routes import auth_routes, page_routes, admin_routes, user_routes, library_routes
from .database import engine, Base
from . import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


app.include_router(page_routes.router)
app.include_router(auth_routes.router)
app.include_router(admin_routes.router)
app.include_router(user_routes.router)
app.include_router(library_routes.router)