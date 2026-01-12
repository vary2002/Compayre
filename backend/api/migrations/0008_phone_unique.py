# Generated migration for phone number uniqueness

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_roles_setup'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='phone_number',
            field=models.CharField(
                blank=True,
                max_length=20,
                null=True,
                unique=True,
                help_text='User\'s 10-digit phone number (unique, optional).',
            ),
        ),
    ]
