from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.auth import router as auth_router

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Jai Bhavani Pearls & Beads - Secure OTP Authentication API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Robust CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Retry-After"]
)

# Mount Auth router under /api/v1
app.include_router(auth_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
