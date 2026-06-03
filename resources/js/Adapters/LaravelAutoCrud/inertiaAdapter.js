import { router, useForm, usePage } from "@inertiajs/vue3"
import axiosDefault from "axios"
import { normalizeApiError, normalizeApiResponse } from "./form"

const normalizePage = (page) => ({
  raw: page,
  data: page?.props?.flash?.data,
  flash: page?.props?.flash ?? {},
  meta: {},
})

export function createInertiaAutoCrudAdapter(options = {}) {
  const http = options.axios ?? axiosDefault

  const request = async (method, url, data = {}, config = {}) => {
    try {
      const response = await http.request({ url, method, data, ...config })
      return normalizeApiResponse(response)
    } catch (error) {
      throw normalizeApiError(error)
    }
  }

  return {
    mode: "inertia",
    page: () => usePage(),
    user: () => usePage().props?.auth?.user ?? null,
    models: () => usePage().props?.models ?? {},
    model: (name) => usePage().props?.models?.[name] ?? null,
    customFieldsEndpoint: (modelName) => `/laravel-auto-crud/custom-fields/${modelName}`,
    customFieldsTypesEndpoint: () => "/laravel-auto-crud/custom-fields-types",
    assetUrl: (path) => `/laravel-auto-crud/${path}`,
    loadSchema: async (model) => {
      const models = usePage().props?.models ?? {}
      return models[model] ?? null
    },
    get: (url, config = {}) => request("get", url, {}, config),
    post: (url, data = {}, config = {}) => request("post", url, data, config),
    put: (url, data = {}, config = {}) => request("put", url, data, config),
    patch: (url, data = {}, config = {}) => request("patch", url, data, config),
    delete: (url, data = {}, config = {}) => request("delete", url, data, config),
    mutate: (method, url, data = {}, options = {}) =>
      new Promise((resolve, reject) => {
        const visitOptions = {
          ...options,
          onSuccess: (page) => {
            const result = normalizePage(page)
            options.onSuccess?.(result)
            resolve(result)
          },
          onError: (errors) => {
            options.onError?.(errors)
            reject({ errors })
          },
        }

        if (method === "delete") {
          router.delete(url, visitOptions)
          return
        }

        if (method === "put") {
          router.put(url, data, visitOptions)
          return
        }

        if (method === "patch") {
          router.patch(url, data, visitOptions)
          return
        }

        router.post(url, data, visitOptions)
      }),
    routerPost: (url, data = {}, options = {}) =>
      new Promise((resolve, reject) => {
        router.post(url, data, {
          ...options,
          onSuccess: (page) => {
            const result = normalizePage(page)
            options.onSuccess?.(result)
            resolve(result)
          },
          onError: (errors) => {
            options.onError?.(errors)
            reject({ errors })
          },
        })
      }),
    form: (defaults) => {
      const form = useForm(defaults)
      const originalPost = form.post.bind(form)
      const originalPut = form.put?.bind(form)
      const originalPatch = form.patch?.bind(form)
      const originalDelete = form.delete?.bind(form)

      form.post = (url, options = {}) =>
        originalPost(url, {
          ...options,
          onSuccess: (page) => options.onSuccess?.(normalizePage(page)),
        })

      if (originalPut) {
        form.put = (url, options = {}) =>
          originalPut(url, {
            ...options,
            onSuccess: (page) => options.onSuccess?.(normalizePage(page)),
          })
      }

      if (originalPatch) {
        form.patch = (url, options = {}) =>
          originalPatch(url, {
            ...options,
            onSuccess: (page) => options.onSuccess?.(normalizePage(page)),
          })
      }

      if (originalDelete) {
        form.delete = (url, options = {}) =>
          originalDelete(url, {
            ...options,
            onSuccess: (page) => options.onSuccess?.(normalizePage(page)),
          })
      }

      return form
    },
  }
}
