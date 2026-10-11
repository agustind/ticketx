from masoniteorm.migrations import Migration


class CreateOrdersTable(Migration):
    def up(self):
        """Run the migrations."""
        with self.schema.create("orders") as table:
            table.increments("id")
            table.unsigned_integer("listing_id")
            table.foreign("listing_id").references("id").on("listings").on_delete("cascade")
            table.unsigned_integer("buyer_id")
            table.foreign("buyer_id").references("id").on("users").on_delete("cascade")
            # pending -> paid, or expired / cancelled
            table.string("status").default("pending")
            table.integer("amount_cents")
            table.string("currency", 3).default("EUR")
            table.string("payment_provider").nullable()
            table.string("payment_ref").nullable()
            table.datetime("expires_at")
            table.datetime("paid_at").nullable()
            table.timestamps()
            table.index("status")

    def down(self):
        """Revert the migrations."""
        self.schema.drop("orders")
