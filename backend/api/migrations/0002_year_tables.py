"""
Migration: create per-year director remuneration and company financials tables.

Tables created (SQLite-compatible DDL):
  api_director_remuneration_fy10 … api_director_remuneration_fy16
  api_company_financials_fy10    … api_company_financials_fy16

To extend with a new year (e.g. FY17):
  1. Add the corresponding class in models.py + entries in DR/CF_YEAR_MODELS
  2. Create a new migration (0003_fy17_tables.py) following this pattern
  3. Run: python manage.py migrate
"""

from django.db import migrations

FY_LABELS = ['FY12', 'FY13', 'FY14', 'FY15', 'FY16']

_DR_SQL = """
CREATE TABLE "api_director_remuneration_{fy_lower}" (
    "id"                   integer  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "financial_year"       varchar(10) NOT NULL,
    "basic_salary"         decimal  NULL,
    "pf_retirement"        decimal  NULL,
    "perquisites_allowances" decimal NULL,
    "bonus_commission"     decimal  NULL,
    "pay_excl_esops"       decimal  NULL,
    "esops"                decimal  NULL,
    "total_remuneration"   decimal  NULL,
    "options_granted"      decimal  NULL,
    "discount"             decimal  NULL,
    "fair_value"           decimal  NULL,
    "aggregate_value"      decimal  NULL,
    "comments"             text     NULL,
    "remuneration_status"  text     NULL,
    "created_at"           datetime NOT NULL,
    "updated_at"           datetime NOT NULL,
    "director_id"          bigint   NOT NULL
        REFERENCES "api_director" ("id") DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "dr_{fy_lower}_dir_fy_uniq"
    ON "api_director_remuneration_{fy_lower}" ("director_id", "financial_year");
"""

_DR_REVERSE_SQL = """
DROP TABLE IF EXISTS "api_director_remuneration_{fy_lower}";
"""

_CF_SQL = """
CREATE TABLE "api_company_financials_{fy_lower}" (
    "id"             integer  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "financial_year" varchar(10) NOT NULL,
    "total_income"   decimal  NULL,
    "pat"            decimal  NULL,
    "roa"            decimal  NULL,
    "employee_cost"  decimal  NULL,
    "mcap"           decimal  NULL,
    "created_at"     datetime NOT NULL,
    "updated_at"     datetime NOT NULL,
    "company_id"     bigint   NOT NULL
        REFERENCES "api_company" ("id") DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "cf_{fy_lower}_cmp_fy_uniq"
    ON "api_company_financials_{fy_lower}" ("company_id", "financial_year");
"""

_CF_REVERSE_SQL = """
DROP TABLE IF EXISTS "api_company_financials_{fy_lower}";
"""


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = []

    for _fy in FY_LABELS:
        _fy_lower = _fy.lower()
        operations.append(
            migrations.RunSQL(
                sql=_DR_SQL.format(fy_lower=_fy_lower),
                reverse_sql=_DR_REVERSE_SQL.format(fy_lower=_fy_lower),
            )
        )
        operations.append(
            migrations.RunSQL(
                sql=_CF_SQL.format(fy_lower=_fy_lower),
                reverse_sql=_CF_REVERSE_SQL.format(fy_lower=_fy_lower),
            )
        )
