# Recipes

Concrete step-by-step procedures. Pick the recipe that matches the user's request and follow it literally.

---

## Create a CRUD

When the user asks for "a CRUD for X":

1. Create the migration with the columns matching every `field`, plus FKs, plus pivot tables, plus `softDeletes()` if soft-delete is needed.
2. Create `App\Models\X` with `use AutoCrud[, SoftDeletes];` and implement `protected static function getFields(): array`.
3. For each FK, add the field's `relation` key (see [relations.md](relations.md)). **Do not** add Eloquent relationship methods.
4. For hasMany / belongsToMany, add `protected static $externalRelations = [...]`.
5. Confirm `'models' => app('models')` is shared in `HandleInertiaRequests::share()` (one-time project setup).
6. Add **one** Inertia page route: `Route::get('/x', fn () => Inertia::render('X'))->name('x');`.
7. Create `resources/js/Pages/X.vue` with `<auto-table :model="usePage().props.models.x" />`.

**Do NOT** create: controller, FormRequest, resource route, `$fillable`, `$casts` (for typed fields), relationship methods (for declared relations), file-upload code, audit code, soft-delete UI, export, pagination logic.

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

The endpoint `/laravel-auto-crud/{model}/load-calendar-events` is exposed automatically.

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
