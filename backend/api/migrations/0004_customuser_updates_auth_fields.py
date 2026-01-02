# Generated migration for CustomUser model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_alter_directorremuneration_remuneration_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='designation',
            field=models.CharField(
                blank=True,
                help_text="User's job designation/title.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[('user', 'User'), ('paid_subscriber', 'Paid Subscriber'), ('admin', 'Admin')],
                default='user',
                help_text='User role for access control: user, paid_subscriber, or admin',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='subscription_type',
            field=models.CharField(
                choices=[('free', 'Personal (Free)'), ('user', 'User'), ('paid_subscriber', 'Paid Subscriber')],
                default='user',
                help_text='Subscription tier: free, user, or paid_subscriber',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='phone_number',
            field=models.CharField(
                blank=True,
                help_text="User's 10-digit phone number.",
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='company_name',
            field=models.CharField(
                blank=True,
                help_text='The company or organization associated with this user.',
                max_length=255,
                null=True,
            ),
        ),
    ]
