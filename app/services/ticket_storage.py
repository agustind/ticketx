"""Private storage for ticket files. The file is the ticket, so nothing here is public."""
import os

from masonite.configuration import config
from masonite.utils.location import base_path


class TicketStorage:
    def __init__(self):
        self.bucket = config("tickets.bucket")
        self._client = None

    def put(self, key, content, content_type):
        if self.bucket:
            self._s3().put_object(
                Bucket=self.bucket, Key=key, Body=content, ContentType=content_type
            )
            return
        path = self._local_path(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(content)

    def get(self, key):
        if self.bucket:
            return self._s3().get_object(Bucket=self.bucket, Key=key)["Body"].read()
        with open(self._local_path(key), "rb") as f:
            return f.read()

    def delete(self, key):
        if self.bucket:
            self._s3().delete_object(Bucket=self.bucket, Key=key)
        elif os.path.exists(self._local_path(key)):
            os.remove(self._local_path(key))

    def _local_path(self, key):
        root = base_path("storage/private/tickets")
        path = os.path.normpath(os.path.join(root, key))
        if not path.startswith(root + os.sep):
            raise ValueError("Invalid ticket key")
        return path

    def _s3(self):
        if self._client is None:
            import boto3
            from botocore.config import Config

            self._client = boto3.client(
                "s3",
                endpoint_url=config("tickets.bucket_endpoint"),
                region_name=config("tickets.bucket_region"),
                aws_access_key_id=config("tickets.bucket_access_key_id"),
                aws_secret_access_key=config("tickets.bucket_secret_access_key"),
                config=Config(s3={"addressing_style": "virtual"}),
            )
        return self._client
