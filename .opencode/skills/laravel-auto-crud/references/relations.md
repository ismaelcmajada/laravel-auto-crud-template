# Relationships

**Never write the Eloquent relationship method** for relations that AutoCrud already handles. The trait resolves them dynamically via `__call`.

## belongsTo / morphTo

Declare inside the FK field's `relation` key.

### belongsTo

```php
[
    'name'      => 'User',
    'field'     => 'user_id',
    'type'      => 'combobox',
    'endPoint'  => '/laravel-auto-crud/user',
    'itemTitle' => 'name',
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

## Anti-patterns

```php
// ❌ Writing the Eloquent method when the field already declares `relation`
public function user() { return $this->belongsTo(User::class); }
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
