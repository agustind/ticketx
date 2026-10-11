from masoniteorm.migrations import Migration


class CreateTicketsTable(Migration):
    def up(self):
        """Run the migrations."""
        with self.schema.create("tickets") as table:
            table.increments("id")
            table.string("title")
            table.text("description").nullable()
            table.string("status").default("open")
            table.timestamps()

    def down(self):
        """Revert the migrations."""
        self.schema.drop("tickets")
