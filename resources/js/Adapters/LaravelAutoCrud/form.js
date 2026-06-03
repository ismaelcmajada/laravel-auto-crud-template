import { reactive, watch } from "vue"

const clone = (value) => structuredClone(value ?? {})

export function createAdapterForm(defaults, submitter) {
  let defaultValues = clone(defaults)
  let transformer = (data) => data

  const form = reactive({
    ...clone(defaults),
    errors: {},
    processing: false,
    wasSuccessful: false,
    recentlySuccessful: false,
    isDirty: false,

    data() {
      const reserved = new Set([
        "errors",
        "processing",
        "wasSuccessful",
        "recentlySuccessful",
        "isDirty",
        "data",
        "defaults",
        "reset",
        "clearErrors",
        "setError",
        "transform",
        "submit",
        "get",
        "post",
        "put",
        "patch",
        "delete",
      ])

      return Object.keys(form).reduce((data, key) => {
        if (!reserved.has(key)) {
          data[key] = form[key]
        }

        return data
      }, {})
    },

    defaults(values) {
      defaultValues = clone(values ?? form.data())
      form.isDirty = false
      return form
    },

    reset(...fields) {
      const values = clone(defaultValues)

      if (fields.length === 0) {
        for (const key of Object.keys(form.data())) {
          delete form[key]
        }

        for (const key of Object.keys(values)) {
          form[key] = values[key]
        }
      } else {
        for (const field of fields) {
          form[field] = values[field]
        }
      }

      form.isDirty = false
      return form
    },

    clearErrors(...fields) {
      if (fields.length === 0) {
        form.errors = {}
      } else {
        for (const field of fields) {
          delete form.errors[field]
        }
      }

      return form
    },

    setError(field, value) {
      form.errors[field] = value
      return form
    },

    transform(callback) {
      transformer = callback
      return form
    },

    async submit(method, url, options = {}) {
      form.processing = true
      form.wasSuccessful = false
      form.clearErrors()

      try {
        const payload = transformer(form.data())
        const result = await submitter(method, url, payload, options)
        form.wasSuccessful = true
        form.recentlySuccessful = true
        form.isDirty = false
        options.onSuccess?.(result)
        return result
      } catch (error) {
        form.errors = error.errors ?? {}
        options.onError?.(form.errors, error)
        throw error
      } finally {
        form.processing = false
      }
    },

    get(url, options = {}) {
      return form.submit("get", url, options)
    },

    post(url, options = {}) {
      return form.submit("post", url, options)
    },

    put(url, options = {}) {
      return form.submit("put", url, options)
    },

    patch(url, options = {}) {
      return form.submit("patch", url, options)
    },

    delete(url, options = {}) {
      return form.submit("delete", url, options)
    },
  })

  watch(
    () => form.data(),
    (value) => {
      form.isDirty = JSON.stringify(value) !== JSON.stringify(defaultValues)
    },
    { deep: true },
  )

  return form
}

export function normalizeApiResponse(response) {
  const payload = response?.data ?? response ?? {}
  const data = Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload
  const message =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.success === "string"
        ? payload.success
        : null

  return {
    raw: response,
    data,
    meta: payload.meta ?? {},
    flash: {
      data,
      success: message,
      message,
    },
  }
}

export function normalizeApiError(error) {
  const payload = error?.response?.data ?? error ?? {}

  return {
    raw: error,
    status: error?.response?.status,
    message: payload.message ?? "Error en la petición",
    errors: payload.errors ?? {},
  }
}
