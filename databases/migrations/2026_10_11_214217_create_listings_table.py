from masoniteorm.migrations import Migration


class CreateListingsTable(Migration):
    def up(self):
        """Run the migrations."""
        with self.schema.create("listings") as table:
            table.increments("id")
            table.unsigned_integer("seller_id")
            table.foreign("seller_id").references("id").on("users").on_delete("cascade")
            table.unsigned_integer("event_id").nullable()
            table.foreign("event_id").references("id").on("events").on_delete("set null")
            table.unsigned_integer("buyer_id").nullable()
            table.foreign("buyer_id").references("id").on("users").on_delete("set null")
            # draft -> listed -> reserved -> sold, or cancelled
            table.string("status").default("draft")
            table.string("ticket_type").nullable()
            table.string("seat").nullable()
            table.integer("face_value_cents").nullable()
            table.boolean("face_value_locked").default(False)
            table.integer("price_cents").nullable()
            table.string("currency", 3).default("EUR")
            table.string("pdf_key")
            table.string("pdf_sha256").unique()
            table.string("barcode").nullable()
            table.text("extraction").nullable()
            table.datetime("reserved_until").nullable()
            table.timestamps()
            table.index("status")
            table.index("barcode")

    def down(self):
        """Revert the migrations."""
        self.schema.drop("listings")
