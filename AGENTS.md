# Agent Guidance

## Project stack

- **Backend:** Laravel 12
- **Frontend:** Inertia.js (Vue 3) + Vuetify 3
- **CRUD:** `ismaelcmajada/laravel-auto-crud` (autogenerates routes, controllers, validation, tables, forms, etc.)
- **Language:** UI is in Spanish

## Global architecture (already set up — do not repeat)

1. **`app/Providers/NavigationServiceProvider.php`**
   - Exposes `app('navigation')` as a singleton.
   - Navigation entries are declared as an array of arrays with keys: `name`, `icon`, `model` (optional), `path` (optional), `dividers` (optional), `childs` (optional).
   - When `model` is provided, the path is auto-generated as `/dashboard/{modelName}` (e.g. `App\Models\User` → `/dashboard/user`).
   - Navigation is filtered by role using `$modelClass::getForbiddenActions()`; if `index` is forbidden for the user's role, the item is hidden.
   - **To add a new nav item:** register the model class under the `model` key. Do **not** hardcode paths for AutoCrud models.

2. **`app/Http/Middleware/HandleInertiaRequests.php`**
   - Already shares `models` (auto-discovered AutoCrud models) and `navigation` with every Inertia response.
   - Do **not** modify this file to add new models; simply placing a model under `app/Models/**` with the `AutoCrud` trait is enough.

## Adding a new CRUD

Follow the golden path from the `laravel-auto-crud` skill docs. Project-specific conventions:

1. **Migration** → create the table (add `softDeletes()` when needed).
2. **Model** → `app/Models/<Model>.php` using `AutoCrud` trait + `getFields()`.
3. **Navigation** → add the model to `NavigationServiceProvider::generateNavigation()` with `'model' => Model::class`.
4. **Route** → no manual route needed; the existing catch-all already handles it:
   ```php
   Route::get('/{model}', [AutoCrudController::class, 'index'])->name('laravel-auto-crud.model.index');
   ```
   If you need a named route for redirects, reuse `route('laravel-auto-crud.model.index', ['model' => 'user'])`.
5. **Vue page** → create `resources/js/Pages/Dashboard/<Model>.vue` (PascalCase filename) and import `AutoTable`:
   ```vue
   <script setup>
   import AutoTable from "@/Components/LaravelAutoCrud/AutoTable.vue"
   import { usePage } from "@inertiajs/vue3"
   const model = usePage().props.models.user
   </script>
   <template>
     <auto-table title="Usuarios" :model="model" />
   </template>
   ```

   - Use Spanish for the `title` prop.
   - The `models` key is the snake_case / lowercase model name (e.g. `user`, `product_category`).

## Rules that apply on top of the skill docs

- **Never create controllers, FormRequests or resource routes** for AutoCrud models. The `AutoCrudController::index` route is already registered.
- **Never edit published package files** under `resources/js/Components/LaravelAutoCrud/`, `resources/js/Composables/LaravelAutoCrud/`, `resources/js/Utils/LaravelAutoCrud/`, or `config/laravel-auto-crud.php`. Customise via props, slots or wrapper components.
- **UI text must be in Spanish** (`title`, `nav names`, labels when overriding slots, etc.).
- **`select` field `options` must be a flat array of strings** (e.g. `['activo', 'inactivo']`). Associative arrays or object arrays are not supported.
- **Foreign keys** are declared inside `getFields()` via the `relation` key; do not manually write Eloquent relationship methods just for CRUD metadata.
- **Many-to-many / hasMany** relations go in `protected static $externalRelations = [...]` on the model.
- **Role-based access** is driven by `$forbiddenActions` on the model (array keyed by role). The navigation provider already respects it.

## File locations

| Concern                              | Location                                        |
| ------------------------------------ | ----------------------------------------------- |
| Migrations                           | `database/migrations/`                          |
| Models                               | `app/Models/`                                   |
| Navigation config                    | `app/Providers/NavigationServiceProvider.php`   |
| Inertia middleware                   | `app/Http/Middleware/HandleInertiaRequests.php` |
| Web routes (auth + dashboard prefix) | `routes/web.php`                                |
| Vue pages                            | `resources/js/Pages/Dashboard/`                 |
| Auth routes                          | `routes/auth.php`                               |

## When in doubt

- Consult the `laravel-auto-crud` skill for recipes (relations, custom validation, files/images, calendar, hooks, search scopes, forbidden actions, etc.).
- Keep changes minimal: migration → model with `getFields()` → navigation entry → Vue page with `<auto-table>`.

===

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

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

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
- To check environment variables, read the `.env` file directly.

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

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

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
