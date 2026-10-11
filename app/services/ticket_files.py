"""Validation and clean-up for uploaded ticket files (PDF, or a photo / screenshot).

The stored file is what the buyer receives, so images are re-saved without their
metadata: phone photos often carry GPS coordinates and device details.
"""
import hashlib
import io

from PIL import Image, ImageOps
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from masonite.configuration import config

from app.services.api import ApiError

# Media types Claude can read, mapped to the extension we store them under.
EXTENSIONS = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
_PIL_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}

# Anything bigger is downscaled in the copy sent to Claude (the stored file keeps full size).
READER_MAX_EDGE = 2576
READER_MAX_BYTES = 4 * 1024 * 1024


class TicketFile:
    def __init__(self, content, media_type, sha256):
        self.content = content
        self.media_type = media_type
        # Hash of the file as uploaded, so re-uploading the same file is caught.
        self.sha256 = sha256

    @property
    def extension(self):
        return EXTENSIONS[self.media_type]

    def for_reader(self):
        """(bytes, media_type) to send to Claude: images capped in size, PDFs as-is."""
        if self.media_type == "application/pdf":
            return self.content, self.media_type
        image = Image.open(io.BytesIO(self.content))
        if max(image.size) <= READER_MAX_EDGE and len(self.content) <= READER_MAX_BYTES:
            return self.content, self.media_type
        image.thumbnail((READER_MAX_EDGE, READER_MAX_EDGE))
        out = io.BytesIO()
        image.convert("RGB").save(out, format="JPEG", quality=90)
        return out.getvalue(), "image/jpeg"


def _reject(message, field_message=None):
    raise ApiError(422, message, {"file": field_message or message})


def sniff_media_type(content):
    if content.startswith(b"%PDF"):
        return "application/pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


def validated_ticket_file(upload):
    """Check an upload and return a TicketFile ready to store, or raise ApiError(422)."""
    if isinstance(upload, list):
        upload = upload[0] if upload else None
    if upload is None or not hasattr(upload, "get_content"):
        _reject("Choose a ticket to upload.")
    content = upload.get_content()
    if len(content) > config("tickets.max_file_bytes"):
        _reject("The file must be 10 MB or smaller.", "Max 10 MB.")

    # Decide by content, never by the file name or the browser's claimed type.
    media_type = sniff_media_type(content)
    if media_type is None:
        _reject("Upload your ticket as a PDF, JPG, PNG or WebP.", "Unsupported file type.")
    sha256 = hashlib.sha256(content).hexdigest()
    if media_type == "application/pdf":
        return TicketFile(_validated_pdf(content), media_type, sha256)
    return TicketFile(_cleaned_image(content, media_type), media_type, sha256)


def _validated_pdf(content):
    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            _reject("Password-protected PDFs aren't supported.", "PDF is encrypted.")
        pages = len(reader.pages)
    except PdfReadError:
        _reject("We couldn't open this PDF.", "Unreadable PDF.")
    if pages > config("tickets.max_pdf_pages"):
        _reject("Upload one ticket at a time (max 10 pages).", "Too many pages.")
    return content


def _cleaned_image(content, media_type):
    Image.MAX_IMAGE_PIXELS = config("tickets.max_image_pixels")
    try:
        with Image.open(io.BytesIO(content)) as probe:
            probe.verify()  # structural check; the image must be reopened afterwards
        image = Image.open(io.BytesIO(content))
        if _PIL_FORMATS.get(image.format) != media_type:
            _reject("We couldn't open this image.", "Unreadable image.")
        if getattr(image, "n_frames", 1) > 1:
            _reject("Animated images aren't supported. Upload a single photo or screenshot.")
        if min(image.size) < 200:
            _reject("This image is too small to read. Upload the original screenshot or photo.")
        # Bake the camera rotation into the pixels, since the metadata saying how to rotate is dropped.
        image = ImageOps.exif_transpose(image)
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        _reject("This image is too large.", "Image too large.")
    except (OSError, SyntaxError, ValueError):
        _reject("We couldn't open this image.", "Unreadable image.")

    out = io.BytesIO()
    if media_type == "image/jpeg":
        # High quality so barcodes and QR codes stay scannable after re-encoding.
        image.convert("RGB").save(out, format="JPEG", quality=95, subsampling=0)
    elif media_type == "image/png":
        image.save(out, format="PNG", optimize=True)
    else:
        image.save(out, format="WEBP", lossless=True)
    # Saving without exif=/pnginfo= drops EXIF (GPS, camera), XMP and text chunks.
    return out.getvalue()
