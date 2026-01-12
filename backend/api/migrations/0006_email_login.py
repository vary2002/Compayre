# Generated migration for email-based authentication

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_useractivitylog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(max_length=254, unique=True),
        ),
        migrations.AddIndex(
            model_name='customuser',
            index=models.Index(fields=['email'], name='api_customu_email_12345678_idx'),
        ),
    ]
