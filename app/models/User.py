"""User Model."""

from masoniteorm.models import Model
from masonite.authentication import Authenticates
from masonite.authorization import Authorizes
from masonite.notification import Notifiable


class User(Model, Authenticates, Authorizes, Notifiable):
    """User Model."""

    __fillable__ = ["name", "email", "password", "phone"]
    __hidden__ = ["password", "second_password", "remember_token"]
    __auth__ = "email"

    def to_api(self):
        return {"id": self.id, "name": self.name, "email": self.email}
