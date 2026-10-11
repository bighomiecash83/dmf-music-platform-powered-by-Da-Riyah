"""
Structured JSON logging for the DMF platform.
All log entries include trace_id, org_id, and service name for aggregation.
"""
import logging
import sys
import uuid
from contextvars import ContextVar
from typing import Optional

import structlog

# Context variables — set per-request by middleware
request_trace_id: ContextVar[str] = ContextVar("trace_id", default="")
request_org_id: ContextVar[str] = ContextVar("org_id", default="")


def add_request_context(logger, method, event_dict):  # noqa: ARG001
    trace = request_trace_id.get()
    event_dict["trace_id"] = trace if trace else str(uuid.uuid4())
    org = request_org_id.get()
    if org:
        event_dict["org_id"] = org
    return event_dict


def configure_logging(log_level: str = "INFO", service_name: str = "dariyah-core") -> None:
    """
    Configure structlog for JSON output in production, pretty-print in dev.
    Call once at application startup.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        add_request_context,
        structlog.processors.StackInfoRenderer(),
    ]

    structlog.configure(
        processors=shared_processors + [structlog.processors.JSONRenderer()],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )


def get_logger(name: Optional[str] = None):
    return structlog.get_logger(name)
