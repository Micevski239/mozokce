from django.shortcuts import render
from django.template import RequestContext
from .models import *
from .form import foodForm
# Create your views here.

def index(request):
    return render(request, "index.html")

def outofstock(request):
    queryset = Food.objects.filter(user = request.user).all()
    context = {"food": queryset}
    return render(request, 'outofstock.html', context=context)

def food(request):
    queryset = Food.objects.filter(user = request.user).all()
    context = {"food": queryset, "form":foodForm}
    return render(request, "outofstock.html", context=context)