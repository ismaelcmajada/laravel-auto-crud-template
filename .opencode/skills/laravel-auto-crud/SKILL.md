---
name: laravel-auto-crud
description: Use this skill whenever you need to add, modify, or scaffold a CRUD in a Laravel + Inertia + Vue 3 + Vuetify 3 project that uses the `ismaelcmajada/laravel-auto-crud` package. Triggers include defining a new Eloquent model with the `AutoCrud` trait, configuring `getFields()`, declaring relationships (BelongsTo, MorphTo, HasMany, BelongsToMany), exposing a model through Inertia (`HandleInertiaRequests`), rendering an `AutoTable` / `AutoForm` / `AutoFormDialog`, adding custom validation rules, lifecycle event hooks (`creatingEvent`, `updatedEvent`, …), `scopeSearchXxx` search scopes, image/file fields, polymorphic relations, calendar configuration, or `$forbiddenActions`. Use it BEFORE writing migrations, controllers, requests, routes or Vue pages for any model that should expose an automated CRUD.
---

# laravel-auto-crud

Skill for working with the `ismaelcmajada/laravel-auto-crud` package. The package autogenerates the entire CRUD pipeline (routes, controllers, FormRequests, validation, table/form payloads, autocomplete, files/images, calendar, soft-delete, history, pivots, …) from a single model that uses the `AutoCrud` trait.

Your job is almost always limited to: **migration → model with `getFields()` → share `models` in Inertia → Inertia page route → Vue page with `<auto-table>`**. Nothing else.

---

## Mandatory decision rules

These rules override any other suggestion (including examples in package docs):

1. **Never edit published package files.** Anything under `resources/js/Components/LaravelAutoCrud/`, `resources/js/Composables/LaravelAutoCrud/`, `resources/js/Utils/LaravelAutoCrud/`, the published `config/laravel-auto-crud.php` and the published `..._create_custom_fields_tables.php` migration are READ-ONLY. They are overwritten by `vendor:publish --force`. Customise via props, slots, or wrapper components — never by patching them.
2. **Never create CRUD controllers, FormRequests or resource routes for AutoCrud models.** The package already exposes `/laravel-auto-crud/{model}/...` (index, store, update, destroy, restore, permanent, export-excel, getItem, all, load-items, load-autocomplete-items, load-calendar-events, pivot, bind, unbind).
3. **Always define CRUD behavior from the model**, using `AutoCrud` + `getFields()` (+ `$externalRelations`, hooks, `getCustomRules()`, `scopeSearchXxx`). Do not reimplement what the trait already does.
4. **Always share the model config through `HandleInertiaRequests`** by exposing `app('models')` (auto-discovered). Adding a new model under `app/Models/**` with the `AutoCrud` trait is enough — no manual registration.
5. **`select` field `options` must be a flat array of strings.** Associative arrays (`['a' => 'A']`) and arrays of objects (`[['value' => ..., 'label' => ...]]`) are NOT supported. The stored string is the displayed string.

---

## Golden path — copy this pattern when in doubt

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
| Forbidden actions per role                   | [`references/recipes.md` → Forbidden actions](references/recipes.md#forbidden-actions) |
| Custom search filter / scope                 | [`references/recipes.md` → Search scopes](references/recipes.md#search-scopes)         |
| Lifecycle side-effects (email, audit, …)     | [`references/recipes.md` → Hooks](references/recipes.md#hooks)                         |
| Field types / keys reference                 | [`references/fields.md`](references/fields.md)                                         |
| Something feels wrong / "should I do this?"  | [`references/anti-patterns.md`](references/anti-patterns.md)                           |

For deeper package docs see the `docs/` folder shipped with the package: `fields.md`, `relationships.md`, `validation.md`, `hooks.md`, `custom-search.md`, `examples.md`, `frontend/auto-table.md`, `frontend/auto-form.md`, `frontend/auto-form-dialog.md`, `api.md`.

---

## Decision checklist when adding a CRUD for X

1. Migration with the columns / FKs / pivot tables / `softDeletes()`.
2. `App\Models\X` with `use AutoCrud[, SoftDeletes];`, **always declare `protected static $includes = []`, `protected static $externalRelations = []`, `protected static $forbiddenActions = []`** (the trait accesses them directly — missing any of them breaks the model), then `getFields()`.
3. `combobox` fields → `string` column in migration, `endPoint` + `itemTitle` in field, **NO `relation` key ever**. The `relation` key is only for `belongsTo` / `morphTo` FK fields (non-combobox types).
4. Many-to-many / hasMany → `protected static $externalRelations = [...]`.
5. Cross-field validation → `getCustomRules()` + `'rules' => ['custom' => ['...']]`.
6. Side effects → lifecycle hooks (`creatingEvent`, `updatedEvent`, …).
7. Extra search filters → `scopeSearchXxx(Builder $query, $value): Builder`.
8. Confirm `models` is shared in `HandleInertiaRequests` (one-time setup).
9. Add **one** Inertia page route + Vue page with `<auto-table :model="...">`.
10. **Stop.** No controller, no FormRequest, no resource route, no `$fillable`, no manual relationship methods, no manual casts for typed fields, no upload/storage code, no audit code, no soft-delete UI, no export, no pagination logic.

If the user requests anything in step 10, push back briefly and apply the matching recipe instead. If the requirement is genuinely outside the package (webhook, public API, non-CRUD action), then — and only then — write custom controllers/routes **alongside** the AutoCrud setup, never replacing it.

---

## Building a custom frontend on top of the model payload

When a custom UI is unavoidable (bespoke dashboard, custom list, ad-hoc modal flow), do **not** rebuild metadata or hard-code endpoints. The `AutoCrud` trait's `getModel()` already exposes everything the frontend needs through `page.props.models.<modelName>`:

```ts
{
  endPoint: string,            // base URL — append /load-items, /{id}, /bind/..., etc.
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
