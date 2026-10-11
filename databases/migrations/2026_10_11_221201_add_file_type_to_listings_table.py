from masoniteorm.migrations import Migration


class AddFileTypeToListingsTable(Migration):
    def up(self):
        """Tickets can be images as well as PDFs; existing rows are all PDFs."""
        with self.schema.table("listings") as table:
            table.string("file_type", 32).default("application/pdf")

    def down(self):
        with self.schema.table("listings") as table:
            table.drop_column("file_type")
