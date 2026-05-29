from django.contrib import admin
from .models import *

# Register your models here.


class InstructorAdmin(admin.ModelAdmin):
    exclude = ['user']

    # Само супер-админ ќе можат да додаваат нови инструктори 1/5
    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        return False


class StudentAdmin(admin.ModelAdmin):

    # Само супер-админ ќе можат да додаваат нови студенти 2/5
    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        return False

    # Само супер-админ ќе можат да менуваат нови студенти 2/5
    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return False


class CourseAdmin(admin.ModelAdmin):

    # Инструкторите може да додаваат курсеви 3/5
    # и по автоматизам се додаваат како инструктор на ново креираните курсеви 3/5


    # Инструкторите можат да ги листаат само курсевите кои што ги креирале? 4/5
    # не памтам дали беше баш вака барањето


class StudentCourseAdmin(admin.ModelAdmin):

    # Студентите можат да ги видат само курсевите на кои се запишани 5/5


admin.site.register(Instructor, InstructorAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(Student, StudentAdmin)
admin.site.register(StudentCourse)
