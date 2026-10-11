"""Payment providers. Only a simulated one exists today; a real provider
(Stripe, Mollie, ...) implements the same charge() and is swapped in here."""
import secrets


class PaymentResult:
    def __init__(self, ok, reference=None, error=None):
        self.ok = ok
        self.reference = reference
        self.error = error


class SimulatedPaymentProvider:
    """Always succeeds. No money moves. For development and demos only."""

    name = "simulated"

    def charge(self, order):
        return PaymentResult(True, reference=f"sim_{secrets.token_hex(8)}")


def payment_provider():
    return SimulatedPaymentProvider()
