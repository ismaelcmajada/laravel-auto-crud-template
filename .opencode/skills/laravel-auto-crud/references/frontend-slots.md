# Frontend customisation (slots & props)

**Never edit the published Vue components** in `resources/js/Components/LaravelAutoCrud/`. They are overwritten by `vendor:publish --force`. All customisation goes through **props and slots** of the components you import.

## The model payload

`page.props.models.<lowercaseClassBasename>` contains everything the components need:

- `endPoint` — base CRUD endpoint (note the capital `P`)
- `tableHeaders` — computed columns
- `formFields` — form schema with rules
- `externalRelations` — hasMany / belongsToMany metadata
- `forbiddenActions`, `calendarFields`, `customFieldsEnabled`

Always read from this object — don't reconstruct it. Full contract: [`model-payload.md`](model-payload.md).

## AutoTable slots

| Slot                     | Use for                                           |
| ------------------------ | ------------------------------------------------- |
| `#table.actions.prepend` | Buttons before the default table actions toolbar. |
| `#table.actions`         | Replace the default toolbar actions.              |
| `#table.actions.append`  | Buttons after the default table actions toolbar.  |
| `#item.<columnKey>`      | Custom rendering for a column cell.               |
| `#item.actions.prepend`  | Row actions prepended.                            |
| `#item.actions`          | Replace row actions.                              |
| `#item.actions.append`   | Row actions appended.                             |

## AutoForm / AutoFormDialog slots

| Slot                                            | Use for                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `#auto-form-dialog.auto-form.field.<fieldName>` | Custom rendering of a single form field. |
| `#auto-form-dialog.auto-form.prepend`           | Content above the form.                  |
| `#auto-form-dialog.auto-form.append`            | Content below the form.                  |
| `#auto-form-dialog.auto-form.after-save`        | Content after the save button block.     |

## AutoExternalRelation slots

| Slot                                         | Use for                                  |
| -------------------------------------------- | ---------------------------------------- |
| `#auto-external-relation.<relation>.actions` | Custom actions for an external relation. |

## Example: custom column

```vue
<auto-table title="Products" :model="model">
  <template #item.price="{ item }">
    <strong>{{ item.price }} €</strong>
  </template>
</auto-table>
```

## Example: dialog-only page

```vue
<script setup>
import AutoFormDialog from "@/Components/LaravelAutoCrud/AutoFormDialog.vue"
import { usePage } from "@inertiajs/vue3"
const model = usePage().props.models.product
</script>

<template>
  <auto-form-dialog :model="model" />
</template>
```

You can also pass `model-name="App\\Models\\Product"` instead of `:model`.

## Anti-patterns

- ❌ Editing `AutoTable.vue` to add a column → use `#item.<key>` slot.
- ❌ Forking `AutoForm.vue` to change a field's widget → use `#auto-form-dialog.auto-form.field.<name>` slot.
- ❌ Hard-coding `/laravel-auto-crud/products/...` in fetch calls → read `model.endPoint`.

See full package docs: `docs/frontend/auto-table.md`, `docs/frontend/auto-form.md`, `docs/frontend/auto-form-dialog.md`.
