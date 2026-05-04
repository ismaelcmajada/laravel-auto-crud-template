<script setup>
import AutoFormDialog from "./AutoFormDialog.vue"
import AutoForm from "./AutoForm.vue"
import DestroyDialog from "./DestroyDialog.vue"
import RestoreDialog from "./RestoreDialog.vue"
import DestroyPermanentDialog from "./DestroyPermanentDialog.vue"
import LoadingOverlay from "./LoadingOverlay.vue"
import ExpandableText from "./ExpandableText.vue"
import useTableServer from "../../Composables/LaravelAutoCrud/useTableServer"
import useDialogs from "../../Composables/LaravelAutoCrud/useDialogs"
import HistoryDialog from "./HistoryDialog.vue"
import ImageDialog from "./ImageDialog.vue"
import CustomFieldsManager from "./CustomFieldsManager.vue"
import { usePage } from "@inertiajs/vue3"
import { useDisplay } from "vuetify"
import { computed, watch, ref, onMounted } from "vue"
import { generateItemTitle } from "../../Utils/LaravelAutoCrud/datatableUtils"

const page = usePage()

const { mobile } = useDisplay()

const props = defineProps([
  "title",
  "model",
  "customFilters",
  "filteredItems",
  "search",
  "exactFilters",
  "orderBy",
  "customItemProps",
  "itemsPerPage",
  "itemsPerPageOptions",
  "customHeaders",
  "hideReset",
  "listMode",
  "rowProps",
  "hiddenColumns",
])

const emit = defineEmits([
  "closeDialog",
  "openDialog",
  "formChange",
  "update:item",
])

const model = computed(() => {
  return props.model
})

// Modelo dinámico actualizado desde el servidor (incluye formFields y tableHeaders)
const dynamicModel = computed(() => {
  // Si no hay modelo del servidor, usar el de props
  if (!serverModel.value) {
    return props.model
  }

  // Si estamos en listMode, necesitamos preservar las modificaciones de formFields
  // del props.model (como hidden y default del FK en relaciones hasMany)
  if (props.listMode && props.model?.formFields) {
    // Crear un mapa de las modificaciones del props.model
    const propsFieldsMap = {}
    props.model.formFields.forEach((field) => {
      if (field.hidden || field.default !== undefined) {
        propsFieldsMap[field.field] = {
          hidden: field.hidden,
          default: field.default,
        }
      }
    })

    // Fusionar las modificaciones en los formFields del servidor
    const mergedFormFields = serverModel.value.formFields.map((field) => {
      if (propsFieldsMap[field.field]) {
        return {
          ...field,
          ...propsFieldsMap[field.field],
        }
      }
      return field
    })

    // Filtrar tableHeaders igual que en props.model
    const propsHeaderKeys = props.model.tableHeaders.map((h) => h.key)
    const mergedTableHeaders = serverModel.value.tableHeaders.filter((h) =>
      propsHeaderKeys.includes(h.key),
    )

    return {
      ...serverModel.value,
      formFields: mergedFormFields,
      tableHeaders:
        mergedTableHeaders.length > 0
          ? mergedTableHeaders
          : serverModel.value.tableHeaders,
    }
  }

  return serverModel.value
})

const forbiddenActions =
  model.value.forbiddenActions[page.props.auth.user.role] ?? []

// Mapa de externalRelations por su key (relation name) para renderizar en tabla
const externalRelationsMap = computed(() => {
  const map = {}
  if (model.value.externalRelations) {
    model.value.externalRelations.forEach((rel) => {
      if (rel.table) {
        map[rel.relation] = rel
      }
    })
  }
  return map
})

const {
  endPoint,
  loading,
  itemsPerPageOptions,
  updateItems,
  tableData,
  loadItems,
  resetTable,
  itemHeaders,
  dynamicModel: serverModel,
} = useTableServer()

const finalHeaders = computed(() => {
  // Usar itemHeaders del composable si tiene datos, sino usar los del modelo
  let originalHeaders =
    itemHeaders.value.length > 0
      ? [...itemHeaders.value]
      : [...model.value.tableHeaders]

  // Filtrar columnas ocultas por hiddenColumns prop
  if (Array.isArray(props.hiddenColumns) && props.hiddenColumns.length > 0) {
    originalHeaders = originalHeaders.filter(
      (h) => !props.hiddenColumns.includes(h.key),
    )
  }

  // En listMode, filtrar columnas que fueron excluidas en props.model.tableHeaders
  // (por ejemplo, el FK en relaciones hasMany)
  if (props.listMode && props.model?.tableHeaders) {
    const allowedKeys = props.model.tableHeaders.map((h) => h.key)
    originalHeaders = originalHeaders.filter((h) => allowedKeys.includes(h.key))
  }

  // Asegurar que customHeaders es array
  const extraHeaders = Array.isArray(props.customHeaders)
    ? props.customHeaders
    : []

  // If no custom headers, return original headers
  if (extraHeaders.length === 0) {
    return originalHeaders
  }

  // Sort custom headers into groups: those with specific positions and those without
  const headersWithPosition = extraHeaders.filter(
    (h) => h.position || h.before || h.after,
  )
  const headersWithoutPosition = extraHeaders.filter(
    (h) => !h.position && !h.before && !h.after,
  )

  // Start with the original headers
  let result = [...originalHeaders]

  // Process headers with specific position settings
  headersWithPosition.forEach((header) => {
    // Create a copy of the header without position metadata for actual insertion
    const cleanHeader = { ...header }
    delete cleanHeader.position
    delete cleanHeader.before
    delete cleanHeader.after

    if (header.before) {
      // Insert before specified column
      const targetIndex = result.findIndex((h) => h.key === header.before)
      if (targetIndex !== -1) {
        result = [
          ...result.slice(0, targetIndex),
          cleanHeader,
          ...result.slice(targetIndex),
        ]
      } else {
        // If target not found, append to end
        result.push(cleanHeader)
      }
    } else if (header.after) {
      // Insert after specified column
      const targetIndex = result.findIndex((h) => h.key === header.after)
      if (targetIndex !== -1) {
        result = [
          ...result.slice(0, targetIndex + 1),
          cleanHeader,
          ...result.slice(targetIndex + 1),
        ]
      } else {
        // If target not found, append to end
        result.push(cleanHeader)
      }
    } else if (header.position === "start") {
      // Insert at beginning
      result = [cleanHeader, ...result]
    } else if (header.position === "end") {
      // Insert at end
      result.push(cleanHeader)
    } else {
      // Default: append to end
      result.push(cleanHeader)
    }
  })

  // Handle headers without specific positions - insert before actions by default
  if (headersWithoutPosition.length > 0) {
    // Insert before actions column
    const actionsIndex = result.findIndex((h) => h.key === "actions")

    if (actionsIndex === -1) {
      // If no actions column, add at the end
      result = [...result, ...headersWithoutPosition]
    } else {
      // Insert before actions column
      result = [
        ...result.slice(0, actionsIndex),
        ...headersWithoutPosition,
        ...result.slice(actionsIndex),
      ]
    }
  }

  return result
})

tableData.search = props.search ?? {}
tableData.exactFilters = props.exactFilters ?? {}
tableData.sortBy = props.orderBy ?? []

watch(
  props,
  () => {
    tableData.search = props.search ?? {}
    tableData.exactFilters = props.exactFilters ?? {}
    tableData.sortBy = props.orderBy ?? []
    loadItems()
  },
  { deep: true },
)

const {
  showFormDialog,
  formDialogType,
  showDestroyDialog,
  showRestoreDialog,
  showDestroyPermanentDialog,
  item,
  openDialog,
} = useDialogs()

const title = props.title
endPoint.value = model.value.endPoint

watch(showFormDialog, (value) => {
  if (!value) {
    loadItems()
    emit("closeDialog")
  } else {
    emit("openDialog")
  }
})

function getValueByNestedKey(obj, key) {
  return key.split(".").reduce((currentObject, keyPart) => {
    return currentObject ? currentObject[keyPart] : undefined
  }, obj)
}

// Helpers para archivos
const isJsonArray = (value) => {
  if (!value || typeof value !== "string") return false
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
  } catch {
    return false
  }
}

const parseJsonArray = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

const getFileName = (filePath) => {
  if (!filePath) return ""
  return filePath.split("/").pop()
}

const showHistoryDialog = ref(false)

const openHistoryDialog = (historyItem) => {
  item.value = historyItem
  showHistoryDialog.value = true
}

// Custom Fields Dialog
const showCustomFieldsDialog = ref(false)

const modelName = computed(() => {
  // Extraer nombre del modelo desde el endpoint: /laravel-auto-crud/product -> product
  const endpoint = model.value.endPoint || ""
  return endpoint.replace("/laravel-auto-crud/", "")
})

const customFieldsEnabled = computed(() => {
  return model.value.customFieldsEnabled === true
})

const onCustomFieldsUpdated = () => {
  // Recargar los items y headers de la tabla (el diálogo de lista permanece abierto)
  loadItems()
}

// Image carousel index per item (keyed by `${itemId}_${headerKey}`)
const imageCarouselIndex = ref({})

const getClampedIndex = (key, arrayLength) => {
  const idx = imageCarouselIndex.value[key] || 0
  return Math.min(idx, Math.max(arrayLength - 1, 0))
}

// Image dialog
const showImageDialog = ref(false)
const currentImageUrl = ref("")
const currentImageAlt = ref("")

const openImageDialog = (imageUrl, altText = "") => {
  currentImageUrl.value = imageUrl
  currentImageAlt.value = altText
  showImageDialog.value = true
}

const closeImageDialog = () => {
  showImageDialog.value = false
}

// Opciones para filtro booleano tri-estado
const booleanFilterOptions = [
  { title: "Todos", value: null },
  { title: "Sí", value: "true" },
  { title: "No", value: "false" },
]

// Helper para verificar si un header es booleano
const isBooleanHeader = (header) => {
  return header.type === "boolean"
}

if (props.itemsPerPageOptions)
  itemsPerPageOptions.value = props.itemsPerPageOptions

if (props.itemsPerPage) tableData.itemsPerPage = props.itemsPerPage

onMounted(() => {
  if (props.listMode) {
    loadItems()
  }
})

watch(item, (value) => {
  emit("update:item", value)
})
</script>

<template>
  <slot
    name="auto-form-dialog"
    :show="showFormDialog"
    :type="formDialogType"
    :item="item"
    :filteredItems="props.filteredItems"
    :customFilters="props.customFilters"
    :customItemProps="props.customItemProps"
    :model="dynamicModel"
  >
    <auto-form-dialog
      v-model:show="showFormDialog"
      v-model:type="formDialogType"
      v-model:item="item"
      :filteredItems="props.filteredItems"
      :customFilters="props.customFilters"
      :customItemProps="props.customItemProps"
      :model="dynamicModel"
      @formChange="emit('formChange', $event)"
    >
      <template
        #header-actions="{
          item: dialogItem,
          type: dialogType,
          model: dialogModel,
        }"
      >
        <slot
          name="auto-form-dialog.header-actions"
          :item="dialogItem"
          :type="dialogType"
          :model="dialogModel"
        ></slot>
      </template>
      <template #prepend>
        <slot
          name="auto-form-dialog.prepend"
          :model="dynamicModel"
          :type="formDialogType"
          :item="item"
          :show="showFormDialog"
        ></slot>
      </template>
      <template #auto-form="{ handleIsFormDirty }">
        <slot
          name="auto-form-dialog.auto-form"
          :model="dynamicModel"
          :type="formDialogType"
          :item="item"
        >
          <auto-form
            :model="dynamicModel"
            v-model:type="formDialogType"
            v-model:item="item"
            :customFilters="props.customFilters"
            :filteredItems="props.filteredItems"
            :customItemProps="props.customItemProps"
            @formChange="emit('formChange', $event)"
            @isDirty="handleIsFormDirty($event)"
            @close="showFormDialog = false"
          >
            <template #prepend="slotProps">
              <slot
                name="auto-form-dialog.auto-form.prepend"
                v-bind="slotProps"
              >
              </slot>
            </template>

            <template
              v-for="field in model.formFields"
              :key="field.field"
              #[`field.${field.field}`]="fieldSlotProps"
            >
              <!--
                Reexponemos un slot llamado:
                "auto-form-dialog.auto-form.field.nombreCampo"

                Si el padre lo define, se inyectará aquí.
                De lo contrario, AutoForm.vue mostrará su fallback.
              -->
              <slot
                :name="`auto-form-dialog.auto-form.field.${field.field}`"
                v-bind="fieldSlotProps"
              >
                <!-- No ponemos fallback aquí, porque el fallback
                     está en <AutoForm> mismo, en su <slot :name="field.xxx"> -->
              </slot>
            </template>

            <template #append="slotProps">
              <slot name="auto-form-dialog.auto-form.append" v-bind="slotProps">
              </slot>
            </template>

            <template #after-save="slotProps">
              <slot
                name="auto-form-dialog.auto-form.after-save"
                v-bind="slotProps"
              >
              </slot>
            </template>

            <template
              v-for="relation in model.externalRelations"
              :key="relation.relation"
              v-slot:[`auto-external-relation.${relation.relation}.actions`]="{
                item,
              }"
            >
              <slot
                :name="`auto-external-relation.${relation.relation}.actions`"
                :item="item"
              ></slot>
            </template>
          </auto-form>
        </slot>
      </template>
      <template #append>
        <slot
          name="auto-form-dialog.append"
          :model="dynamicModel"
          :type="formDialogType"
          :item="item"
          :show="showFormDialog"
        ></slot>
      </template>
    </auto-form-dialog>
  </slot>

  <history-dialog
    :show="showHistoryDialog"
    :item="item"
    @close-dialog="showHistoryDialog = false"
  />

  <image-dialog
    :show="showImageDialog"
    :image-url="currentImageUrl"
    :alt-text="currentImageAlt"
    @close-dialog="closeImageDialog"
  />

  <!-- Custom Fields Manager Dialog -->
  <v-dialog v-model="showCustomFieldsDialog" max-width="600" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Gestionar Campos Personalizados</span>
        <v-spacer></v-spacer>
        <v-btn icon variant="text" @click="showCustomFieldsDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <custom-fields-manager
          v-if="showCustomFieldsDialog"
          :model-name="modelName"
          @updated="onCustomFieldsUpdated"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <destroy-dialog
    :show="showDestroyDialog"
    @closeDialog="showDestroyDialog = false"
    @reloadItems="loadItems()"
    :item="item"
    :endPoint="endPoint"
  />

  <restore-dialog
    :show="showRestoreDialog"
    @closeDialog="showRestoreDialog = false"
    @reloadItems="loadItems()"
    :item="item"
    :endPoint="endPoint"
  />

  <destroy-permanent-dialog
    :show="showDestroyPermanentDialog"
    @closeDialog="showDestroyPermanentDialog = false"
    @reloadItems="loadItems()"
    :item="item"
    :endPoint="endPoint"
  />

  <!-- MODO LISTA -->
  <v-card v-if="props.listMode" elevation="0" class="pa-0 ma-0" variant="flat">
    <!-- Header del modo lista (estilo similar a AutoExternalRelation) -->
    <v-row
      class="align-center justify-center my-2 mx-1 rounded pa-2"
      :class="{ 'bg-red-lighten-4': tableData.deleted }"
    >
      <v-col class="py-0">
        <span class="text-subtitle-1 font-weight-medium">{{ title }}</span>
      </v-col>
      <v-col class="text-end py-0">
        <slot
          name="table.actions.prepend"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
        ></slot>
        <slot
          name="table.actions"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
        >
          <v-btn
            v-if="!tableData.deleted && !hideReset"
            icon
            density="compact"
            variant="text"
            @click="resetTable(props.search, props.orderBy)"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent">Recargar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              !tableData.deleted && forbiddenActions.indexOf('store') === -1
            "
            icon
            density="compact"
            variant="text"
            @click="openDialog('create')"
          >
            <v-icon>mdi-plus</v-icon>
            <v-tooltip activator="parent">Crear</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              forbiddenActions.indexOf('restore') === -1 ||
              forbiddenActions.indexOf('destroyPermanent') === -1
            "
            :active="tableData.deleted"
            icon
            density="compact"
            variant="text"
            @click="tableData.deleted = !tableData.deleted"
          >
            <v-icon>mdi-delete-variant</v-icon>
            <v-tooltip activator="parent">{{
              tableData.deleted ? "Ver activos" : "Ver eliminados"
            }}</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              customFieldsEnabled &&
              forbiddenActions.indexOf('manageCustomFields') === -1
            "
            icon
            density="compact"
            variant="text"
            @click="showCustomFieldsDialog = true"
          >
            <v-icon>mdi-form-textbox</v-icon>
            <v-tooltip activator="parent">Campos personalizados</v-tooltip>
          </v-btn>
        </slot>
        <slot
          name="table.actions.append"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
        ></slot>
      </v-col>
    </v-row>

    <!-- Header de búsqueda por columna -->
    <v-row class="align-center my-2 mx-1 rounded pa-2">
      <v-col
        v-for="header in finalHeaders.filter(
          (h) => h.key !== 'actions' && h.searchable !== false,
        )"
        :key="header.key"
      >
        <!-- Filtro booleano tri-estado -->
        <v-select
          v-if="isBooleanHeader(header)"
          v-model="tableData.search[header.key]"
          @update:model-value="loadItems"
          :items="booleanFilterOptions"
          :label="header.title"
          variant="underlined"
          density="compact"
          hide-details
          clearable
        ></v-select>
        <!-- Filtro texto normal -->
        <v-text-field
          v-else
          v-model="tableData.search[header.key]"
          @input="updateItems"
          :label="header.title"
          type="text"
          variant="underlined"
          density="compact"
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="auto"></v-col>
    </v-row>

    <!-- Items en modo lista -->
    <template v-for="listItem in tableData.items" :key="listItem.id">
      <v-row
        class="align-center justify-center my-2 mx-1 elevation-6 rounded pa-2"
        :class="{ 'bg-red-lighten-4': tableData.deleted }"
      >
        <!-- Columnas de datos -->
        <v-col
          v-for="header in finalHeaders.filter((h) => h.key !== 'actions')"
          :key="header.key"
        >
          <slot :name="`item.${header.key}`" :item="listItem">
            <div class="text-caption text-grey">{{ header.title }}</div>
            <div>
              <!-- Si header tiene relation y tableKey (belongsTo) -->
              <template v-if="header.relation && header.relation.tableKey">
                {{
                  generateItemTitle(
                    header.relation.tableKey,
                    listItem[header.relation.relation],
                  )
                }}
              </template>
              <!-- Si es una externalRelation -->
              <template v-else-if="externalRelationsMap[header.key]">
                <v-chip
                  v-for="relItem in listItem[header.key]?.slice(0, 3)"
                  :key="relItem.id"
                  size="small"
                  class="mr-1"
                >
                  {{
                    generateItemTitle(
                      externalRelationsMap[header.key].tableKey,
                      relItem,
                    )
                  }}
                </v-chip>
                <v-chip
                  v-if="listItem[header.key]?.length > 3"
                  size="small"
                  color="grey"
                >
                  +{{ listItem[header.key].length - 3 }}
                </v-chip>
              </template>
              <!-- Si el header tiene type image -->
              <template
                v-else-if="header.type === 'image' && listItem[header.key]"
              >
                <!-- Múltiples imágenes (JSON array) -->
                <template v-if="isJsonArray(listItem[header.key])">
                  <div class="d-flex align-center justify-center">
                    <v-btn
                      v-if="parseJsonArray(listItem[header.key]).length > 1"
                      icon
                      size="x-small"
                      variant="text"
                      @click.stop="
                        imageCarouselIndex[`${listItem.id}_${header.key}`] =
                          getClampedIndex(
                            `${listItem.id}_${header.key}`,
                            parseJsonArray(listItem[header.key]).length,
                          ) - 1
                      "
                      :disabled="
                        getClampedIndex(
                          `${listItem.id}_${header.key}`,
                          parseJsonArray(listItem[header.key]).length,
                        ) <= 0
                      "
                    >
                      <v-icon size="small">mdi-chevron-left</v-icon>
                    </v-btn>
                    <v-avatar size="50" class="mx-1 rounded">
                      <v-img
                        :src="`/laravel-auto-crud/${
                          parseJsonArray(listItem[header.key])[
                            getClampedIndex(
                              `${listItem.id}_${header.key}`,
                              parseJsonArray(listItem[header.key]).length,
                            )
                          ]
                        }`"
                        cover
                        @click.stop="
                          openImageDialog(
                            `/laravel-auto-crud/${
                              parseJsonArray(listItem[header.key])[
                                getClampedIndex(
                                  `${listItem.id}_${header.key}`,
                                  parseJsonArray(listItem[header.key]).length,
                                )
                              ]
                            }`,
                            parseJsonArray(listItem[header.key])[
                              getClampedIndex(
                                `${listItem.id}_${header.key}`,
                                parseJsonArray(listItem[header.key]).length,
                              )
                            ],
                          )
                        "
                        class="cursor-pointer"
                      ></v-img>
                    </v-avatar>
                    <v-btn
                      v-if="parseJsonArray(listItem[header.key]).length > 1"
                      icon
                      size="x-small"
                      variant="text"
                      @click.stop="
                        imageCarouselIndex[`${listItem.id}_${header.key}`] =
                          getClampedIndex(
                            `${listItem.id}_${header.key}`,
                            parseJsonArray(listItem[header.key]).length,
                          ) + 1
                      "
                      :disabled="
                        getClampedIndex(
                          `${listItem.id}_${header.key}`,
                          parseJsonArray(listItem[header.key]).length,
                        ) >=
                        parseJsonArray(listItem[header.key]).length - 1
                      "
                    >
                      <v-icon size="small">mdi-chevron-right</v-icon>
                    </v-btn>
                  </div>
                </template>
                <!-- Imagen única -->
                <template v-else>
                  <v-avatar size="40">
                    <v-img
                      :src="`/laravel-auto-crud/${listItem[header.key]}`"
                      @click.stop="
                        openImageDialog(
                          `/laravel-auto-crud/${listItem[header.key]}`,
                          listItem[header.key],
                        )
                      "
                      class="cursor-pointer"
                    ></v-img>
                  </v-avatar>
                </template>
              </template>
              <!-- Si el header tiene type file -->
              <template
                v-else-if="header.type === 'file' && listItem[header.key]"
              >
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  :href="`/laravel-auto-crud/${listItem[header.key]}`"
                  target="_blank"
                >
                  <v-icon>mdi-download</v-icon>
                </v-btn>
              </template>
              <!-- Si el header tiene type boolean -->
              <template v-else-if="header.type === 'boolean'">
                <v-icon
                  :color="listItem[header.key] ? 'success' : 'grey-lighten-1'"
                >
                  {{
                    listItem[header.key]
                      ? "mdi-check-circle"
                      : "mdi-close-circle"
                  }}
                </v-icon>
              </template>
              <!-- Si el header tiene type text, usar ExpandableText -->
              <template v-else-if="header.type === 'text'">
                <expandable-text
                  :text="getValueByNestedKey(listItem, header.key)"
                  :length="header.truncateLength || 10"
                />
              </template>
              <!-- Valor normal -->
              <template v-else>
                {{ getValueByNestedKey(listItem, header.key) }}
              </template>
            </div>
          </slot>
        </v-col>
        <!-- Acciones -->
        <v-col class="text-end">
          <slot
            name="item.actions.prepend"
            :item="listItem"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
            :forbiddenActions="forbiddenActions"
          ></slot>
          <slot
            name="item.actions"
            :item="listItem"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
            :forbiddenActions="forbiddenActions"
          >
            <v-btn
              v-if="
                listItem.records?.length > 0 &&
                forbiddenActions.indexOf('showRecords') === -1
              "
              icon
              density="compact"
              variant="text"
              @click="openHistoryDialog(listItem)"
            >
              <v-icon>mdi-history</v-icon>
              <v-tooltip activator="parent">Historial</v-tooltip>
            </v-btn>
            <v-btn
              v-if="
                !tableData.deleted && forbiddenActions.indexOf('update') === -1
              "
              icon
              density="compact"
              variant="text"
              @click="openDialog('edit', listItem)"
            >
              <v-icon>mdi-pencil</v-icon>
              <v-tooltip activator="parent">Editar</v-tooltip>
            </v-btn>
            <v-btn
              v-if="
                !tableData.deleted && forbiddenActions.indexOf('destroy') === -1
              "
              icon
              density="compact"
              variant="text"
              @click="openDialog('destroy', listItem)"
            >
              <v-icon>mdi-delete</v-icon>
              <v-tooltip activator="parent">Eliminar</v-tooltip>
            </v-btn>
            <v-btn
              v-if="
                tableData.deleted && forbiddenActions.indexOf('restore') === -1
              "
              icon
              density="compact"
              variant="text"
              @click="openDialog('restore', listItem)"
            >
              <v-icon>mdi-restore</v-icon>
              <v-tooltip activator="parent">Restaurar</v-tooltip>
            </v-btn>
            <v-btn
              v-if="
                tableData.deleted &&
                forbiddenActions.indexOf('destroyPermanent') === -1
              "
              icon
              density="compact"
              variant="text"
              @click="openDialog('destroyPermanent', listItem)"
            >
              <v-icon>mdi-delete-alert</v-icon>
              <v-tooltip activator="parent">Eliminar permanente</v-tooltip>
            </v-btn>
          </slot>
          <slot
            name="item.actions.append"
            :item="listItem"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
            :forbiddenActions="forbiddenActions"
          ></slot>
        </v-col>
      </v-row>
    </template>

    <!-- Paginación modo lista -->
    <v-pagination
      v-if="tableData.itemsLength > tableData.itemsPerPage"
      v-model="tableData.page"
      :length="Math.ceil(tableData.itemsLength / tableData.itemsPerPage)"
      density="compact"
      size="small"
      class="my-2"
      @update:modelValue="loadItems()"
    ></v-pagination>

    <loading-overlay v-if="loading" />
  </v-card>

  <!-- MODO TABLA (original) -->
  <v-card v-else elevation="6" class="ma-5" variant="outlined">
    <v-data-table-server
      multi-sort
      :loading="loading"
      :headers="finalHeaders"
      :items="tableData.items"
      :items-length="tableData.itemsLength"
      :items-per-page-options="itemsPerPageOptions"
      v-model:page="tableData.page"
      v-model:sort-by="tableData.sortBy"
      v-model:items-per-page="tableData.itemsPerPage"
      @update:options="loadItems()"
      :row-props="props.rowProps"
    >
      <template v-slot:top>
        <v-toolbar :class="{ 'bg-red-lighten-2': tableData.deleted }" flat>
          <v-toolbar-title>
            <span>{{ title }}</span>
          </v-toolbar-title>
          <v-divider class="mx-4" inset vertical></v-divider>
          <slot
            name="table.actions.prepend"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
          ></slot>
          <slot
            name="table.actions"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
          >
            <template v-if="!tableData.deleted && !hideReset">
              <v-btn icon @click="resetTable(props.search, props.orderBy)">
                <v-icon>mdi-refresh</v-icon>
                <v-tooltip activator="parent">Recargar tabla</v-tooltip>
              </v-btn>
            </template>
            <template v-if="!tableData.deleted">
              <v-btn
                v-if="forbiddenActions.indexOf('store') === -1"
                icon
                @click="openDialog('create')"
              >
                <v-icon>mdi-file-plus-outline</v-icon>
                <v-tooltip activator="parent">Crear elemento</v-tooltip>
              </v-btn>
            </template>

            <v-btn
              v-if="
                forbiddenActions.indexOf('restore') === -1 ||
                forbiddenActions.indexOf('destroyPermanent') === -1
              "
              :active="tableData.deleted"
              icon
              @click="tableData.deleted = !tableData.deleted"
            >
              <v-icon>mdi-delete-variant</v-icon>
              <v-tooltip activator="parent">{{
                tableData.deleted ? "Ver activos" : "Ver eliminados"
              }}</v-tooltip>
            </v-btn>

            <v-btn
              v-if="
                customFieldsEnabled &&
                forbiddenActions.indexOf('manageCustomFields') === -1
              "
              icon
              @click="showCustomFieldsDialog = true"
            >
              <v-icon>mdi-form-textbox</v-icon>
              <v-tooltip activator="parent">Campos personalizados</v-tooltip>
            </v-btn>
          </slot>
          <slot
            name="table.actions.append"
            :openDialog="openDialog"
            :resetTable="resetTable"
            :tableData="tableData"
            :loadItems="loadItems"
          ></slot>
        </v-toolbar>
      </template>

      <template v-slot:thead>
        <tr>
          <td
            v-for="header in finalHeaders.filter(
              (header) => header.key != 'actions',
            )"
            :key="header.key"
          >
            <template v-if="header.searchable !== false">
              <!-- Filtro booleano tri-estado -->
              <v-select
                v-if="isBooleanHeader(header)"
                v-model="tableData.search[header.key]"
                @update:model-value="loadItems"
                :items="booleanFilterOptions"
                class="px-1"
                variant="underlined"
              ></v-select>
              <!-- Filtro texto normal -->
              <v-text-field
                v-else-if="header.key"
                v-model="tableData.search[header.key]"
                @input="updateItems"
                type="text"
                class="px-1"
                variant="underlined"
              ></v-text-field>
            </template>
          </td>
        </tr>
      </template>

      <template
        v-slot:[`item.${header.key}`]="{ item }"
        v-for="header in finalHeaders.filter(
          (header) => header.key !== 'actions',
        )"
      >
        <slot :name="`item.${header.key}`" :item="item">
          <span>
            <!-- Si header tiene relation y tableKey (belongsTo) -->
            <template v-if="header.relation && header.relation.tableKey">
              {{
                generateItemTitle(
                  header.relation.tableKey,
                  item[header.relation.relation],
                )
              }}
            </template>

            <!-- Si es una externalRelation (belongsToMany/hasMany con table:true) -->
            <template v-else-if="externalRelationsMap[header.key]">
              <v-chip
                v-for="relItem in item[header.key]?.slice(0, 5)"
                :key="relItem.id"
                size="small"
                class="ma-1"
              >
                {{
                  generateItemTitle(
                    externalRelationsMap[header.key].tableKey,
                    relItem,
                  )
                }}
              </v-chip>
              <v-chip
                v-if="item[header.key]?.length > 5"
                size="small"
                class="ma-1"
                color="grey"
              >
                +{{ item[header.key].length - 5 }}
              </v-chip>
            </template>

            <!-- Si el header tiene type image -->
            <template v-else-if="header.type === 'image' && item[header.key]">
              <!-- Múltiples imágenes (JSON array) -->
              <template v-if="isJsonArray(item[header.key])">
                <div class="d-flex align-center justify-center">
                  <v-btn
                    v-if="parseJsonArray(item[header.key]).length > 1"
                    icon
                    size="x-small"
                    variant="text"
                    @click.stop="
                      imageCarouselIndex[`${item.id}_${header.key}`] =
                        getClampedIndex(
                          `${item.id}_${header.key}`,
                          parseJsonArray(item[header.key]).length,
                        ) - 1
                    "
                    :disabled="
                      getClampedIndex(
                        `${item.id}_${header.key}`,
                        parseJsonArray(item[header.key]).length,
                      ) <= 0
                    "
                  >
                    <v-icon size="small">mdi-chevron-left</v-icon>
                  </v-btn>
                  <v-avatar size="60" class="mx-1 rounded">
                    <v-img
                      :src="`/laravel-auto-crud/${
                        parseJsonArray(item[header.key])[
                          getClampedIndex(
                            `${item.id}_${header.key}`,
                            parseJsonArray(item[header.key]).length,
                          )
                        ]
                      }`"
                      cover
                      @click.stop="
                        openImageDialog(
                          `/laravel-auto-crud/${
                            parseJsonArray(item[header.key])[
                              getClampedIndex(
                                `${item.id}_${header.key}`,
                                parseJsonArray(item[header.key]).length,
                              )
                            ]
                          }`,
                          parseJsonArray(item[header.key])[
                            getClampedIndex(
                              `${item.id}_${header.key}`,
                              parseJsonArray(item[header.key]).length,
                            )
                          ],
                        )
                      "
                      class="cursor-pointer"
                      :title="'Click para ampliar'"
                    ></v-img>
                  </v-avatar>
                  <v-btn
                    v-if="parseJsonArray(item[header.key]).length > 1"
                    icon
                    size="x-small"
                    variant="text"
                    @click.stop="
                      imageCarouselIndex[`${item.id}_${header.key}`] =
                        getClampedIndex(
                          `${item.id}_${header.key}`,
                          parseJsonArray(item[header.key]).length,
                        ) + 1
                    "
                    :disabled="
                      getClampedIndex(
                        `${item.id}_${header.key}`,
                        parseJsonArray(item[header.key]).length,
                      ) >=
                      parseJsonArray(item[header.key]).length - 1
                    "
                  >
                    <v-icon size="small">mdi-chevron-right</v-icon>
                  </v-btn>
                </div>
              </template>
              <!-- Imagen única -->
              <template v-else>
                <v-img
                  :src="`/laravel-auto-crud/${item[header.key]}`"
                  max-width="150"
                  max-height="150"
                  class="mx-auto cursor-pointer"
                  @click="
                    openImageDialog(
                      `/laravel-auto-crud/${item[header.key]}`,
                      item[header.key],
                    )
                  "
                  :title="'Click para ampliar'"
                ></v-img>
              </template>
            </template>

            <!-- Si el header tiene type file -->
            <template v-else-if="header.type === 'file' && item[header.key]">
              <!-- Múltiples archivos (JSON array) -->
              <template v-if="isJsonArray(item[header.key])">
                <v-btn
                  v-for="(filePath, idx) in parseJsonArray(item[header.key])"
                  :key="idx"
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  :href="`/laravel-auto-crud/${filePath}`"
                  target="_blank"
                  class="ma-1"
                >
                  <v-icon>mdi-download</v-icon>
                  <v-tooltip activator="parent">{{
                    getFileName(filePath)
                  }}</v-tooltip>
                </v-btn>
              </template>
              <!-- Archivo único -->
              <template v-else>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  :href="`/laravel-auto-crud/${item[header.key]}`"
                  target="_blank"
                >
                  <v-icon>mdi-download</v-icon>
                  <v-tooltip activator="parent">Descargar</v-tooltip>
                </v-btn>
              </template>
            </template>

            <!-- Si el header tiene type boolean -->
            <template v-else-if="header.type === 'boolean'">
              <v-icon :color="item[header.key] ? 'success' : 'grey-lighten-1'">
                {{ item[header.key] ? "mdi-check-circle" : "mdi-close-circle" }}
              </v-icon>
            </template>

            <!-- Si el header tiene type text, usar ExpandableText -->
            <template v-else-if="header.type === 'text'">
              <expandable-text
                :text="getValueByNestedKey(item, header.key)"
                :length="header.truncateLength || 10"
              />
            </template>

            <!-- Si no, usamos el valor normal -->
            <template v-else>
              {{ getValueByNestedKey(item, header.key) }}
            </template>
          </span>
        </slot>
      </template>

      <template v-slot:item.actions="{ item }">
        <slot
          name="item.actions.prepend"
          :item="item"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
          :forbiddenActions="forbiddenActions"
        ></slot>
        <slot
          name="item.actions"
          :item="item"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
          :forbiddenActions="forbiddenActions"
        >
          <v-btn
            v-if="
              item.records?.length > 0 &&
              forbiddenActions.indexOf('showRecords') === -1
            "
            density="compact"
            variant="text"
            icon
            @click="openHistoryDialog(item)"
          >
            <v-icon>mdi-history</v-icon>
            <v-tooltip activator="parent">Historial</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              !tableData.deleted && forbiddenActions.indexOf('update') === -1
            "
            density="compact"
            variant="text"
            icon
            @click="openDialog('edit', item)"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent">Editar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              !tableData.deleted && forbiddenActions.indexOf('destroy') === -1
            "
            density="compact"
            variant="text"
            icon
            @click="openDialog('destroy', item)"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent">Eliminar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              tableData.deleted && forbiddenActions.indexOf('restore') === -1
            "
            density="compact"
            variant="text"
            icon
            @click="openDialog('restore', item)"
          >
            <v-icon>mdi-restore</v-icon>
            <v-tooltip activator="parent">Restaurar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="
              tableData.deleted &&
              forbiddenActions.indexOf('destroyPermanent') === -1
            "
            density="compact"
            variant="text"
            icon
            @click="openDialog('destroyPermanent', item)"
          >
            <v-icon>mdi-delete-alert</v-icon>
            <v-tooltip activator="parent">Eliminar permanente</v-tooltip>
          </v-btn>
        </slot>
        <slot
          name="item.actions.append"
          :item="item"
          :openDialog="openDialog"
          :resetTable="resetTable"
          :tableData="tableData"
          :loadItems="loadItems"
          :forbiddenActions="forbiddenActions"
        ></slot>
      </template>
    </v-data-table-server>
    <loading-overlay v-if="loading" />
  </v-card>
</template>
