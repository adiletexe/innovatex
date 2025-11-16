from django.urls import path
from . import views

urlpatterns = [
    path('process-pdf/', views.ProcessPDFView.as_view(), name='process-pdf'),
]
