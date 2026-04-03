from django import forms
from DjangoApp.models import *


class InstructorForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(InstructorForm, self).__init__(*args, **kwargs)
        for field in self.visible_fields():
            field.field.widget.attrs["class"] = "form-control"

    class Meta:
        model = Instructor
        fields = '__all__'
        exclude = ['user']


class CourseForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(CourseForm, self).__init__(*args, **kwargs)
        for field in self.visible_fields():
            field.field.widget.attrs["class"] = "form-control"


    class Meta:
        model = Instructor
        fields = '__all__'
        exclude = ['user']
