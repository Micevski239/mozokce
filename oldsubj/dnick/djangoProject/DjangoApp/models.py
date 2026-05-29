from django.contrib.auth.models import User
from django.db import models

# Create your models here.


class Instructor(models.Model):
    name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.EmailField()
    image = models.ImageField(blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name + " " + self.last_name


class Student(models.Model):
    name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    index = models.IntegerField()

    def __str__(self):
        return self.name + " " + self.last_name


class Course(models.Model):
    name = models.CharField(max_length=255)
    image = models.ImageField(blank=True, null=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class StudentCourse(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    def __str__(self):
        return self.student.name + " " + self.course.name
