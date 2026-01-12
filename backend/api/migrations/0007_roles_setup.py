# Generated migration for role-based access control

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_email_login'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[('user', 'User'), ('subscriber', 'Subscriber'), ('admin', 'Admin')],
                default='user',
                help_text='User role: user, subscriber, or admin',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='subscription_type',
            field=models.CharField(
                choices=[('user', 'User'), ('subscriber', 'Subscriber'), ('admin', 'Admin')],
                default='user',
                help_text='Subscription tier: user, subscriber, or admin',
                max_length=20,
            ),
        ),
    ]
