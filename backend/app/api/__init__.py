from fastapi import APIRouter
from .health import router as health_router
from .intents import router as intents_router
from .agent import router as agent_router
from .trust import router as trust_router
from .commerce import router as commerce_router
from .growth import router as growth_router
from .security import security_router
from .ledger import ledger_router
from .replay import replay_router
from .demo import demo_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(intents_router)
api_router.include_router(agent_router)
api_router.include_router(trust_router)
api_router.include_router(commerce_router)
api_router.include_router(growth_router)
api_router.include_router(security_router)
api_router.include_router(ledger_router)
api_router.include_router(replay_router)
api_router.include_router(demo_router)

__all__ = ["api_router"]
