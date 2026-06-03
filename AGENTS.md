<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v3
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- tightenco/ziggy (ZIGGY) - v1
- laravel/boost (BOOST) - v2
- laravel/mcp (MCP) - v0
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- pestphp/pest (PEST) - v4
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/vue3 (INERTIA_VUE) - v3
- tailwindcss (TAILWINDCSS) - v3
- vue (VUE) - v3

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `pnpm run build`, `pnpm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/Pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-vue-development` when working with Inertia Vue client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `pnpm run build` or ask the user to run `pnpm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

## Pest

- This project uses Pest for testing. Create tests: `php artisan make:test --pest {name}`.
- The `{name}` argument should not include the test suite directory. Use `php artisan make:test --pest SomeFeatureTest` instead of `php artisan make:test --pest Feature/SomeFeatureTest`.
- Run tests: `php artisan test --compact` or filter: `php artisan test --compact --filter=testName`.
- Do NOT delete tests without approval.

=== inertia-vue/core rules ===

# Inertia + Vue

Vue components must have a single root element.

- IMPORTANT: Activate `inertia-vue-development` when working with Inertia Vue client-side patterns.

</laravel-boost-guidelines>

<!-- LARAVEL_AUTO_CRUD_AI_CONTEXT_START -->
# Laravel Auto Crud AI Context

> Automatically generated by `php artisan ai:context`. Edit other parts of `AGENTS.md`; this block is replaced when regenerated.

## Agent Instructions

- Before making Laravel AutoCrud, CRUD, model, migration, route, Inertia or Vue page changes, load and follow the `laravel-auto-crud` skill.
- Prefer AutoCrud model metadata over manual CRUD controllers, FormRequests, resource routes or duplicated frontend logic.
- After making changes that affect models, database schema, routes, Inertia pages or Vue components, run `php artisan ai:context` and keep this section updated.
- Treat this generated context as the current project map for AI-assisted work.

Generated: 2026-06-03 00:16:29

## Models

### AutoCrud Models

#### Record

Class: `App\Models\Record`
Table: `records`

Fillable:
- user_id
- model
- action
Casts:
- id: int
- user_id: integer
- element_id: integer
AutoCrud Fields:
- user_id (number): Usuario
- element_id (number): Elemento
- model (string): Modelo
- action (string): Acción
Relations:
- user (belongsTo) -> `App\Models\User` via `user_id`
- recordable (morphTo) via `element_id`

#### User

Class: `App\Models\User`
Table: `users`

Fillable:
- name
- email
- password
- role
Casts:
- id: int
- deleted_at: datetime
- password: string
AutoCrud Fields:
- name (string): Nombre
- email (email): Email
- password (password): Contraseña
- role (select): Rol
Relations:
- None detected

### Regular Models

No models in this group.

## Database

### custom_field_definitions

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| model_type | varchar | no |
| name | varchar | no |
| label | varchar | no |
| type | varchar | no |
| options | json | yes |
| rules | json | yes |
| order | int | no |
| is_active | tinyint | no |
| show_in_table | tinyint | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

FK:
- None

### custom_field_values

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| custom_field_definition_id | bigint | no |
| model_type | varchar | no |
| model_id | bigint | no |
| value | text | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

FK:
- custom_field_definition_id -> custom_field_definitions.id

### failed_jobs

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| uuid | varchar | no |
| connection | text | no |
| queue | text | no |
| payload | longtext | no |
| exception | longtext | no |
| failed_at | timestamp | no |

FK:
- None

### migrations

| Field | Type | Nullable |
| --- | --- | --- |
| id | int | no |
| migration | varchar | no |
| batch | int | no |

FK:
- None

### password_reset_tokens

| Field | Type | Nullable |
| --- | --- | --- |
| email | varchar | no |
| token | varchar | no |
| created_at | timestamp | yes |

FK:
- None

### personal_access_tokens

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| tokenable_type | varchar | no |
| tokenable_id | bigint | no |
| name | varchar | no |
| token | varchar | no |
| abilities | text | yes |
| last_used_at | timestamp | yes |
| expires_at | timestamp | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

FK:
- None

### records

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| user_id | int | no |
| element_id | int | no |
| model | varchar | no |
| action | varchar | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

FK:
- None

### users

| Field | Type | Nullable |
| --- | --- | --- |
| id | bigint | no |
| name | varchar | no |
| email | varchar | no |
| password | varchar | no |
| role | varchar | no |
| remember_token | varchar | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | yes |

FK:
- None

## Inertia Pages

### Dashboard/CalendarExpample

Route: `GET /dashboard/calendar-example`
Controller: `Closure`
Props:
- None

### Dashboard/

Route: `GET /dashboard/{model}`
Controller: `Ismaelcmajada\LaravelAutoCrud\Http\Controllers\AutoCrudController@index`
Props:
- None

### Auth/Login

Route: `GET /login`
Controller: `App\Http\Controllers\Auth\AuthenticatedSessionController@create`
Props:
- status

## Vue Pages

### Pages/Auth/Login.vue

Props:
- status
Events:
- None
Uses:
- Head

### Pages/Dashboard/User.vue

Props:
- None
Events:
- None
Uses:
- AutoTable

## Vue Components

### Components/LaravelAutoCrud/AutoCalendar.vue

Props:
- model
Events:
- None
Uses:
- VueCal
- AutoFormDialog

### Components/LaravelAutoCrud/AutoExternalRelation.vue

Props:
- item
- endPoint
- externalRelation
- withTitle
- customFilters
- filteredItems
- customItemProps
- formData
- noFilterItems
Events:
- bound
- unbound
- childCreated
- childUpdated
- childDeleted
Uses:
- AutocompleteServer
- AutoFormDialog
- AutoTable

### Components/LaravelAutoCrud/AutoForm.vue

Props:
- item
- type
- model
- customFilters
- filteredItems
- customItemProps
Events:
- update:item
- update:type
- formChange
- isDirty
- success
- close
- update
Uses:
- AutoExternalRelation
- AutocompleteServer
- AutoFormDialog
- VDatetimePicker

### Components/LaravelAutoCrud/AutoFormDialog.vue

Props:
- show
- item
- type
- model
- customFilters
- filteredItems
- customItemProps
- modelName
Events:
- update:show
- update:type
- update:item
- formChange
- isDirty
- success
- update
Uses:
- AutoForm

### Components/LaravelAutoCrud/AutoTable.vue

Props:
- title
- model
- customFilters
- filteredItems
- search
- exactFilters
- orderBy
- customItemProps
- itemsPerPage
- itemsPerPageOptions
- customHeaders
- hideReset
- listMode
- rowProps
- hiddenColumns
Events:
- closeDialog
- openDialog
- formChange
- update:item
- update
Uses:
- AutoFormDialog
- AutoForm
- DestroyDialog
- RestoreDialog
- DestroyPermanentDialog
- LoadingOverlay
- ExpandableText
- HistoryDialog
- ImageDialog
- CustomFieldsManager

### Components/LaravelAutoCrud/AutocompleteServer.vue

Props:
- modelValue
- itemTitle
- label
- rules
- endPoint
- hideDetails
- customFilter
- density
- itemProps
- customFilters
- item
- items
- filteredItems
- formData
Events:
- update:modelValue
- update
Uses:
- None

### Components/LaravelAutoCrud/CustomFieldsManager.vue

Props:
- modelName
- type
- required
Events:
- updated
Uses:
- DestroyDialog

### Components/LaravelAutoCrud/DestroyDialog.vue

Props:
- show
- elementName
- item
- items
- endPoint
Events:
- closeDialog
- reloadItems
Uses:
- None

### Components/LaravelAutoCrud/DestroyPermanentDialog.vue

Props:
- show
- elementName
- item
- items
- endPoint
Events:
- closeDialog
- reloadItems
Uses:
- None

### Components/LaravelAutoCrud/ExpandableList.vue

Props:
- text
- length
Events:
- None
Uses:
- None

### Components/LaravelAutoCrud/ExpandableText.vue

Props:
- text
- length
Events:
- None
Uses:
- None

### Components/LaravelAutoCrud/HistoryDialog.vue

Props:
- show
- item
Events:
- closeDialog
Uses:
- None

### Components/LaravelAutoCrud/ImageDialog.vue

Props:
- show
- imageUrl
- altText
Events:
- closeDialog
Uses:
- None

### Components/LaravelAutoCrud/LoadingOverlay.vue

Props:
- None
Events:
- None
Uses:
- None

### Components/LaravelAutoCrud/RestoreDialog.vue

Props:
- show
- elementName
- item
- items
- endPoint
Events:
- closeDialog
- reloadItems
Uses:
- None

### Components/LaravelAutoCrud/VDatetimePicker.vue

Props:
- datetime
- type
- default
- disabled
- loading
- label
- dialogWidth
- dateFormat
- timeFormat
- clearText
- okText
- textFieldProps
Events:
- update:datetime
- update
Uses:
- None

### Components/NavBar.vue

Props:
- theme
Events:
- update:theme
- update
Uses:
- None

### Components/NavBarMobile.vue

Props:
- theme
Events:
- update:theme
- update
Uses:
- None

<!-- LARAVEL_AUTO_CRUD_AI_CONTEXT_END -->
