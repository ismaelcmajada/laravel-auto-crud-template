# Anti-patterns (with corrections)

If you catch yourself writing any of the LEFT column, replace it with the RIGHT column.

## Routes

```php
// ❌ Bad — duplicates what the package already exposes at /laravel-auto-crud/products/...
Route::resource('products', ProductController::class);
Route::apiResource('products', ProductController::class);
```

```php
// ✅ Good — only one Inertia page route
Route::get('/products', fn () => Inertia::render('Products'))->name('products');
```

## Controllers / FormRequests

```php
// ❌ Bad
class ProductController extends Controller {
    public function store(StoreProductRequest $request) { ... }
}
class StoreProductRequest extends FormRequest { ... }
```

```php
// ✅ Good — none of those files exist. Validation lives in field `rules`
//          and `getCustomRules()` on the model.
```

## Relationships

```php
// ❌ Bad — duplicates the field's `relation` declaration
public function user() {
    return $this->belongsTo(User::class);
}
```

```php
// ✅ Good — declare it inside getFields()
[
    'name' => 'User', 'field' => 'user_id', 'type' => 'combobox',
    'endPoint' => '/laravel-auto-crud/user', 'itemTitle' => 'name',
    'relation' => [
        'model' => User::class, 'relation' => 'user',
        'tableKey' => '{name}', 'formKey' => '{name}',
    ],
],
```

## Soft deletes / pivots

```php
// ❌ Bad
public function user() {
    return $this->belongsTo(User::class)->withTrashed();
}
public function tags() {
    return $this->belongsToMany(Tag::class)->withPivot('quantity');
}
```

```php
// ✅ Good — both are added automatically by AutoCrud.
//          Don't redeclare the methods at all.
```

## Mass assignment / casts

```php
// ❌ Bad — for fields already declared in getFields()
protected $fillable = ['name', 'price', 'status'];
protected $casts    = ['active' => 'boolean', 'created_at' => 'datetime'];
```

```php
// ✅ Good — let the trait fill these from the field types.
```

## Select options

```php
// ❌ Bad — associative
'options' => ['pending' => 'Pending', 'confirmed' => 'Confirmed'],

// ❌ Bad — array of objects
'options' => [['value' => 'pending', 'label' => 'Pending']],
```

```php
// ✅ Good — flat string array. Stored value === displayed value.
'options' => ['pending', 'confirmed', 'cancelled'],
```

If you need a different label, change the value itself or render via the
`#item.<field>` slot for the table and the
`#auto-form-dialog.auto-form.field.<field>` slot for the form.

## Frontend

```vue
<!-- ❌ Bad — patches a published component -->
// editing resources/js/Components/LaravelAutoCrud/AutoTable.vue
```

```vue
<!-- ✅ Good — use a slot in your page -->
<auto-table :model="model">
  <template #item.price="{ item }">{{ item.price }} €</template>
</auto-table>
```

```js
// ❌ Bad — hard-coded endpoint
axios.get("/laravel-auto-crud/products")
```

```js
// ✅ Good — read from the payload
axios.get(model.endPoint)
```

## When you genuinely need something custom

Outside the AutoCrud surface (webhook, public API, non-CRUD action) writing your own controller/route is fine — but write it **alongside** the AutoCrud setup, never as a replacement for it.
