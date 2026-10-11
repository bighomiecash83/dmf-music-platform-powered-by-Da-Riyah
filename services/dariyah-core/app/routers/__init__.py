from fastapi import APIRouter

from app.routers.admin import router as admin_router
from app.routers.artists import router as artists_router
from app.routers.releases import router as releases_router
from app.routers.royalties import router as royalties_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router
from app.routers.dsp import router as dsp_router
from app.routers.ai_tools import router as ai_router
from app.routers.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(artists_router, prefix="/artists", tags=["artists"])
api_router.include_router(releases_router, prefix="/releases", tags=["releases"])
api_router.include_router(royalties_router, prefix="/royalties", tags=["royalties"])
api_router.include_router(campaigns_router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(dsp_router, prefix="/dsp", tags=["dsp"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
