from masonite.routes import Route

ROUTES = [
    Route.get("/", "WelcomeController@show").name("welcome"),
    Route.get("/health", "HealthController@show").name("health"),
]
