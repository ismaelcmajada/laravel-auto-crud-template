---
name: laravel-auto-crud
description: Use this skill whenever you need to add, modify, or scaffold a CRUD in a Laravel project that uses the `ismaelcmajada/laravel-auto-crud` package, including Inertia/Vue/Vuetify screens or the optional JSON API mode for external frontends. Triggers include defining a new Eloquent model with the `AutoCrud` trait, configuring `getFields()`, declaring relationships (BelongsTo, MorphTo, HasMany, BelongsToMany), exposing a model through Inertia (`HandleInertiaRequests`), enabling `config('laravel-auto-crud.api.enabled')`, consuming `/api/laravel-auto-crud/{model}/schema`, rendering an `AutoTable` / `AutoForm` / `AutoFormDialog`, adding custom validation rules, lifecycle event hooks (`creatingEvent`, `updatedEvent`, …), `scopeSearchXxx` search scopes, image/file fields, polymorphic relations, calendar configuration, or `$forbiddenActions`. Use it BEFORE writing migrations, controllers, requests, routes or frontend pages for any model that should expose an automated CRUD.
---

# laravel-auto-crud

Skill for working with the `ismaelcmajada/laravel-auto-crud` package. The package autogenerates the entire CRUD pipeline (web routes, optional JSON API routes, controllers, FormRequests, validation, table/form payloads, autocomplete, files/images, calendar, soft-delete, history, pivots, …) from a single model that uses the `AutoCrud` trait.

For web/Inertia screens, your job is almost always limited to: **migration → model with `getFields()` → share `models` in Inertia → install `createInertiaAutoCrudAdapter()` → Inertia page route → Vue page with `<auto-table>`**. For external frontends, your job is usually: **migration → model with `getFields()` → enable API mode → install `createApiAutoCrudAdapter()` → consume `/api/laravel-auto-crud/{model}/schema`**. Nothing else.

---

## Mandatory decision rules

These rules override any other suggestion (including examples in package docs):

1. **Never edit published package frontend files.** Anything under `resources/js/Components/LaravelAutoCrud/`, `resources/js/Composables/LaravelAutoCrud/`, `resources/js/Utils/LaravelAutoCrud/`, and the published `..._create_custom_fields_tables.php` migration is READ-ONLY. They are overwritten by `vendor:publish --force`. Customise via props, slots, wrapper components, or model metadata — never by patching them. The consuming app's `config/laravel-auto-crud.php` may be edited only for package configuration such as enabling API mode or changing middleware/prefixes.
2. **Never create CRUD controllers, FormRequests or resource routes for AutoCrud models.** The package already exposes web endpoints under `/laravel-auto-crud/{model}/...` and, when enabled, JSON API endpoints under `/api/laravel-auto-crud/{model}/...` (schema, store, update, destroy, restore, permanent/force, export-excel, getItem, all, load-items, load-autocomplete-items, load-calendar-events, pivot, bind, unbind).
3. **Always define CRUD behavior from the model**, using `AutoCrud` + `getFields()` (+ `$externalRelations`, hooks, `getCustomRules()`, `scopeSearchXxx`). Do not reimplement what the trait already does.
4. **For Inertia screens, share the model config through `HandleInertiaRequests`** by exposing `app('models')` (auto-discovered). For API/external frontends, use `GET /api/laravel-auto-crud/{model}/schema` instead of Inertia props.
5. **`select` field `options` must be a flat array of strings.** Associative arrays (`['a' => 'A']`) and arrays of objects (`[['value' => ..., 'label' => ...]]`) are NOT supported. The stored string is the displayed string.

---

## Golden path for web/Inertia — copy this pattern when in doubt

### Migration

```php
Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->decimal('price', 10, 2);
    $table->string('status');
    $table->string('category'); // combobox → always string, never foreignId
    $table->softDeletes();
    $table->timestamps();
});
```

### Model

```php
use Ismaelcmajada\LaravelAutoCrud\Models\Traits\AutoCrud;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use AutoCrud, SoftDeletes;

    protected static $includes = [];
    protected static $externalRelations = [];
    protected static $forbiddenActions = [];

    protected static function getFields(): array
    {
        return [
            [
                'name'  => 'Name',
                'field' => 'name',
                'type'  => 'string',
                'table' => true,
                'form'  => true,
                'rules' => ['required' => true],
            ],
            [
                'name'  => 'Price',
                'field' => 'price',
                'type'  => 'decimal',
                'table' => true,
                'form'  => true,
                'rules' => ['required' => true],
            ],
            [
                'name'    => 'Status',
                'field'   => 'status',
                'type'    => 'select',
                'options' => ['pending', 'confirmed', 'cancelled'],
                'table'   => true,
                'form'    => true,
            ],
            [
                'name'      => 'Category',
                'field'     => 'category',  // combobox stores the string value, NOT an FK
                'type'      => 'combobox',
                'endPoint'  => '/laravel-auto-crud/category',
                'itemTitle' => 'name',
                'table'     => true,
                'form'      => true,
                // ✅ NO 'relation' key — combobox NEVER has relation
            ],
        ];
    }
}
```

### Inertia share (once per project)

```php
public function share(Request $request): array
{
    return array_merge(parent::share($request), [
        'models' => app('models'),
        'flash'  => [
            'data'    => fn () => $request->session()->get('data'),
            'message' => fn () => $request->session()->get('message'),
        ],
    ]);
}
```

### Page route

```php
Route::get('/products', fn () => Inertia::render('Products'))->name('products');
```

### Vue page

```vue
<script setup>
import AutoTable from "@/Components/LaravelAutoCrud/AutoTable.vue"
import { usePage } from "@inertiajs/vue3"
const model = usePage().props.models.product
</script>

<template>
  <auto-table title="Products" :model="model" />
</template>
```

That's the entire CRUD. **Stop here unless something is genuinely outside the package scope.**

The app must register the frontend adapter once:

```js
import {
  createAutoCrudPlugin,
  createInertiaAutoCrudAdapter,
} from "@/Adapters/LaravelAutoCrud"

app.use(createAutoCrudPlugin({ adapter: createInertiaAutoCrudAdapter() }))
```

---

## Golden path for API/external frontends

Use this when the user asks for an external frontend, mobile app, API mode, JSON API, React/Next frontend, or a frontend that does not use Inertia.

1. Create the same migration and model with `AutoCrud` + `getFields()` as the web path.
2. Publish config if needed with `php artisan vendor:publish --tag=laravel-auto-crud-config`, then enable API mode in `config/laravel-auto-crud.php`:

```php
'api' => [
    'enabled' => true,
    'prefix' => 'api/laravel-auto-crud',
    'middleware' => ['forceJsonResponse', 'api', 'auth:sanctum', 'checkForbiddenActions'],
    'public_middleware' => null,
],
```

3. The external frontend loads schema from:

```http
GET /api/laravel-auto-crud/{model}/schema
```

4. Build UI from `data.formFields`, `data.tableHeaders`, `data.externalRelations`, and `data.endPoint`.
5. Use `POST {endPoint}/load-items`, `POST {endPoint}`, `PUT {endPoint}/{id}`, `DELETE {endPoint}/{id}`, relation endpoints, custom-fields endpoints, and file endpoints from the package.
6. **Do not** create API resource controllers/routes/FormRequests for the AutoCrud model.

Install the API adapter once in the external Vue app:

```js
import {
  createApiAutoCrudAdapter,
  createAutoCrudPlugin,
} from "./Adapters/LaravelAutoCrud"

app.use(createAutoCrudPlugin({
  adapter: createApiAutoCrudAdapter({ baseUrl: "/api/laravel-auto-crud", axios }),
}))
```

Full API mode contract: [`references/model-payload.md`](references/model-payload.md#api-mode--external-frontends) and package docs `docs/api-mode.md`.

---

## Recipes — pick the closest one

| User asks for…                               | Recipe                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| New CRUD model                               | [`references/recipes.md` → Create a CRUD](references/recipes.md#create-a-crud)         |
| `belongsTo` / `morphTo`                      | [`references/relations.md`](references/relations.md#belongsto--morphto)                |
| `hasMany` / `belongsToMany` (+ pivot fields) | [`references/relations.md`](references/relations.md#hasmany--belongstomany)            |
| Custom validation (cross-field)              | [`references/recipes.md` → Custom validation](references/recipes.md#custom-validation) |
| Image / file fields                          | [`references/recipes.md` → Files & images](references/recipes.md#files--images)        |
| Calendar view                                | [`references/recipes.md` → Calendar](references/recipes.md#calendar)                   |
| Custom column / custom form field rendering  | [`references/frontend-slots.md`](references/frontend-slots.md)                         |
| Building a fully custom frontend / dashboard | [`references/model-payload.md`](references/model-payload.md)                           |
| External frontend / JSON API mode            | [`references/model-payload.md` → API mode](references/model-payload.md#api-mode--external-frontends) |
| Forbidden actions per role                   | [`references/recipes.md` → Forbidden actions](references/recipes.md#forbidden-actions) |
| Custom search filter / scope                 | [`references/recipes.md` → Search scopes](references/recipes.md#search-scopes)         |
| Lifecycle side-effects (email, audit, …)     | [`references/recipes.md` → Hooks](references/recipes.md#hooks)                         |
| Field types / keys reference                 | [`references/fields.md`](references/fields.md)                                         |
| Something feels wrong / "should I do this?"  | [`references/anti-patterns.md`](references/anti-patterns.md)                           |

For deeper package docs see the `docs/` folder shipped with the package: `fields.md`, `relationships.md`, `validation.md`, `hooks.md`, `custom-search.md`, `examples.md`, `frontend/auto-table.md`, `frontend/auto-form.md`, `frontend/auto-form-dialog.md`, `api.md`, `api-mode.md`.

---

## Decision checklist when adding a CRUD for X

1. Migration with the columns / FKs / pivot tables / `softDeletes()`.
2. `App\Models\X` with `use AutoCrud[, SoftDeletes];`, **always declare `protected static $includes = []`, `protected static $externalRelations = []`, `protected static $forbiddenActions = []`** (the trait accesses them directly — missing any of them breaks the model), then `getFields()`.
3. `combobox` fields → `string` column in migration, `endPoint` + `itemTitle` in field, **NO `relation` key ever**. The `relation` key is only for `belongsTo` / `morphTo` FK fields (non-combobox types).
4. Many-to-many / hasMany → `protected static $externalRelations = [...]`.
5. Cross-field validation → `getCustomRules()` + `'rules' => ['custom' => ['...']]`.
6. Side effects → lifecycle hooks (`creatingEvent`, `updatedEvent`, …).
7. Extra search filters → `scopeSearchXxx(Builder $query, $value): Builder`.
8. If building a web/Inertia screen, confirm `models` is shared in `HandleInertiaRequests` (one-time setup).
9. If building a web/Inertia screen, add **one** Inertia page route + Vue page with `<auto-table :model="...">`.
10. If building an external frontend, enable `api.enabled` and consume `GET /api/laravel-auto-crud/{model}/schema`.
11. **Stop.** No controller, no FormRequest, no resource route, no `$fillable`, no manual relationship methods, no manual casts for typed fields, no upload/storage code, no audit code, no soft-delete UI, no export, no pagination logic.

If the user requests anything in step 11, push back briefly and apply the matching recipe instead. If the requirement is genuinely outside the package (webhook, custom non-CRUD action, third-party callback), then — and only then — write custom controllers/routes **alongside** the AutoCrud setup, never replacing it. A standard JSON CRUD API is no longer outside the package; use API mode.

---

## Building a custom frontend on top of the model payload

When a custom UI is unavoidable (bespoke dashboard, custom list, ad-hoc modal flow), do **not** rebuild metadata or hard-code endpoints. For Inertia, the `AutoCrud` trait's `getModel()` already exposes everything the frontend needs through `page.props.models.<modelName>`. For external frontends, the same payload is available through `GET /api/laravel-auto-crud/{model}/schema` under `data`:

```ts
{
  endPoint: string,            // base URL — append /load-items, /{id}, /bind/..., etc.
  endPoints: { web: string, api: string },
  formFields: FormField[],     // form schema (rules, types, options, relations)
  tableHeaders: TableHeader[], // ready-to-render columns (incl. relations & custom fields)
  externalRelations: ExternalRelation[], // hasMany / belongsToMany (each carries its own endPoint)
  forbiddenActions: { [role]: string[] },
  calendarFields: object | null,
  customFieldsEnabled: boolean,
}
```

Key naming is **`endPoint`** (capital `P`), not `endpoint`. Same for `tableKey`, `formKey`, `itemTitle`, `comboField`, `morphType`, `pivotTable`, `pivotFields`, `foreignKey`, `relatedKey`, `customFieldsEnabled`.

Full contract, available endpoints, and a checklist for custom-frontend work: [`references/model-payload.md`](references/model-payload.md).
