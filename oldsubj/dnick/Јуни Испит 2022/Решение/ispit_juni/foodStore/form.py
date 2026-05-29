from django import forms
from .models import Food

class foodForm(forms.ModelForm):
    class Meta:
        model = Food
        exclude = ("user",)