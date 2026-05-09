from django.core.management.base import BaseCommand

from core.email_sender import get_email_sender


class Command(BaseCommand):
    help = "Sends a test email via the configured email sender (SES)."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Email address to send the test email to.")

    def handle(self, *args, **options):
        recipient = options["recipient"]
        sender = get_email_sender()
        self.stdout.write(f"Sending test email to {recipient} ...")
        success = sender.send(
            recipients=[recipient],
            subject="Test email - zastitanaradu",
            body="Ovo je test mejl. Ako ga vidis, SES konfiguracija radi ispravno.",
            fail_silently=False,
        )
        if success:
            self.stdout.write(self.style.SUCCESS("Mejl uspesno poslat."))
        else:
            self.stdout.write(self.style.ERROR("Slanje nije uspelo. Proveri logove."))
