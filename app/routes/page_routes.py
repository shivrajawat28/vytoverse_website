from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter()
templates = Jinja2Templates(directory=os.path.join(BASE_DIR,"templates"))

@router.get("/", response_class = HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/login", response_class = HTMLResponse)
def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/signup", response_class = HTMLResponse)
def signup(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@router.get("/team", response_class = HTMLResponse)
def team(request: Request):
    return templates.TemplateResponse("team.html", {"request": request})

@router.get("/about", response_class = HTMLResponse)
def about(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})

@router.get("/admin", response_class = HTMLResponse)
def admin_page(request: Request):
    return templates.TemplateResponse("admin.html",{"request": request})

@router.get("/contact", response_class=HTMLResponse)
def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})

@router.get("/library", response_class=HTMLResponse)
def library_page(request: Request):
    return templates.TemplateResponse("libraries.html", {"request": request})

@router.get("/profile", response_class=HTMLResponse)
def profile_page(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})


@router.get("/tasks", response_class=HTMLResponse)
def tasks_page(request: Request):
    return templates.TemplateResponse("tasks.html", {"request": request})
