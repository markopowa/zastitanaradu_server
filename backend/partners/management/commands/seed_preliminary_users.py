"""Create the preliminary MAK team users and assign their roles.

Idempotent: users are matched by username; existing users keep their password
unless --reset-password is passed. Roles (Admin/Operativa/Pregled groups) are
created by `add_setup` — run that first. All users are marked is_staff=True so
they belong to the internal "MAK tim" that receives reminder e-mails.

    python manage.py seed_preliminary_users --password '<temp>'

Marko and Bogdan get full rights (superuser + Admin group); everyone else gets
the Operativa role.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

ROLE_ADMIN = "Admin"
ROLE_OPERATIVA = "Operativa"
ROLE_PREGLED = "Pregled"

# (username, first_name, last_name, email, is_superuser, [role groups])
# Note: `marko` is intentionally omitted — that person already has the existing
# `admin` superuser account.
# Zoran = Operativa (daily work, no catalog setup) + Pregled (Korisnici/Uloge
# only; cannot see Admin user/role or grant permissions he does not have).
PRELIMINARY_USERS = [
    ("bogdan", "Bogdan", "Pantić", "bogdan.pantic@yahoo.com", True, [ROLE_ADMIN]),
    ("anita", "Anita", "Kostić", "maktotalsafety@gmail.com", False, [ROLE_OPERATIVA]),
    ("zoran", "Zoran", "Antić", "zoranantic61@gmail.com", False,
     [ROLE_OPERATIVA, ROLE_PREGLED]),
]

DEFAULT_TEMP_PASSWORD = "MakSafety2026!"


class Command(BaseCommand):
    help = (
        "Create preliminary MAK team users (Marko/Bogdan = full admin, "
        "others = Operativa). Idempotent by username. Run add_setup first "
        "so the role groups exist."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_TEMP_PASSWORD,
            help="Temporary password set on newly created users.",
        )
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Also reset the password of already-existing users.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        password = options["password"]
        reset = options["reset_password"]

        groups = {name: Group.objects.filter(name=name).first()
                  for name in (ROLE_ADMIN, ROLE_OPERATIVA, ROLE_PREGLED)}
        missing = [name for name, g in groups.items() if g is None]
        if missing:
            self.stderr.write(self.style.WARNING(
                "Role group(s) missing: %s. Run `python manage.py add_setup` "
                "first; users will be created without a role for now."
                % ", ".join(missing)
            ))

        results = []
        with transaction.atomic():
            for username, first, last, email, is_super, roles in PRELIMINARY_USERS:
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={"email": email, "first_name": first,
                              "last_name": last},
                )
                # Keep identity fields in sync.
                user.email = email
                user.first_name = first
                user.last_name = last
                user.is_staff = True
                user.is_superuser = is_super
                if created or reset:
                    user.set_password(password)
                user.save()

                # Assign role group(s) (in addition to the superuser flag).
                for role in roles:
                    group = groups.get(role)
                    if group is not None:
                        user.groups.add(group)

                results.append((username, email, roles, is_super, created))

        self.stdout.write(self.style.SUCCESS("Preliminary users ready:"))
        for username, email, roles, is_super, created in results:
            tag = "created" if created else "updated"
            rights = ("SUPERUSER + " if is_super else "") + " + ".join(roles)
            self.stdout.write(
                f"  [{tag}] {username} <{email}> — {rights}")
        if any(created for *_, created in results) or reset:
            self.stdout.write(self.style.WARNING(
                f"Temporary password for new/reset users: {password} "
                "— tell users to change it after first login."
            ))
