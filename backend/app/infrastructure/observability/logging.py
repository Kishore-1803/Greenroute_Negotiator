"""
infrastructure/observability/logging.py

Structured logging to stdout (Part L: twelve-factor -- no app-managed log files in the
default deployment). One JSON line per log record; request_id/trip_id/operation are passed
via `extra=` so they show up as fields, not string-interpolated into the message.

Never log secrets: the formatter has no code path that could serialize a Settings object or
an API key -- callers must not pass one in `extra`.
"""

from __future__ import annotations

import json
import logging
import sys
import time

_RESERVED = set(logging.LogRecord(__name__, 0, "", 0, "", (), None).__dict__)


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        extras = {k: v for k, v in record.__dict__.items() if k not in _RESERVED}
        payload.update(extras)
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(log_level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers.clear()
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
