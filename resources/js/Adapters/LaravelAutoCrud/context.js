import { inject } from "vue"

export const AUTO_CRUD_ADAPTER_KEY = Symbol("laravel-auto-crud-adapter")

let globalAdapter = null

export function setAutoCrudAdapter(adapter) {
  globalAdapter = adapter
}

export function createAutoCrudPlugin(options = {}) {
  return {
    install(app) {
      if (!options.adapter) {
        throw new Error("Laravel AutoCrud adapter is required")
      }

      setAutoCrudAdapter(options.adapter)
      app.provide(AUTO_CRUD_ADAPTER_KEY, options.adapter)
    },
  }
}

export function getAutoCrudAdapter() {
  if (!globalAdapter) {
    throw new Error(
      "Laravel AutoCrud adapter not configured. Use createAutoCrudPlugin({ adapter }) with createInertiaAutoCrudAdapter() or createApiAutoCrudAdapter().",
    )
  }

  return globalAdapter
}

export function useAutoCrud() {
  const adapter = inject(AUTO_CRUD_ADAPTER_KEY, globalAdapter)

  if (!adapter) {
    return getAutoCrudAdapter()
  }

  return adapter
}
