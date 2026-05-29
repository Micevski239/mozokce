from django.contrib import admin
from django.http import HttpRequest

from foodStore.models import Category, Food

# Register your models here.

#admin username: admin@test.com
#admin pass: Ispit123

class CategoryAdmin(admin.ModelAdmin):
    def has_delete_permission(self, request, obj = None):
        return False
    def has_add_permission(self, request: HttpRequest) -> bool:
        return super().has_add_permission(request)


class FoodAdmin(admin.ModelAdmin):
    def has_add_permission(self, request: HttpRequest) -> bool:
        return super().has_add_permission(request)
    def has_delete_permission(self, request, obj=None):
        if obj and (request.user == obj.user):
            return True
        return False

list_display = ("user", "category",)

admin.site.register(Category, CategoryAdmin)
admin.site.register(Food, FoodAdmin)