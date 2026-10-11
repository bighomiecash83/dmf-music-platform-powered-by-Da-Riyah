"""
FastAPI middleware stack:
- RequestIDMiddleware: injects X-Trace-ID on every request/response
- TimingMiddleware: logs request duration
- RateLimitMiddleware: per-API-key sliding window via Redis
"""
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger, request_trace_id, request_org_id

logger = get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign a trace ID to every request; echo it in the response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())
        token = request_trace_id.set(trace_id)
        try:
            response = await call_next(request)
        finally:
            request_trace_id.reset(token)
        response.headers["X-Trace-ID"] = trace_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Log method, path, status code, and duration for every request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extract org_id from a validated API key and store in context.
    Downstream handlers can read request_org_id.get() without re-querying.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # The API key validator (dependency) sets org_id on request.state
        org_id = getattr(request.state, "org_id", "")
        token = request_org_id.set(org_id)
        try:
            response = await call_next(request)
        finally:
            request_org_id.reset(token)
        return response
