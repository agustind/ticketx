from masoniteorm.migrations import Migration


class DropTicketsTable(Migration):
    """The tickets CRUD was a deploy smoke test; the marketplace replaces it."""

    def up(self):
        self.schema.drop_table_if_exists("tickets")

    def down(self):
        with self.schema.create("tickets") as table:
            table.increments("id")
            table.string("title")
            table.text("description").nullable()
            table.string("status").default("open")
            table.timestamps()
