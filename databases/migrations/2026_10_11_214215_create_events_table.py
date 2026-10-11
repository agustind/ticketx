from masoniteorm.migrations import Migration


class CreateEventsTable(Migration):
    def up(self):
        """Run the migrations."""
        with self.schema.create("events") as table:
            table.increments("id")
            table.string("slug").unique()
            table.string("name")
            table.datetime("starts_at").nullable()
            table.string("venue").nullable()
            table.string("city").nullable()
            table.unsigned_integer("created_by").nullable()
            table.foreign("created_by").references("id").on("users").on_delete("set null")
            table.timestamps()
            table.index("starts_at")

    def down(self):
        """Revert the migrations."""
        self.schema.drop("events")
