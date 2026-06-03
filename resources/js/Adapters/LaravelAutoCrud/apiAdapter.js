import axiosDefault from "axios"
import {
  createAdapterForm,
  normalizeApiError,
  normalizeApiResponse,
} from "./form"

const isFileValue = (value) =>
  typeof File !== "undefined" && value instanceof File

const toFormData = (data) => {
  const formData = new FormData()

  Object.entries(data ?? {}).forEach(([key, value]) => {
    if (value === undefined) return

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item))
      return
    }

    if (value === null) {
      formData.append(key, "")
      return
    }

    formData.append(key, value)
  })

  return formData
}

const hasFile = (data) =>
  Object.values(data ?? {}).some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => isFileValue(item))
    }

    return isFileValue(value)
  })

export function createApiAutoCrudAdapter(options = {}) {
  const http = options.axios ?? axiosDefault
  const baseUrl = (options.baseUrl ?? "/api/laravel-auto-crud").replace(/\/$/, "")
  const models = options.models ?? {}

  const request = async (method, url, data = {}, config = {}) => {
    try {
      const response = await http.request({
        url,
        method,
        data,
        ...config,
        headers: {
          Accept: "application/json",
          ...(config.headers ?? {}),
        },
      })

      return normalizeApiResponse(response)
    } catch (error) {
      throw normalizeApiError(error)
    }
  }

  return {
    mode: "api",
    baseUrl,
    page: () => null,
    user: () => options.getAuthUser?.() ?? null,
    models: () => models,
    model: (name) => models[name] ?? null,
    customFieldsEndpoint: (modelName) => `${baseUrl}/custom-fields/${modelName}`,
    customFieldsTypesEndpoint: () => `${baseUrl}/custom-fields-types`,
    assetUrl: (path) => `${baseUrl}/${path}`,
    loadSchema: async (model) => {
      const result = await request("get", `${baseUrl}/${model}/schema`)
      models[model] = result.data
      return result.data
    },
    get: (url, config = {}) => request("get", url, {}, config),
    post: (url, data = {}, config = {}) => request("post", url, data, config),
    put: (url, data = {}, config = {}) => request("put", url, data, config),
    patch: (url, data = {}, config = {}) => request("patch", url, data, config),
    delete: (url, data = {}, config = {}) => request("delete", url, data, config),
    mutate: (method, url, data = {}, config = {}) => request(method, url, data, config),
    form: (defaults) =>
      createAdapterForm(defaults, (method, url, data, formOptions = {}) => {
        let payload = data
        const config = {}

        if (formOptions._method) {
          payload = { ...payload, _method: formOptions._method }
        }

        if (formOptions.forceFormData || hasFile(payload)) {
          payload = toFormData(payload)
          config.headers = { "Content-Type": "multipart/form-data" }
        }

        return request(method, url, payload, config)
      }),
  }
}
