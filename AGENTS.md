# Agent Guidance

## Project stack

- **Backend:** Laravel 12
- **Frontend:** Inertia.js (Vue 3) + Vuetify 3
- **CRUD:** `ismaelcmajada/laravel-auto-crud` (autogenerates routes, controllers, validation, tables, forms, etc.)
- **Language:** UI is in Spanish

## Global architecture (already set up — do not repeat)

1. **`app/Providers/NavigationServiceProvider.php`**
   - Exposes `app('navigation')` as a singleton.
   - Navigation entries are declared as an array of arrays with keys: `name`, `icon`, `model` (optional), `path` (optional), `dividers` (optional), `childs` (optional).
   - When `model` is provided, the path is auto-generated as `/dashboard/{modelName}` (e.g. `App\Models\User` → `/dashboard/user`).
   - Navigation is filtered by role using `$modelClass::getForbiddenActions()`; if `index` is forbidden for the user's role, the item is hidden.
   - **To add a new nav item:** register the model class under the `model` key. Do **not** hardcode paths for AutoCrud models.

2. **`app/Http/Middleware/HandleInertiaRequests.php`**
   - Already shares `models` (auto-discovered AutoCrud models) and `navigation` with every Inertia response.
   - Do **not** modify this file to add new models; simply placing a model under `app/Models/**` with the `AutoCrud` trait is enough.

## Adding a new CRUD

Follow the golden path from the `laravel-auto-crud` skill docs. Project-specific conventions:

1. **Migration** → create the table (add `softDeletes()` when needed).
2. **Model** → `app/Models/<Model>.php` using `AutoCrud` trait + `getFields()`.
3. **Navigation** → add the model to `NavigationServiceProvider::generateNavigation()` with `'model' => Model::class`.
4. **Route** → no manual route needed; the existing catch-all already handles it:
   ```php
   Route::get('/{model}', [AutoCrudController::class, 'index'])->name('laravel-auto-crud.model.index');
   ```
   If you need a named route for redirects, reuse `route('laravel-auto-crud.model.index', ['model' => 'user'])`.
5. **Vue page** → create `resources/js/Pages/Dashboard/<Model>.vue` (PascalCase filename) and import `AutoTable`:
   ```vue
   <script setup>
   import AutoTable from "@/Components/LaravelAutoCrud/AutoTable.vue"
   import { usePage } from "@inertiajs/vue3"
   const model = usePage().props.models.user
   </script>
   <template>
     <auto-table title="Usuarios" :model="model" />
   </template>
   ```

   - Use Spanish for the `title` prop.
   - The `models` key is the snake_case / lowercase model name (e.g. `user`, `product_category`).

## Rules that apply on top of the skill docs

- **Never create controllers, FormRequests or resource routes** for AutoCrud models. The `AutoCrudController::index` route is already registered.
- **Never edit published package files** under `resources/js/Components/LaravelAutoCrud/`, `resources/js/Composables/LaravelAutoCrud/`, `resources/js/Utils/LaravelAutoCrud/`, or `config/laravel-auto-crud.php`. Customise via props, slots or wrapper components.
- **UI text must be in Spanish** (`title`, `nav names`, labels when overriding slots, etc.).
- **`select` field `options` must be a flat array of strings** (e.g. `['activo', 'inactivo']`). Associative arrays or object arrays are not supported.
- **Foreign keys** are declared inside `getFields()` via the `relation` key; do not manually write Eloquent relationship methods just for CRUD metadata.
- **Many-to-many / hasMany** relations go in `protected static $externalRelations = [...]` on the model.
- **Role-based access** is driven by `$forbiddenActions` on the model (array keyed by role). The navigation provider already respects it.

## File locations

| Concern                              | Location                                        |
| ------------------------------------ | ----------------------------------------------- |
| Migrations                           | `database/migrations/`                          |
| Models                               | `app/Models/`                                   |
| Navigation config                    | `app/Providers/NavigationServiceProvider.php`   |
| Inertia middleware                   | `app/Http/Middleware/HandleInertiaRequests.php` |
| Web routes (auth + dashboard prefix) | `routes/web.php`                                |
| Vue pages                            | `resources/js/Pages/Dashboard/`                 |
| Auth routes                          | `routes/auth.php`                               |

## When in doubt

- Consult the `laravel-auto-crud` skill for recipes (relations, custom validation, files/images, calendar, hooks, search scopes, forbidden actions, etc.).
- Keep changes minimal: migration → model with `getFields()` → navigation entry → Vue page with `<auto-table>`.
