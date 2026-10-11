from masonite.routes import Route

ROUTES = [
    Route.get("/health", "HealthController@show").name("health"),
    # JSON API for the React app (docs/api.md). Runs in the "web" middleware group,
    # so it gets sessions and CSRF protection.
    Route.get("/api/session", "SessionController@show"),
    Route.post("/api/auth/register", "AuthController@register"),
    Route.post("/api/auth/login", "AuthController@login"),
    Route.post("/api/auth/logout", "AuthController@logout"),
    Route.get("/api/events", "EventsController@index"),
    Route.get("/api/events/@slug", "EventsController@show"),
    Route.post("/api/listings", "ListingsController@store"),
    Route.get("/api/listings/@id", "ListingsController@show"),
    Route.post("/api/listings/@id/publish", "ListingsController@publish"),
    Route.delete("/api/listings/@id", "ListingsController@destroy"),
    Route.get("/api/listings/@id/pdf", "ListingsController@pdf"),
    Route.get("/api/me/listings", "ListingsController@mine"),
    Route.post("/api/orders", "OrdersController@store"),
    Route.get("/api/orders/@id", "OrdersController@show"),
    Route.post("/api/orders/@id/pay", "OrdersController@pay"),
    Route.get("/api/orders/@id/ticket", "OrdersController@ticket"),
    Route.get("/api/me/orders", "OrdersController@mine"),
    Route.get("/api/@path:any", "SpaController@api_not_found"),
    # Everything else is the React app.
    Route.get("/", "SpaController@show").name("home"),
    Route.get("/@path:any", "SpaController@show"),
]
