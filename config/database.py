from masoniteorm.connections import ConnectionResolver
from masonite.environment import env
from masoniteorm.config import db_url

DATABASES = {
    "default": env("DB_CONNECTION", "sqlite"),
    "sqlite": {
        "driver": "sqlite",
        "database": env("SQLITE_DB_DATABASE", "database.sqlite3"),
        "prefix": "",
        "log_queries": env("DB_LOG", False),
    },
    "mysql": {
        "driver": "mysql",
        "host": env("DB_HOST", "127.0.0.1"),
        "port": env("DB_PORT", "3306"),
        "database": env("DB_DATABASE", "masonite"),
        "user": env("DB_USERNAME", "root"),
        "password": env("DB_PASSWORD", ""),
        "prefix": "",
        "grammar": "mysql",
        "options": {"charset": "utf8mb4"},
        "log_queries": env("DB_LOG", False),
    },
    "postgres": db_url() if env("DATABASE_URL") else {
        "driver": "postgres",
        "host": env("DB_HOST", "127.0.0.1"),
        "user": env("DB_USERNAME"),
        "password": env("DB_PASSWORD"),
        "database": env("DB_DATABASE"),
        "port": env("DB_PORT"),
        "log_queries": env("DB_LOG"),
    },
}

DB = ConnectionResolver().set_connection_details(DATABASES)
