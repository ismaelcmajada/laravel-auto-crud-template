<script setup>
import { ref, watch } from "vue"
import debounce from "lodash.debounce"
import { generateItemTitle } from "../../Utils/LaravelAutoCrud/autocompleteUtils"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps([
  "modelValue",
  "itemTitle",
  "label",
  "rules",
  "endPoint",
  "hideDetails",
  "customFilter",
  "density",
  "itemProps",
  "customFilters",
  "item",
  "items",
  "filteredItems",
  "formData",
  "context",
])
const emit = defineEmits(["update:modelValue"])

const loading = ref(false)
const items = ref([])

const selectedItem = ref(props.item)

watch(
  () => props.item,
  (newItem) => {
    if (newItem && newItem.id !== selectedItem.value?.id) {
      selectedItem.value = newItem
      // Inyectar el item en la lista para que el autocomplete lo muestrea
      if (!items.value.some((i) => i.id === newItem.id)) {
        items.value = [newItem, ...items.value]
      }
    }
  },
)

watch(selectedItem, (value) => {
  emit("update:modelValue", value?.id)
})

let requestGeneration = 0

const loadAutocompleteItems = (search) => {
  loading.value = true
  debounceLoadAutocompleteItems(search)
}

const debounceLoadAutocompleteItems = debounce((search) => {
  if (!search) {
    requestGeneration++
    items.value = []
    loading.value = false
    return
  }

  const generation = ++requestGeneration

  const payload = {
    search: search,
    key: props.itemTitle,
  }

  if (props.context) {
    payload.context = props.context
  }

  autoCrud
    .post(`${props.endPoint}/load-autocomplete-items`, payload)
    .then((response) => {
      if (generation !== requestGeneration) return

      items.value = response.data.autocompleteItems ?? response.data

      if (props.items && props.items.length > 0) {
        items.value = items.value?.filter((item) =>
          props.items.some((relatedItem) => relatedItem.id === item.id),
        )
      }

      if (props.filteredItems) {
        items.value = props.filteredItems(items.value, props.formData)
      }

      loading.value = false
    })
    .catch((error) => {
      if (generation !== requestGeneration) return
      console.error("AutocompleteServer error:", error)
      loading.value = false
    })
}, 500)
</script>

<template>
  <v-autocomplete
    clearable
    :item-title="generateItemTitle(props.itemTitle)"
    :label="props.label"
    v-model="selectedItem"
    :loading="loading"
    @update:search="loadAutocompleteItems"
    return-object
    :rules="props.rules"
    :items="items"
    :item-props="props.itemProps"
    :custom-filter="props.customFilter"
    :hide-details="props.hideDetails"
    :density="props.density"
  >
    <template v-if="$slots.append" v-slot:append>
      <slot name="append"></slot>
    </template>
    <template v-if="$slots.prepend" v-slot:prepend>
      <slot name="prepend"></slot>
    </template>
  </v-autocomplete>
</template>
