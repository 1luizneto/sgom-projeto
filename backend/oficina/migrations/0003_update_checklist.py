# Generated manually

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
        ('oficina', '0002_venda_itemvenda'),
    ]

    operations = [
        migrations.AddField(
            model_name='checklist',
            name='data_criacao',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='checklist',
            name='mecanico',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='usuarios.mecanico'),
        ),
        migrations.AddField(
            model_name='checklist',
            name='pneus_estado',
            field=models.CharField(default='Bom estado', max_length=100),
        ),
        migrations.AddField(
            model_name='checklist',
            name='possivel_defeito',
            field=models.TextField(blank=True, null=True),
        ),
    ]
