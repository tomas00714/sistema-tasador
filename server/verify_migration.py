import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

# Verificar estructura de tasacion_comparable
cursor.execute("""
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'tasacion_comparable'
    ORDER BY ordinal_position
""")
print('Estructura de tasacion_comparable:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]} (nullable: {row[2]})')

# Verificar FK constraint
cursor.execute("""
    SELECT 
        tc.constraint_name,
        rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'tasacion_comparable'
        AND kcu.column_name = 'comparable_id'
        AND tc.constraint_type = 'FOREIGN KEY'
""")
print('\nFK constraint on comparable_id:')
for row in cursor.fetchall():
    print(f'  {row[0]}: ON DELETE {row[1]}')

cursor.close()
conn.close()
