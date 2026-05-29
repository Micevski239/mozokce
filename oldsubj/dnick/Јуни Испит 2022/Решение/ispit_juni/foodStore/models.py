from django.db import models
from django.contrib.auth.models import User

# Create your models here.

#За секоја категорија се чува име, опис и дали е активна (bool).
class Category(models.Model):
    name_category = models.CharField(max_length=50)
    description = models.TextField(null = True, blank = True)
    active = models.BooleanField()

#За секој клиент се чува име, презиме, адреса и емаил.
class Client(models.Model):
    ime = models.CharField(max_length=50)
    prezime = models.CharField(max_length=50)
    adress = models.CharField(max_length=50)
    email = models.CharField(max_length=100)

#Секој прехранбен продукт се карактеризира со автоматски генерирана шифра, име, опис и
#информација за тоа во која категорија припаѓа, корисникот кој го креирал продуктот, 
#фотографија од продуктот, цена и количина.
class Food(models.Model):
    code = models.IntegerField(default=0)
    name_food = models.CharField(max_length=50)
    description = models.TextField(null = True, blank = True)
    kategorija = models.CharField(max_length=50)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null = True, blank = True)
    food_image = models.ImageField(upload_to="food_image/", null = True, blank = True)
    price = models.IntegerField(default=0)
    amount = models.IntegerField(default=0)

#За секоја продажба во системот се евидентираат продуктите кои биле 
#продадени (секој со соодветна количина), датумот на продажба и клиентот кој ги купил.
class Sale(models.Model):
    ime_prezime = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True)
    datum = models.DateField()
    sold_food = models.ForeignKey(Food, on_delete=models.CASCADE)