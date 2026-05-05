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
// ❌ Bad — duplicates what the field's `relation` declaration already handles
public function user() {
    return $this->belongsTo(User::class);
}
```

```php
// ✅ Good — declare the relation key inside getFields() on the FK field
[
    'name'     => 'User',
    'field'    => 'user_id',   // FK integer column
    'type'     => 'number',    // NOT combobox — combobox never carries a relation
    'table'    => true,
    'form'     => true,
    'relation' => [
        'model'    => User::class,
        'relation' => 'user',
        'tableKey' => '{name}',
        'formKey'  => '{name}',
    ],
],
```

## Combobox with `relation`

A `combobox` is a **string-autocomplete** field. It stores the selected text directly in the column — it is not a FK selector and it never carries a `relation` key. The migration column must be `string`.

```php
// ❌ Bad — combobox NEVER has a relation key
[
    'name'      => 'Category',
    'field'     => 'category_id',   // ❌ also wrong — combobox field is not a FK
    'type'      => 'combobox',
    'endPoint'  => '/laravel-auto-crud/category',
    'itemTitle' => 'name',
    'relation'  => ['model' => Category::class, 'relation' => 'category', ...],
],
// And in the migration:
$table->foreignId('category_id')->constrained(); // ❌ wrong
```

```php
// ✅ Good — combobox stores a plain string; no relation, no FK
[
    'name'      => 'Category',
    'field'     => 'category',   // plain string column
    'type'      => 'combobox',
    'endPoint'  => '/laravel-auto-crud/category',
    'itemTitle' => 'name',
    'table'     => true,
    'form'      => true,
    // no 'relation' key
],
// And in the migration:
$table->string('category'); // ✅ always string for combobox
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

## Missing required static properties

The `AutoCrud` trait accesses `static::$includes`, `static::$externalRelations`, `static::$forbiddenActions` and `static::$calendarFields` directly. If any of these are missing from the model, the application will throw an error.

```php
// ❌ Bad — missing required static declarations
class Product extends Model
{
    use AutoCrud, SoftDeletes;

    protected static function getFields(): array { ... }
}
```

```php
// ✅ Good — always declare all required static properties
class Product extends Model
{
    use AutoCrud, SoftDeletes;

    protected static $includes          = [];
    protected static $externalRelations = [];
    protected static $forbiddenActions  = [];

    protected static function getFields(): array { ... }
}
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
