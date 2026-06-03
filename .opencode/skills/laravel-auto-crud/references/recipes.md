# Recipes

Concrete step-by-step procedures. Pick the recipe that matches the user's request and follow it literally.

---

## Create a CRUD

When the user asks for "a CRUD for X":

1. Create the migration with the columns matching every `field`, plus FKs, plus pivot tables, plus `softDeletes()` if soft-delete is needed.
2. Create `App\Models\X` with `use AutoCrud[, SoftDeletes];`, declare the **three required static properties**, and implement `protected static function getFields(): array`:

```php
class X extends Model
{
    use AutoCrud; // add SoftDeletes if needed

    protected static $includes          = []; // REQUIRED — trait accesses this directly
    protected static $externalRelations = []; // REQUIRED
    protected static $forbiddenActions  = []; // REQUIRED

    protected static function getFields(): array { ... }
}
```

3. For each FK, add the field's `relation` key (see [relations.md](relations.md)). **Do not** add Eloquent relationship methods.
4. For hasMany / belongsToMany, add `protected static $externalRelations = [...]`.
5. Confirm `'models' => app('models')` is shared in `HandleInertiaRequests::share()` (one-time project setup).
6. Register `createAutoCrudPlugin({ adapter: createInertiaAutoCrudAdapter() })` once in the app frontend bootstrap.
7. Add **one** Inertia page route: `Route::get('/x', fn () => Inertia::render('X'))->name('x');`.
8. Create `resources/js/Pages/X.vue` with `<auto-table :model="usePage().props.models.x" />`.

**Do NOT** create: controller, FormRequest, resource route, `$fillable`, `$casts` (for typed fields), relationship methods (for declared relations), file-upload code, audit code, soft-delete UI, export, pagination logic.

---

## Enable API mode for external frontends

When the user asks for a JSON API, external frontend, mobile app, React/Next app, or frontend that does not use Inertia:

1. Create the same AutoCrud model as the normal CRUD recipe. API mode does not change `getFields()`.
2. Publish config if needed with `php artisan vendor:publish --tag=laravel-auto-crud-config`, then enable API routes in `config/laravel-auto-crud.php`:

```php
'api' => [
    'enabled' => true,
    'prefix' => 'api/laravel-auto-crud',
    'middleware' => ['forceJsonResponse', 'api', 'auth:sanctum', 'checkForbiddenActions'],
    'public_middleware' => null,
],
```

3. If the app uses another auth driver, replace `auth:sanctum` but keep `forceJsonResponse` before auth.
4. Tell the external frontend to load schema from `GET /api/laravel-auto-crud/{model}/schema`.
5. Build requests from `schema.endPoint`; do not hard-code `/api/laravel-auto-crud/...` inside app components unless bootstrapping schema.
6. Use `POST {endPoint}/load-items` for tables, `POST {endPoint}` for create, `PUT {endPoint}/{id}` for update, `DELETE {endPoint}/{id}` for soft delete, `POST {endPoint}/{id}/restore` for restore, and `DELETE {endPoint}/{id}/force` for permanent delete.
7. For file updates, use `POST {endPoint}/{id}` with `_method=PUT` and `multipart/form-data`.
8. If using the package Vue components, register `createAutoCrudPlugin({ adapter: createApiAutoCrudAdapter({ baseUrl, axios }) })` before rendering them.

**Do NOT** create `Route::apiResource`, API controllers, API resources, or API FormRequests for standard AutoCrud CRUD operations.

See full docs: `docs/api-mode.md`.

---

## Custom validation

Cross-field or rule-not-built-in:

1. Add `'custom' => ['rule_name']` to the field's `rules`.
2. Implement on the model:

```php
public static function getCustomRules(): array
{
    return [
        'rule_name' => function ($attribute, $value, $fail, $request) {
            $data = $request->getData();
            if ($data['type'] === 'A' && $value < 10) {
                $fail('Value must be ≥ 10 when type is A.');
            }
        },
    ];
}
```

See full docs: `docs/validation.md`.

---

## Files & images

```php
[
    'name'   => 'Avatar',
    'field'  => 'avatar',
    'type'   => 'image',
    'public' => true, // false → encrypted private storage
    'form'   => true,
    'table'  => true,
],
[
    'name'   => 'Contract',
    'field'  => 'contract',
    'type'   => 'file',
    'public' => false,
    'form'   => true,
],
```

The package handles upload, storage path (`storage/{public|private}/{images|files}/{model}/{field}/{id}`), encryption (private), serving and deletion. **Do not** write upload handlers, Storage::put calls, or download routes.

---

## Calendar

1. Add `protected static $calendarFields = [...]` on the model with `start`, `end`, `title` keys mapping to fields.
2. In the page, render `<auto-calendar :model="model" />` (imported from `@/Components/LaravelAutoCrud/AutoCalendar.vue`).

The web endpoint `/laravel-auto-crud/{model}/load-calendar-events` is exposed automatically. In API mode, use `/api/laravel-auto-crud/{model}/load-calendar-events`.

---

## Forbidden actions

Restrict CRUD verbs per role:

```php
protected static $forbiddenActions = [
    'admin'  => [],
    'editor' => ['destroy', 'destroyPermanent'],
    'viewer' => ['store', 'update', 'destroy', 'destroyPermanent', 'restore'],
];
```

The `CheckForbiddenActions` middleware enforces this at route level. The UI dialogs hide the corresponding buttons. **Do not** gate actions in your own code.

---

## Search scopes

Custom server-side filter for `<auto-table>`:

```php
public function scopeSearchFullName(Builder $query, $value): Builder
{
    return $query->where('first_name', 'like', "%{$value}%")
                 ->orWhere('last_name', 'like', "%{$value}%");
}
```

The scope name (after `scopeSearch`) becomes a filter column key the table can target. See `docs/custom-search.md`.

---

## Hooks (lifecycle side-effects)

Define on the model:

```php
public static function creatingEvent($model)  { /* before insert */ }
public static function createdEvent($model)   { /* after insert  */ }
public static function updatingEvent($model)  { /* before update */ }
public static function updatedEvent($model)   { /* after update  */ }
public static function deletingEvent($model)  { /* before delete */ }
public static function deletedEvent($model)   { /* after delete  */ }
```

Use these for emails, derived columns, audit-style side effects, etc. See `docs/hooks.md`.

---

## Custom Vue rendering

For "show this column differently" or "render this form field as a custom widget", **never** edit the published components. Use a slot in your page — see [frontend-slots.md](frontend-slots.md).
