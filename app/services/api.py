"""Small helpers for JSON API controllers."""


class ApiError(Exception):
    def __init__(self, status, message, errors=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.errors = errors or {}


def error_response(response, err):
    return response.json({"message": err.message, "errors": err.errors}, status=err.status)


def require_user(request):
    user = request.user()
    if not user:
        raise ApiError(401, "Please log in first.")
    return user


def find_or_404(model, value, message="Not found."):
    if not str(value).isdigit():
        raise ApiError(404, message)
    record = model.find(int(value))
    if not record:
        raise ApiError(404, message)
    return record


def api(handler):
    """Turn ApiError raised inside a controller method into a JSON error response."""
    import functools
    import inspect

    from masonite.response import Response

    @functools.wraps(handler)
    def wrapper(self, *args, **kwargs):
        try:
            return handler(self, *args, **kwargs)
        except ApiError as err:
            response = next(
                (a for a in list(args) + list(kwargs.values()) if isinstance(a, Response)), None
            )
            return error_response(response, err)

    # Keep the original signature so Masonite's container still injects arguments.
    wrapper.__signature__ = inspect.signature(handler)
    return wrapper
