# Field reference

Every entry in `getFields()` is an associative array.

## Required keys

- `name` — human label.
- `field` — DB column name.
- `type` — see types below.

## Common optional keys

| Key          | Purpose                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------ |
| `table`      | `true` to show in `<auto-table>`.                                                          |
| `form`       | `true` to show in `<auto-form>` / `<auto-form-dialog>`.                                    |
| `rules`      | Validation rules (see below).                                                              |
| `default`    | Default value on create.                                                                   |
| `onlyUpdate` | Field only appears in update form.                                                         |
| `hidden`     | Hide from API payload (e.g. passwords).                                                    |
| `options`    | For `select` — **flat array of strings only**.                                             |
| `endPoint`   | For `combobox` — autocomplete endpoint (typically another model's `model.endPoint`).       |
| `itemTitle`  | For `combobox` — field of the related model to display.                                    |
| `comboField` | For `combobox` with multi-key display.                                                     |
| `relation`   | Inline `belongsTo` / `morphTo` declaration (see [relations.md](relations.md)).             |
| `public`     | For `image` / `file` — `true` (default) for public storage, `false` for encrypted private. |

## Types

| Type        | Notes                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `string`    | Plain text input.                                                                                      |
| `number`    | Integer input.                                                                                         |
| `decimal`   | Decimal input.                                                                                         |
| `boolean`   | Checkbox / switch. Auto-cast to `bool`.                                                                |
| `password`  | Auto-hashed (`hashed` cast) and added to `$hidden`.                                                    |
| `text`      | Textarea.                                                                                              |
| `telephone` | Phone input.                                                                                           |
| `date`      | Date picker. Cast with user-timezone `DateWithUserTimezone`.                                           |
| `datetime`  | Datetime picker. Cast with `DateTimeWithUserTimezone`.                                                 |
| `select`    | Requires `options` as flat string array. **Stored value === displayed value.**                         |
| `combobox`  | Server-side autocomplete. Requires `endPoint` + `itemTitle`.                                           |
| `image`     | Image upload. Optional `public`. Stored under `storage/{public\|private}/images/{model}/{field}/{id}`. |
| `file`      | File upload. Same storage convention. Private files are encrypted via `Crypt`.                         |

## `rules` block

```php
'rules' => [
    'required' => true,
    'unique'   => true,
    'custom'   => ['my_rule', 'another_rule'],
],
```

Each name in `custom` maps to a closure returned by the model's `getCustomRules()` method:

```php
public static function getCustomRules(): array
{
    return [
        'my_rule' => function ($attribute, $value, $fail, $request) {
            if ($value === 'forbidden') {
                $fail('Value not allowed.');
            }
        },
    ];
}
```

`$request` is the `DynamicFormRequest`; access the full payload via `$request->getData()`.

## What you should NOT add

- `protected $fillable = [...]` for fields already in `getFields()` — auto-filled.
- `protected $casts = [...]` for `boolean`, `date`, `datetime`, `password` — auto-cast.
- `protected $hidden = ['password']` — auto-hidden.

See full package docs: `docs/fields.md`, `docs/validation.md`.
