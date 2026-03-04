"""
Migrate data from the legacy merged tables to the per-year tables.

Usage:
    python manage.py migrate_to_year_tables
    python manage.py migrate_to_year_tables --dry-run   # preview counts only

Run this once after applying migration 0002_year_tables.
Safe to re-run: uses get_or_create so existing rows are never duplicated.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import (
    DirectorRemuneration,
    CompanyFinancials,
    DR_YEAR_MODELS,
    CF_YEAR_MODELS,
)


class Command(BaseCommand):
    help = 'Copy data from legacy merged tables into the per-year year tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print counts by year without writing anything.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - nothing will be written.\n'))

        self._migrate_remuneration(dry_run)
        self._migrate_financials(dry_run)

        self.stdout.write(self.style.SUCCESS('\nDone.'))

    # ------------------------------------------------------------------

    def _migrate_remuneration(self, dry_run: bool):
        self.stdout.write('-- Director Remuneration --')
        total = DirectorRemuneration.objects.count()
        self.stdout.write(f'  Source rows: {total}')

        counts: dict[str, int] = {}
        skipped = 0

        qs = DirectorRemuneration.objects.select_related('director').iterator(chunk_size=500)
        for record in qs:
            fy = record.financial_year
            model = DR_YEAR_MODELS.get(fy)
            if model is None:
                skipped += 1
                continue

            counts[fy] = counts.get(fy, 0) + 1

            if not dry_run:
                model.objects.get_or_create(
                    director=record.director,
                    financial_year=fy,
                    defaults={
                        'basic_salary':           record.basic_salary,
                        'pf_retirement':          record.pf_retirement,
                        'perquisites_allowances': record.perquisites_allowances,
                        'bonus_commission':       record.bonus_commission,
                        'pay_excl_esops':         record.pay_excl_esops,
                        'esops':                  record.esops,
                        'total_remuneration':     record.total_remuneration,
                        'options_granted':        record.options_granted,
                        'discount':               record.discount,
                        'fair_value':             record.fair_value,
                        'aggregate_value':        record.aggregate_value,
                        'comments':               record.comments,
                        'remuneration_status':    record.remuneration_status,
                    },
                )

        for fy in sorted(counts):
            label = DR_YEAR_MODELS[fy]._meta.db_table
            self.stdout.write(f'  {label}: {counts[fy]} rows')
        if skipped:
            self.stdout.write(self.style.WARNING(f'  Skipped (no table): {skipped} rows'))
        self.stdout.write(f'  Total written: {sum(counts.values())}')

    def _migrate_financials(self, dry_run: bool):
        self.stdout.write('\n-- Company Financials --')
        total = CompanyFinancials.objects.count()
        self.stdout.write(f'  Source rows: {total}')

        counts: dict[str, int] = {}
        skipped = 0

        qs = CompanyFinancials.objects.select_related('company').iterator(chunk_size=500)
        for record in qs:
            fy = record.financial_year
            model = CF_YEAR_MODELS.get(fy)
            if model is None:
                skipped += 1
                continue

            counts[fy] = counts.get(fy, 0) + 1

            if not dry_run:
                model.objects.get_or_create(
                    company=record.company,
                    financial_year=fy,
                    defaults={
                        'total_income':  record.total_income,
                        'pat':           record.pat,
                        'roa':           record.roa,
                        'employee_cost': record.employee_cost,
                        'mcap':          record.mcap,
                    },
                )

        for fy in sorted(counts):
            label = CF_YEAR_MODELS[fy]._meta.db_table
            self.stdout.write(f'  {label}: {counts[fy]} rows')
        if skipped:
            self.stdout.write(self.style.WARNING(f'  Skipped (no table): {skipped} rows'))
        self.stdout.write(f'  Total written: {sum(counts.values())}')
