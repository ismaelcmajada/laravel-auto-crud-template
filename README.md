# Laravel Auto-CRUD Template

Plantilla de inicio para construir aplicaciones CRUD automáticamente con Laravel, Inertia.js, Vue 3 y Vuetify 3.

Hecha para usar con el paquete [`ismaelcmajada/laravel-auto-crud`](https://github.com/ismaelcmajada/laravel-auto-crud).

> **Idioma:** Esta plantilla y toda su interfaz están en **español**.

---

## Pila tecnológica

| Paquete | Versión |
|---------|---------|
| PHP | ^8.4 |
| Laravel | ^13.0 |
| Inertia.js (Laravel) | ^3.0 |
| Inertia.js (Vue 3) | ^3.0.3 |
| Vue | ^3.3.4 |
| Vuetify | ^3.4.9 |
| Tailwind CSS | ^3.4.4 |
| Laravel Sanctum | ^4.0 |

---

## Características

- **CRUD automático** — Define tus modelos con el trait `AutoCrud` y obtén rutas, controladores, validación, tablas y formularios generados automáticamente.
- **Interfaz en español** — Toda la UI está localizada en español.
- **Gestión de navegación** — El `NavigationServiceProvider` genera automáticamente los elementos de navegación a partir de las clases de modelo.
- **Control de acceso por roles** — Cada modelo puede definir acciones prohibidas por rol mediante `$forbiddenActions`.
- **Relaciones polimórficas** — Soporte para relaciones `BelongsTo`, `MorphTo`, `HasMany`, `BelongsToMany`.
- **Subida de imágenes** — Soporte para campos de imagen con previsualización y lightbox.
- **Registro de actividad** — Modelo `Record` con relaciones polimórficas para auditar cambios.
- **Campos personalizados** — Sistema de campos dinámicos adaptable a cualquier modelo.
- **Temas claro/oscuro** — Cambio de tema persistente guardado en localStorage.
- **Excel export** — Exportación de datos de tabla mediante SheetJS.
- **Calendario** — Integración con `vue-cal` para vistas de calendario.

---

## Inicio rápido

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd laravel-auto-crud-template
composer install
npm install
```

### 2. Configurar entorno

Copia el archivo `.env.example` a `.env` y ajusta las variables:

```env
APP_NAME=Laravel
APP_URL=http://localhost

DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite

DEFAULT_USER_NAME=Administrador
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=password
```

> **Nota:** La plantilla usa SQLite por defecto. Asegúrate de que la ruta a la base de datos sea absoluta.

### 3. Crear base de datos y ejecutar migraciones

```bash
touch database/database.sqlite
php artisan migrate
```

### 4. Iniciar el servidor

```bash
# Backend
php artisan serve

# Frontend (en otra terminal)
npm run dev
```

Abre `http://localhost:8000` en tu navegador.

---

## Añadir un nuevo CRUD

El flujo de trabajo es: **migración → modelo → navegación → página Vue**.

### 1. Migración

```bash
php artisan make:migration create_products_table
```

Edita la migración en `database/migrations/` y añádela:

```php
public function up(): void
{
    Schema::create('products', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->text('description')->nullable();
        $table->decimal('price', 10, 2);
        $table->boolean('active')->default(true);
        $table->foreignId('category_id')->constrained()->cascadeOnDelete();
        $table->timestamps();
        $table->softDeletes();
    });
}
```

Ejecuta `php artisan migrate`.

### 2. Modelo

Crea `app/Models/Product.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use ismaelcmajada\LaravelAutoCrud\AutoCrud;

class Product extends Model
{
    use SoftDeletes, AutoCrud;

    protected static function getFields(): array
    {
        return [
            ['name' => 'Nombre', 'field' => 'name', 'type' => 'string', 'table' => true, 'form' => true, 'rules' => ['required' => true]],
            ['name' => 'Descripción', 'field' => 'description', 'type' => 'text', 'table' => false, 'form' => true],
            ['name' => 'Precio', 'field' => 'price', 'type' => 'number', 'table' => true, 'form' => true, 'rules' => ['required' => true]],
            ['name' => 'Activo', 'field' => 'active', 'type' => 'boolean', 'table' => true, 'form' => true],
            ['name' => 'Categoría', 'field' => 'category_id', 'type' => 'number', 'relation' => ['model' => Category::class, 'relation' => 'category'], 'table' => true, 'form' => true],
        ];
    }

    protected static $forbiddenActions = [
        'user' => ['create', 'edit', 'destroy'],
    ];
}
```

### 3. Navegación

Añade el modelo a `app/Providers/NavigationServiceProvider.php`:

```php
[
    'name' => 'Productos',
    'icon' => 'mdi-package-variant',
    'model' => Product::class,
],
```

### 4. Página Vue

Crea `resources/js/Pages/Dashboard/Product.vue`:

```vue
<script setup>
import AutoTable from "@/Components/LaravelAutoCrud/AutoTable.vue"
import { usePage } from "@inertiajs/vue3"

const model = usePage().props.models.product
</script>

<template>
  <auto-table title="Productos" :model="model" />
</template>
```

La ruta `/dashboard/product` se genera automáticamente.

---

## Estructura de directorios

```
├── app/
│   ├── Http/
│   │   ├── Middleware/
│   │   │   └── HandleInertiaRequests.php   # Comparte auth, navegación, models
│   │   └── Requests/
│   ├── Models/
│   │   ├── User.php                        # Modelo de ejemplo con AutoCrud
│   │   └── Record.php                      # Registro de actividad
│   └── Providers/
│       ├── NavigationServiceProvider.php  # Generación de navegación
│       └── RouteServiceProvider.php
├── config/
│   └── laravel-auto-crud.php               # Configuración del paquete
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── resources/
│   └── js/
│       ├── Components/
│       │   ├── LaravelAutoCrud/           # Componentes del paquete
│       │   ├── NavBar.vue                 # Navegación de escritorio
│       │   └── NavBarMobile.vue           # Navegación móvil
│       ├── Composables/LaravelAutoCrud/
│       ├── Layouts/
│       │   ├── App.vue                    # Layout raíz
│       │   └── Dashboard.vue             # Layout del dashboard
│       ├── Pages/
│       │   ├── Auth/Login.vue
│       │   └── Dashboard/
│       │       └── User.vue
│       └── Utils/LaravelAutoCrud/         # Utilidades (validación, fechas, Excel)
└── routes/
    ├── web.php                            # Rutas principales
    └── auth.php                           # Rutas de autenticación
```

---

## Modelos de ejemplo

### User (`app/Models/User.php`)

```php
protected static function getFields(): array
{
    return [
        ['name' => 'Nombre',    'field' => 'name',       'type' => 'string',   'table' => true, 'form' => true, 'rules' => ['required' => true]],
        ['name' => 'Email',     'field' => 'email',       'type' => 'email',    'table' => true, 'form' => true, 'rules' => ['required' => true, 'unique' => true]],
        ['name' => 'Contraseña','field' => 'password',    'type' => 'password', 'table' => false,'form' => true, 'rules' => ['required' => true]],
        ['name' => 'Rol',       'field' => 'role',        'type' => 'select',  'options' => ['user', 'admin', 'super-admin'], 'table' => true, 'form' => true],
        ['name' => 'Imágenes',  'field' => 'images',      'type' => 'image',   'multiple' => true, 'table' => true, 'form' => true],
    ];
}

protected static $forbiddenActions = [
    'admin' => ['destroy'],
];
```

### Record (`app/Models/Record.php`)

```php
protected static function getFields(): array
{
    return [
        ['name' => 'Usuario', 'field' => 'user_id',    'type' => 'number', 'relation' => ['model' => User::class, 'relation' => 'user'], 'table' => true, 'form' => true],
        ['name' => 'Modelo',  'field' => 'model',       'type' => 'string', 'table' => true, 'form' => true],
        ['name' => 'Acción',  'field' => 'action',       'type' => 'string', 'table' => true, 'form' => true],
    ];
}
```

---

## Navegación

El `NavigationServiceProvider` genera automáticamente las rutas a partir de las clases de modelo:

```php
[
    'name' => 'Usuarios',
    'icon' => 'mdi-account-group',
    'model' => User::class,
],
```

Esto produce `/dashboard/user`. Si una acción está prohibida para el rol del usuario, el elemento se oculta automáticamente.

---

## Autenticación por roles

Los roles disponibles son: `user`, `admin`, `super-admin`.

El middleware `checkForbiddenActions` filtra las acciones no permitidas. Si un rol tiene prohibido `index`, el elemento de navegación no se muestra para ese rol.

---

## Validación

Las reglas de validación en español están en `resources/js/Utils/LaravelAutoCrud/rules.js`:

- `ruleRequired` — "Este campo es obligatorio."
- `ruleEmail` — "El correo electrónico no es válido."
- `ruleDNI` — "El DNI no es válido."
- `rulePhone` — "El teléfono no es válido."
- Y más...

---

## Scripts útiles

```bash
# Servidor de desarrollo
php artisan serve

# Compilar frontend
npm run dev     # desarrollo
npm run build   # producción

# Migraciones
php artisan migrate
php artisan migrate:fresh --seed

# Formatear código PHP
./vendor/bin/pint

# Ejecutar tests
php artisan test
```

---

## Configuración

### Variables de entorno adicionales

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DEFAULT_USER_NAME` | Nombre del usuario por defecto | `"Default"` |
| `DEFAULT_USER_EMAIL` | Email del usuario por defecto | `"default@default.com"` |
| `DEFAULT_USER_PASSWORD` | Contraseña del usuario por defecto | `"1234"` |
| `LARAVEL_AUTO_CRUD_TIMEZONE` | Zona horaria para fechas | `"Atlantic/Canary"` |

---

## Licencia

MIT
