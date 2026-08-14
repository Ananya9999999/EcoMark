"""Consistent error envelope (spec §6).

Every failure leaves the API as::

    {"error": {"code": "...", "message": "...", "field": "..."|null}}

Route handlers raise ``ApiError`` (or a plain ``HTTPException`` for the
simple cases); the handlers registered here do the shaping, so no stack
trace ever reaches the client.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Status code -> default machine-readable code
_DEFAULT_CODES = {
    400: "BAD_REQUEST",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    502: "LEDGER_ERROR",
    503: "UNAVAILABLE",
}


class ApiError(HTTPException):
    """An HTTPException that also carries a code and the offending field."""

    def __init__(
        self,
        status_code: int,
        message: str,
        code: str | None = None,
        field: str | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=message)
        self.code = code or _DEFAULT_CODES.get(status_code, "ERROR")
        self.field = field


def _envelope(code: str, message: str, field: str | None) -> dict:
    return {"error": {"code": code, "message": message, "field": field}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, str(exc.detail), exc.field),
        )

    @app.exception_handler(HTTPException)
    async def _http_error(_: Request, exc: HTTPException) -> JSONResponse:
        code = _DEFAULT_CODES.get(exc.status_code, "ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(code, str(exc.detail), None),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        loc = [p for p in first.get("loc", []) if p not in ("body", "query", "path")]
        return JSONResponse(
            status_code=422,
            content=_envelope(
                "VALIDATION_ERROR",
                first.get("msg", "That request could not be read."),
                ".".join(str(p) for p in loc) or None,
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        # Never leak internals; the server log keeps the detail.
        return JSONResponse(
            status_code=500,
            content=_envelope(
                "INTERNAL_ERROR",
                "Something went wrong on the server. Try again in a moment.",
                None,
            ),
        )
