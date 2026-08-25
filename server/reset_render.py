import os
import psycopg2

# Credenciales de Render (necesario que el usuario las proporcione)
# Por ahora voy a dejar esto como template y pediré al usuario las credenciales

print("Para ejecutar el reset en la base de Render, necesito las credenciales:")
print("1. DB_HOST")
print("2. DB_NAME")
print("3. DB_USER")
print("4. DB_PASSWORD")
print("5. DATABASE_URL (opcional)")

print("\nPor favor, proporciona las credenciales de Render para continuar con el reset de esa base.")
