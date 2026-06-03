import { ref, watch, reactive, computed } from "vue"
import debounce from "lodash.debounce"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

export default function useTableServer() {
  const autoCrud = useAutoCrud()
  const loading = ref(false)

  const endPoint = ref("")

  const tableData = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [],
    items: [],
    search: {},
    exactFilters: {},
    itemsLength: 0,
    deleted: false,
  })

  let itemsPerPageOptions = [
    { value: 10, title: "10" },
    { value: 25, title: "25" },
    { value: 50, title: "50" },
    { value: 100, title: "100" },
  ]

  const tableHeaders = computed(() =>
    itemHeaders.value.filter((e) => selectedHeaders.value.includes(e.key))
  )
  const selectedHeaders = ref([])
  const itemHeaders = ref([])
  const dynamicModel = ref(null)
  const allHeaders = computed(
    () => selectedHeaders.value.length == itemHeaders.value.length
  )

  const toggleAllHeaders = () => {
    if (allHeaders.value) selectedHeaders.value = []
    else selectedHeaders.value = itemHeaders.value.map((i) => i.key)
  }

  const updateItems = debounce(() => loadItems(), 500)

  const loadItems = () => {
    if (loading.value) {
      return
    }

    loading.value = true

    const cleanedSearch = Object.entries(tableData.search).reduce(
      (a, [k, v]) => (v !== "" ? ((a[k] = v), a) : a),
      {}
    )

    const searchJson = JSON.stringify(cleanedSearch)
    const sortByJson = JSON.stringify(tableData.sortBy)
    const exactFiltersJson = JSON.stringify(tableData.exactFilters)

    autoCrud
      .post(`${endPoint.value}/load-items`, {
        page: tableData.page,
        itemsPerPage: tableData.itemsPerPage,
        sortBy: sortByJson,
        search: searchJson,
        exactFilters: exactFiltersJson,
        deleted: tableData.deleted,
      })
      .then((response) => {
        const responseData = response.data.tableData ? response.data : {
          tableData: response.data,
          model: response.meta?.schema,
        }

        tableData.items = responseData.tableData.items
        tableData.itemsLength = responseData.tableData.itemsLength
        // Actualizar modelo completo si viene en la respuesta
        if (responseData.model) {
          dynamicModel.value = responseData.model
          // Actualizar headers desde el modelo
          if (responseData.model.tableHeaders) {
            itemHeaders.value = responseData.model.tableHeaders
            // Actualizar selectedHeaders para incluir nuevos headers
            const currentKeys = selectedHeaders.value
            const newKeys = responseData.model.tableHeaders.map((h) => h.key)
            selectedHeaders.value = newKeys.filter(
              (k) => currentKeys.includes(k) || !currentKeys.length
            )
            // Si no hay ninguno seleccionado, seleccionar todos
            if (selectedHeaders.value.length === 0) {
              selectedHeaders.value = newKeys
            }
          }
        }
        loading.value = false
      })
  }

  const resetTable = () => {
    tableData.page = 1
    tableData.itemsPerPage = 10
    tableData.sortBy = []
    tableData.search = {}
    // exactFilters no se resetea - son filtros fijos (ej: FK en hasMany)
    tableData.itemsLength = 0
    tableData.deleted = false
    tableData.items = []

    loadItems()
  }

  watch(
    () => tableData.deleted,
    () => {
      loadItems()
    }
  )

  return {
    tableData,
    tableHeaders,
    selectedHeaders,
    allHeaders,
    itemHeaders,
    dynamicModel,
    endPoint,
    loading,
    updateItems,
    itemsPerPageOptions,
    toggleAllHeaders,
    loadItems,
    resetTable,
  }
}
