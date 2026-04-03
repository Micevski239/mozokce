from django.shortcuts import render, redirect

from DjangoApp.forms import *
from DjangoApp.models import Course, Instructor


# Create your views here.


def base(request):
    return render(request, 'base.html')


def index(request):
    courses = Course.objects.all()
    return render(request, 'index.html', {'courses': courses})


def add_instructor(request):
    if request.method == 'POST':
        form = CourseForm(request.POST, request.FILES)
        if form.is_valid():
            course = form.save(commit=False)
            course.user = request.user
            course.image = form.cleaned_data['image']
            course.save()
            return redirect('add_instructor')
    else:
        form = CourseForm()
    courses = Course.objects.all()
    context = {'form': form, 'courses': courses}
    return render(request, "add_instructor.html", context)

