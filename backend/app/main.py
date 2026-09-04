from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import get_settings
from app.db.database import init_db
from app.api import api_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed if empty
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title="AEGIS Agentic Commerce API",
    description="Backend API for AEGIS — The Growth-and-Trust Agent for Agentic Commerce (Phase 1)",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core API routes
app.include_router(api_router)

@app.get("/")
def root():
    return {
        "name": "AEGIS Agentic Commerce Engine",
        "phase": settings.PHASE,
        "docs": "/docs",
        "api": "/api",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
