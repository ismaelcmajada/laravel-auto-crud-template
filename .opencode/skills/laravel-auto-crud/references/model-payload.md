# Model payload contract

This is the exact shape of the AutoCrud model payload. In Inertia screens it is available as `page.props.models.<modelName>`, produced by the `AutoCrud` trait's `getModel()` method and shared via Inertia's `app('models')` singleton. In JSON API mode it is available as `data` from `GET /api/laravel-auto-crud/{model}/schema`. **All custom frontends (Vue pages, custom widgets, ad-hoc fetches, external SPAs, mobile apps) must read from this object** instead of hard-coding endpoints, headers or rules.

> ⚠️ Key naming: the trait emits `endPoint` (capital `P`), not `endpoint`. Same casing on the field-level: `endPoint`, `tableKey`, `formKey`, `comboField`, `itemTitle`, `morphType`, `polymorphic`, `pivotTable`, `pivotFields`, `pivotModel`, `foreignKey`, `relatedKey`, `localKey`, `customFieldsEnabled`, `forbiddenActions`, `calendarFields`, `externalRelations`.

## Top-level shape

```ts
{
  endPoint:           string  // e.g. "/laravel-auto-crud/product"
  endPoints:          { web: string, api: string }
  formFields:         FormField[]
  tableHeaders:       TableHeader[]
  externalRelations:  ExternalRelation[]
  forbiddenActions:   { [role: string]: string[] }   // 'custom' is stripped
  calendarFields:     CalendarFieldsConfig | null
  customFieldsEnabled: boolean
}
```

## `endPoint`

Base CRUD URL for the model. In web/Inertia context it is `/laravel-auto-crud/{modelNameLowercase}`. In API context it is `/api/laravel-auto-crud/{modelNameLowercase}`. Build sub-URLs from it — never hard-code:

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

The payload also includes `endPoints` for both interfaces:

```js
model.endPoints.web // /laravel-auto-crud/product
model.endPoints.api // /api/laravel-auto-crud/product
```

Use `model.endPoint` for the current context. Use `model.endPoints` only when intentionally linking between interfaces.

Static asset URLs (not derived from `endPoint`):

```
GET /laravel-auto-crud/public/images/{model}/{field}/{id}
GET /laravel-auto-crud/public/files/{model}/{field}/{id}
GET /laravel-auto-crud/private/images/{model}/{field}/{id}   // auth + decrypted
GET /laravel-auto-crud/private/files/{model}/{field}/{id}    // auth + decrypted
```

`{model}` here is the lowercase class basename (same one used in `endPoint`).

In API mode, equivalent file endpoints exist under the API prefix:

```
GET /api/laravel-auto-crud/public/images/{model}/{field}/{id}
GET /api/laravel-auto-crud/public/files/{model}/{field}/{id}
GET /api/laravel-auto-crud/private/images/{model}/{field}/{id}
GET /api/laravel-auto-crud/private/files/{model}/{field}/{id}
```

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
- In API mode, the same operations are available under `/api/laravel-auto-crud/custom-fields/{model}` and `/api/laravel-auto-crud/custom-fields-types`.
- On the model row, custom values are exposed under `custom_<name>` keys.

## API mode / external frontends

When the user needs React, Next, mobile, a separate SPA, or any frontend outside Inertia, use the package API mode instead of creating custom controllers.

Publish config if needed with `php artisan vendor:publish --tag=laravel-auto-crud-config`, then enable it in `config/laravel-auto-crud.php`:

```php
'api' => [
    'enabled' => true,
    'prefix' => 'api/laravel-auto-crud',
    'middleware' => ['forceJsonResponse', 'api', 'auth:sanctum', 'checkForbiddenActions'],
    'public_middleware' => null,
],
```

External frontend flow:

1. Authenticate using the configured middleware, typically Sanctum.
2. Register `createAutoCrudPlugin({ adapter: createApiAutoCrudAdapter({ baseUrl, axios }) })` if using the package Vue components.
3. Fetch `GET /api/laravel-auto-crud/{model}/schema`.
4. Read the schema from `response.data.data`.
5. Use `schema.endPoint` to call CRUD endpoints.
6. Render forms from `schema.formFields` and tables from `schema.tableHeaders`.
7. Use `schema.externalRelations` to discover related model endpoints.

Protected API endpoints:

```http
GET    /api/laravel-auto-crud/{model}/schema
POST   /api/laravel-auto-crud/{model}/load-items
GET    /api/laravel-auto-crud/{model}/all
GET    /api/laravel-auto-crud/{model}/{id}
POST   /api/laravel-auto-crud/{model}
PUT    /api/laravel-auto-crud/{model}/{id}
PATCH  /api/laravel-auto-crud/{model}/{id}
DELETE /api/laravel-auto-crud/{model}/{id}
POST   /api/laravel-auto-crud/{model}/{id}/restore
DELETE /api/laravel-auto-crud/{model}/{id}/force
```

Relations:

```http
POST   /api/laravel-auto-crud/{model}/{id}/bind/{externalRelation}/{item}
PUT    /api/laravel-auto-crud/{model}/{id}/pivot/{externalRelation}/{item}
DELETE /api/laravel-auto-crud/{model}/{id}/unbind/{externalRelation}/{item}
```

Custom fields:

```http
GET    /api/laravel-auto-crud/custom-fields-types
GET    /api/laravel-auto-crud/custom-fields/{model}
POST   /api/laravel-auto-crud/custom-fields/{model}
PUT    /api/laravel-auto-crud/custom-fields/{model}/{id}
DELETE /api/laravel-auto-crud/custom-fields/{model}/{id}
POST   /api/laravel-auto-crud/custom-fields/{model}/reorder
```

Do not create `Route::apiResource`, API controllers, or API FormRequests for standard AutoCrud models. If the desired endpoint is one of the above, the package already owns it.

## Building a custom frontend — checklist

When you need a non-standard UI (custom dashboard, bespoke list, modal flow):

1. **Read** `page.props.models.<name>` for Inertia or `GET /api/laravel-auto-crud/{model}/schema` for external frontends — never hard-code anything that the payload already has.
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
