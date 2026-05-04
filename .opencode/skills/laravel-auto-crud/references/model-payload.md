# Model payload contract

This is the exact shape of `page.props.models.<modelName>`. It is produced by the `AutoCrud` trait's `getModel()` method on the backend and shared via Inertia's `app('models')` singleton. **All custom frontends (Vue pages, custom widgets, ad-hoc fetches) must read from this object** instead of hard-coding endpoints, headers or rules.

> ⚠️ Key naming: the trait emits `endPoint` (capital `P`), not `endpoint`. Same casing on the field-level: `endPoint`, `tableKey`, `formKey`, `comboField`, `itemTitle`, `morphType`, `polymorphic`, `pivotTable`, `pivotFields`, `pivotModel`, `foreignKey`, `relatedKey`, `localKey`, `customFieldsEnabled`, `forbiddenActions`, `calendarFields`, `externalRelations`.

## Top-level shape

```ts
{
  endPoint:           string  // e.g. "/laravel-auto-crud/product"
  formFields:         FormField[]
  tableHeaders:       TableHeader[]
  externalRelations:  ExternalRelation[]
  forbiddenActions:   { [role: string]: string[] }   // 'custom' is stripped
  calendarFields:     CalendarFieldsConfig | null
  customFieldsEnabled: boolean
}
```

## `endPoint`

Base CRUD URL for the model: `/laravel-auto-crud/{modelNameLowercase}`. Build sub-URLs from it — never hard-code:

```js
const base = model.endPoint // /laravel-auto-crud/product
axios.post(`${base}/load-items`, payload) // table data
axios.post(`${base}/load-autocomplete-items`, payload)
axios.post(`${base}/load-calendar-events`, payload)
axios.get(`${base}/all`) // full list (autocomplete fallback)
axios.get(`${base}/${id}`) // getItem
axios.post(base, payload) // store
axios.post(`${base}/${id}`, payload) // update
axios.post(`${base}/${id}/destroy`, payload) // soft delete
axios.post(`${base}/${id}/permanent`, payload) // hard delete
axios.post(`${base}/${id}/restore`, payload) // restore
axios.get(`${base}/export-excel`, { params }) // excel export
axios.post(`${base}/${id}/bind/${rel}/${itemId}`) // attach M2M
axios.post(`${base}/${id}/unbind/${rel}/${itemId}`) // detach M2M
axios.post(`${base}/${id}/pivot/${rel}/${itemId}`, payload) // update pivot
```

Static asset URLs (not derived from `endPoint`):

```
GET /laravel-auto-crud/public/images/{model}/{field}/{id}
GET /laravel-auto-crud/public/files/{model}/{field}/{id}
GET /laravel-auto-crud/private/images/{model}/{field}/{id}   // auth + decrypted
GET /laravel-auto-crud/private/files/{model}/{field}/{id}    // auth + decrypted
```

`{model}` here is the lowercase class basename (same one used in `endPoint`).

## `formFields[]`

The list of fields visible in `<auto-form>` / `<auto-form-dialog>`, derived from `getFields()` filtered by `form: true` (plus auto-injected `comboField` shadows and custom fields when `customFieldsEnabled`). Each entry preserves the original keys you wrote in `getFields()`:

```ts
{
  name?:    string
  field:    string
  type:     'string'|'number'|'decimal'|'boolean'|'password'|'text'
            |'telephone'|'date'|'datetime'|'select'|'combobox'
            |'image'|'file'|'json'
  form:     true
  hidden?:  boolean      // hide from UI but keep in payload
  default?: any
  onlyUpdate?: boolean
  options?: string[]     // select only — flat strings
  endPoint?: string      // combobox — autofilled from related model
  itemTitle?: string     // combobox
  comboField?: string
  rules?: { required?: bool, unique?: bool, custom?: string[] }
  relation?: {
    model?:       string  // FQCN, omitted for morphTo
    relation:     string
    tableKey?:    string  // "{name} ({email})"
    formKey?:     string
    polymorphic?: boolean
    morphType?:   string
    endPoint?:    string  // autofilled (non-polymorphic only)
  }
  // for custom fields:
  isCustomField?: boolean
}
```

## `tableHeaders[]`

What `<auto-table>` renders as columns. Derived from fields with `table: true`, plus custom-field columns (`show_in_table`), plus `externalRelations` with `table: true`, plus a final `actions` column.

```ts
type TableHeader =
  | {
      title: string
      key: string
      sortable: boolean
      align: "center"
      type: string
    } // plain field
  | {
      title: string
      key: string
      sortable: true
      align: "center"
      relation: RelationConfig
    } // belongsTo
  | {
      title: string
      key: string
      sortable: true
      align: "center"
      type: string
      isCustomField: true
    } // custom field
  | { title: string; key: string; sortable: false; align: "center" } // external relation OR actions
```

`key` is the column accessor for `<auto-table>` slots: `#item.<key>`. The actions column always has `key: 'actions'` and `title: 'Acciones'`.

## `externalRelations[]`

`hasMany` / `belongsToMany` relations declared in `protected static $externalRelations` on the model. Each entry has its `endPoint` autofilled (and pivot fields' `relation.endPoint` autofilled too):

```ts
{
  name:        string
  relation:    string
  type?:       'belongsToMany' | 'hasMany'   // default: belongsToMany
  model:       string                         // related model FQCN
  endPoint:    string                         // autofilled
  table?:      boolean                        // adds a column to tableHeaders
  // belongsToMany:
  pivotTable?: string
  foreignKey?: string
  relatedKey?: string
  pivotModel?: string
  pivotFields?: FormField[]                   // each follows the FormField shape
  // hasMany:
  foreignKey?: string
  localKey?:   string
}
```

## `forbiddenActions`

Map from role name to forbidden CRUD verbs. The `'custom'` sub-key is stripped before reaching the frontend, so what you receive is safe to compare directly against UI button identifiers (`store`, `update`, `destroy`, `destroyPermanent`, `restore`, …).

```js
const role = page.props.auth.user.role
const forbidden = model.forbiddenActions[role] ?? []
const canDelete = !forbidden.includes("destroy")
```

The `CheckForbiddenActions` middleware enforces the same rules server-side, so hiding a button is purely cosmetic — never the only line of defence.

## `calendarFields`

Configuration block for `<auto-calendar>`. Whatever the model declared in `protected static $calendarFields` is forwarded as-is. Typical shape:

```ts
{ start: string, end?: string, title: string, color?: string }
```

`null` / unset → calendar is not applicable for this model.

## `customFieldsEnabled`

`true` when the model declares `protected static $customFieldsEnabled = true;`. When enabled:

- `formFields` already contains custom fields appended at the end (each marked with `isCustomField: true`).
- `tableHeaders` already contains the visible custom columns (each marked with `isCustomField: true`, `key: 'custom_<name>'`).
- The CRUD admin endpoints `/laravel-auto-crud/custom-fields/{model}` (index/store/update/destroy/reorder) and `/laravel-auto-crud/custom-fields-types` are available for managing the definitions.
- On the model row, custom values are exposed under `custom_<name>` keys.

## Building a custom frontend — checklist

When you need a non-standard UI (custom dashboard, bespoke list, modal flow):

1. **Read** `page.props.models.<name>` — never hard-code anything that the payload already has.
2. Use `model.endPoint` to build URLs, including for `load-items`, `bind`, `unbind`, `pivot`, `export-excel`, etc.
3. Use `model.tableHeaders` if you want the same column projection as `<auto-table>` but with a different layout — the `key` and `type` are already there.
4. Use `model.formFields` to drive a custom form widget (the rules in `field.rules` mirror what the backend `DynamicFormRequest` enforces).
5. Use `model.externalRelations` to discover M2M / hasMany endpoints (`relation.endPoint`).
6. Use `model.forbiddenActions[currentUserRole]` to gate UI affordances.
7. For polymorphic FK fields, check `field.relation.polymorphic` and use `field.relation.morphType` to read the morph-type column from the row.
8. Continue to **import** published components for primitives you don't want to rewrite (e.g. `VDatetimePicker`, `AutocompleteServer`) — never patch them.

## Anti-patterns

```js
// ❌ Hard-coding endpoint
axios.post("/laravel-auto-crud/products/load-items", payload)
// ✅
axios.post(`${model.endPoint}/load-items`, payload)
```

```js
// ❌ Reading "endpoint" (lowercase 'p')
const base = model.endpoint // undefined
// ✅
const base = model.endPoint
```

```js
// ❌ Recomputing column titles in JS
const headers = [{ title: "Name", key: "name" } /* … */]
// ✅
const headers = model.tableHeaders
```

```js
// ❌ Re-declaring validation rules on the client
if (!form.email) errors.email = "Required"
// ✅
const emailField = model.formFields.find((f) => f.field === "email")
if (emailField.rules?.required && !form.email) errors.email = "Required"
```
