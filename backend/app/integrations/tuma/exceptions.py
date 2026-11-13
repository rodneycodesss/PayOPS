class TumaError(Exception):
    """Base exception for all Tuma API interactions."""
    pass


class TumaAuthError(TumaError):
    """Authentication or authorization failed (401/403)."""
    pass


class TumaRateLimitError(TumaError):
    """Exceeded Tuma API rate limits (429)."""
    pass


class TumaValidationError(TumaError):
    """Input payload validation error (400/422)."""
    pass


class TumaNetworkError(TumaError):
    """Network connection, timeout or DNS error."""
    pass


class NotSupportedError(TumaError):
    """Raised when an unconfirmed Tuma capability is invoked."""
    pass
