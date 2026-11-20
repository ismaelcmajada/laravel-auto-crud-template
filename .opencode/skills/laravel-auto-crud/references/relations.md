# Relationships

**Never write the Eloquent relationship method** for relations that AutoCrud already handles. The trait resolves them dynamically via `__call`.

## belongsTo / morphTo

Declare inside the FK field's `relation` key.

### belongsTo

```php
[
    'name'      => 'User',
    'field'     => 'user_id',   // FK column — integer
    'type'      => 'number',    // NOT combobox — combobox is for string autocomplete only
    'table'     => true,
    'form'      => true,
    'relation'  => [
        'model'    => User::class,
        'relation' => 'user',
        'tableKey' => '{name} ({email})',
        'formKey'  => '{name}',
    ],
],
```

> **Combobox vs BelongsTo**: `combobox` stores the **selected string value** directly in the column and **NEVER** has a `relation` key. `belongsTo` FK fields store an integer ID and **always** use `type: 'number'` (or another non-combobox type) together with the `relation` key.

- `tableKey` / `formKey` are template strings; `{field}` is replaced with the related model's column.
- If the related model uses `SoftDeletes`, `withTrashed()` is applied automatically.

### morphTo

```php
'relation' => [
    'relation'    => 'commentable',
    'polymorphic' => true,
    'morphType'   => 'commentable_type',
    'tableKey'    => '{name}',
    'formKey'     => '{name}',
],
```

Omit `model` for morphTo. `morphType` points to the type column.

## hasMany / belongsToMany

Declare via `protected static $externalRelations = [...]` on the model.

### hasMany

```php
protected static $externalRelations = [
    [
        'name'       => 'Orders',
        'relation'   => 'orders',
        'type'       => 'hasMany',
        'model'      => Order::class,
        'foreignKey' => 'user_id',
        'tableKey'   => '{number}',
    ],
];
```

### belongsToMany (with optional pivot fields)

```php
protected static $externalRelations = [
    [
        'name'        => 'Tags',
        'relation'    => 'tags',
        'type'        => 'belongsToMany',
        'model'       => Tag::class,
        'pivotTable'  => 'product_tag',
        'foreignKey'  => 'product_id',
        'relatedKey'  => 'tag_id',
        'pivotModel'  => ProductTag::class, // optional
        'pivotFields' => [
            [
                'name'  => 'Quantity',
                'field' => 'quantity',
                'type'  => 'number',
                'form'  => true,
                'rules' => ['required' => true],
            ],
        ],
    ],
];
```

`pivotFields` follow the same shape as `getFields()` entries. `withPivot([...])` is added automatically — do not add it manually.

### Server-side autocomplete filtering

`serverSide` relations can send form context so the backend filters **before** the result limit (`config('laravel-auto-crud.autocomplete_limit')`, default 6):

```php
[
    'relation'            => 'vehicles',
    'serverSide'          => true,
    'autocompleteContext' => ['start_date', 'end_date'],
]
```

Implement `scopeAutocompleteContext($query, array $context)` on the **related** model. Use it whenever the frontend would otherwise filter autocomplete results client-side (availability, stock, …) — the limit applies after the search, so client-side filtering can hide valid matches. The edited record id is sent automatically as `context.item_id`.

## Anti-patterns

```php
// ❌ Writing the Eloquent method when the field already declares `relation`
public function user() { return $this->belongsTo(User::class); }
```

```php
// ❌ Using combobox type for a FK/belongsTo field
['type' => 'combobox', 'relation' => [...]] // combobox NEVER has relation
```

```php
// ❌ Adding withTrashed() manually
public function user() { return $this->belongsTo(User::class)->withTrashed(); }
```

```php
// ❌ Adding withPivot manually
public function tags() {
    return $this->belongsToMany(Tag::class)->withPivot('quantity');
}
```

All three are handled by the trait. Just declare the field/external relation.

See full package docs: `docs/relationships.md`.
