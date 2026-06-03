<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue"
import AutocompleteServer from "./AutocompleteServer.vue"
import { ruleRequired, getFieldRules } from "../../Utils/LaravelAutoCrud/rules"
import AutoFormDialog from "./AutoFormDialog.vue"
import AutoTable from "./AutoTable.vue"
import {
  generateItemTitle,
  searchByWords,
} from "../../Utils/LaravelAutoCrud/autocompleteUtils"
import { generateItemTitle as tableItemTitle } from "../../Utils/LaravelAutoCrud/datatableUtils"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps([
  "item",
  "endPoint",
  "externalRelation",
  "withTitle",
  "customFilters",
  "filteredItems",
  "customItemProps",
  "formData",
  "noFilterItems",
])

const emit = defineEmits([
  "bound",
  "unbound",
  "childCreated",
  "childUpdated",
  "childDeleted",
])

// ------------------------------------------------------------
// REFS & STATES
// ------------------------------------------------------------
const items = ref([])
const selectedItem = ref(null)
const pivotData = ref({})

// Manejo de formularios de añadir/editar
const addForm = ref(false)
const updateForm = ref(false)

// StoreShortcut en la relación principal
const storeExternalShortcutShow = ref(false)

// Manejo de edición en pivot
const pivotEditData = ref({})
const pivotEditing = ref(null)

// Aquí guardamos las listas para las relaciones que se van a usar en los pivotFields
const relations = ref({})

// Aquí guardamos los elementos individuales obtenidos para relaciones serverSide
const serverSideRelationItems = ref({})

// Aquí guardamos el estado de "show" para cada pivotField con storeShortcut
const storePivotShortcutShows = ref({})

// Aquí guardamos items creados via storeShortcut para relaciones serverSide en pivot
const storePivotShortcutCreatedItems = ref({})

// Item creado via storeShortcut para la relación principal serverSide
const storeExternalShortcutCreatedItem = ref(null)
const loadedModels = ref({})

// Clonamos `item` para manipularlo localmente
const item = ref(props.item)

const handleExternalStoreShortcutSuccess = async (flash) => {
  const createdItem = flash.data
  if (!createdItem) return

  if (props.externalRelation.pivotFields) {
    // Con pivotFields: recargar items y pre-seleccionar después para que el autocomplete lo muestre
    if (props.externalRelation.serverSide) {
      // Para serverSide: guardar el item creado para pasarlo al autocomplete-server
      storeExternalShortcutCreatedItem.value = createdItem
    } else {
      const response = await autoCrud.get(`${props.externalRelation.endPoint}/all`)
      items.value = response.data
      if (!props.noFilterItems) {
        items.value = items.value.filter((relatedItem) => {
          return !item.value[props.externalRelation.relation].some(
            (relatedItemFromItem) => relatedItem.id === relatedItemFromItem.id,
          )
        })
      }
      await nextTick()
    }
    selectedItem.value = createdItem.id
  } else {
    // Sin pivotFields: auto-vincular directamente (no necesita mostrar en autocomplete)
    selectedItem.value = createdItem.id
    await nextTick()
    addItem()
  }
}

const handlePivotStoreShortcutSuccess = (field, flash) => {
  const createdItem = flash.data
  if (!createdItem) return

  if (field.relation.serverSide) {
    // Para serverSide: guardar el item creado y asignar el id
    storePivotShortcutCreatedItems.value[field.field] = createdItem
    pivotData.value[field.field] = createdItem.id
  } else {
    // Para no-serverSide: recargar items y asignar el id después de que carguen
    autoCrud.get(`${field.relation.endPoint}/all`).then((response) => {
      relations.value[field.field] = response.data
      nextTick(() => {
        pivotData.value[field.field] = createdItem.id
      })
    })
  }
}

// ------------------------------------------------------------
// FUNCIONES
// ------------------------------------------------------------
const getRelations = () => {
  const relationsFromFormFields = props.externalRelation.pivotFields?.filter(
    (field) => field.relation && !field.relation.serverSide,
  )

  relationsFromFormFields?.forEach((field) => {
    autoCrud.get(`${field.relation.endPoint}/all`).then((response) => {
      relations.value[field.field] = response.data
    })
  })
}

const getRelationItem = async (field, itemId) => {
  if (!serverSideRelationItems.value[field.field]) {
    serverSideRelationItems.value[field.field] = {}
  }

  if (!serverSideRelationItems.value[field.field][itemId]) {
    try {
      const response = await autoCrud.get(`${field.relation.endPoint}/${itemId}`)
      serverSideRelationItems.value[field.field][itemId] = response.data
    } catch (error) {
      console.error(
        `Error fetching item ${itemId} from ${field.relation.endPoint}:`,
        error,
      )
      serverSideRelationItems.value[field.field][itemId] = null
    }
  }

  return serverSideRelationItems.value[field.field][itemId]
}

const getServerSideRelationItemTitle = (field, itemId) => {
  const item = serverSideRelationItems.value[field.field]?.[itemId]
  if (item) {
    return tableItemTitle(field.relation.formKey, item)
  }
  return "Cargando..."
}

const loadServerSideRelationItem = (field, itemId) => {
  if (!serverSideRelationItems.value[field.field]?.[itemId]) {
    getRelationItem(field, itemId)
  }
}

const loadAllServerSideRelationItems = () => {
  if (item.value && item.value[props.externalRelation.relation]) {
    const serverSideFields =
      props.externalRelation.pivotFields?.filter(
        (field) => field.relation && field.relation.serverSide,
      ) || []

    serverSideFields.forEach((field) => {
      item.value[props.externalRelation.relation].forEach((relationItem) => {
        const itemId = relationItem.pivot[field.field]
        if (itemId) {
          loadServerSideRelationItem(field, itemId)
        }
      })
    })
  }
}

const getItems = async () => {
  const response = await autoCrud.get(`${props.externalRelation.endPoint}/all`)
  items.value = response.data
  // Filtra los items que ya están vinculados en la relación
  if (!props.noFilterItems) {
    items.value = items.value.filter((relatedItem) => {
      return !item.value[props.externalRelation.relation].some(
        (relatedItemFromItem) => relatedItem.id === relatedItemFromItem.id,
      )
    })
  }
}

const addItem = () => {
  if (selectedItem.value) {
    autoCrud.mutate("post",
      `${props.endPoint}/${item.value.id}/bind/${props.externalRelation.relation}/${selectedItem.value}`,
      pivotData.value,
    ).then((response) => {
          item.value = response.flash.data
          // Resetear pivotData manteniendo valores de campos con keepValueAfterAdd
          const newPivotData = {}
          props.externalRelation.pivotFields?.forEach((field) => {
            if (field.keepValueAfterAdd) {
              newPivotData[field.field] = pivotData.value[field.field]
            }
          })
          pivotData.value = newPivotData
          selectedItem.value = null
          getItems()
          emit("bound")
    })
  }
}

const updateItem = (id) => {
  autoCrud.mutate("post",
    `${props.endPoint}/${item.value.id}/pivot/${props.externalRelation.relation}/${id}`,
    pivotEditData.value,
  ).then((response) => {
        item.value = response.flash.data
        pivotEditData.value = {}
        pivotEditing.value = null
  }).catch(() => {
        pivotEditData.value = {}
        pivotEditing.value = null
  })
}

const editItem = (id) => {
  const pivotItem = item.value[props.externalRelation.relation].find(
    (p) => p.id === id,
  )?.pivot

  pivotEditData.value = { ...pivotItem }

  props.externalRelation.pivotFields?.forEach((field) => {
    if (field.type === "boolean") {
      const booleanValue = Boolean(Number(pivotEditData.value[field.field]))
      pivotEditData.value[field.field] = booleanValue
    }
  })

  pivotEditing.value = id
}

const removeItem = (relationId) => {
  autoCrud.mutate("post",
    `${props.endPoint}/${item.value.id}/unbind/${props.externalRelation.relation}/${relationId}`,
    {},
  ).then((response) => {
        item.value = response.flash.data
        selectedItem.value = null
        getItems()
        emit("unbound")
  })
}

// ------------------------------------------------------------
// FUNCIONES PARA hasMany
// ------------------------------------------------------------
const isHasMany = computed(() => props.externalRelation.type === "hasMany")

// Modelo hijo modificado con FK hidden/default y columna FK oculta en tabla
const childModel = computed(() => {
  if (!isHasMany.value || !props.externalRelation.model) return null

  const parts = props.externalRelation.model.split("\\")
  const modelName = parts[parts.length - 1].toLowerCase()
  const baseModel = autoCrud.model(modelName) ?? loadedModels.value[modelName]

  if (!baseModel) return null

  const foreignKey = props.externalRelation.foreignKey

  // Clonar el modelo y modificar el campo FK en formFields
  const modifiedFormFields = baseModel.formFields.map((field) => {
    if (field.field === foreignKey) {
      return {
        ...field,
        hidden: true,
        default: item.value?.id,
      }
    }
    return field
  })

  // Filtrar la columna FK de tableHeaders
  const modifiedTableHeaders = baseModel.tableHeaders.filter(
    (header) => header.key !== foreignKey,
  )

  return {
    ...baseModel,
    formFields: modifiedFormFields,
    tableHeaders: modifiedTableHeaders,
  }
})

const loadChildModel = async () => {
  if (!isHasMany.value || !props.externalRelation.model) return

  const parts = props.externalRelation.model.split("\\")
  const modelName = parts[parts.length - 1].toLowerCase()

  if (autoCrud.model(modelName) || loadedModels.value[modelName]) return

  const schema = await autoCrud.loadSchema(modelName)
  if (schema) {
    loadedModels.value[modelName] = schema
  }
}

// Filtro exacto para cargar solo los hijos del padre actual
const childExactFilters = computed(() => {
  if (!isHasMany.value || !item.value?.id) return {}
  return {
    [props.externalRelation.foreignKey]: item.value.id,
  }
})

// ------------------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------------------
if (!isHasMany.value && !props.externalRelation.serverSide) {
  getItems()
}
if (props.externalRelation.pivotFields) {
  getRelations()
}

// Cargar items de relaciones serverSide al inicializar
onMounted(() => {
  loadChildModel()
  loadAllServerSideRelationItems()
})

// Observar cambios en el item para recargar relaciones serverSide
watch(
  () => item.value,
  () => {
    loadAllServerSideRelationItems()
  },
  { deep: true },
)
</script>

<template>
  <!-- Título de la relación (opcional) -->
  <v-row v-if="props.withTitle" class="align-center justify-center my-3">
    <v-col class="justify-center align-center text-center" cols="12">
      <span class="text-headline-medium">{{ props.externalRelation.name }}</span>
    </v-col>
  </v-row>

  <!-- ============================================== -->
  <!-- BELONGSTOMANY (n:m) -->
  <!-- ============================================== -->

  <!-- FORM para añadir un nuevo elemento a la tabla pivote -->
  <v-form v-if="!isHasMany" v-model="addForm" @submit.prevent="addItem">
    <v-row
      class="align-center justify-center my-3 mx-1 elevation-5 rounded pa-5'"
    >
      <!-- Autocomplete principal (relación n:m) -->
      <v-col
        cols="12"
        :md="
          !props.externalRelation.pivotFields ||
          props.externalRelation.pivotFields.length > 1
            ? 12
            : 6
        "
      >
        <!-- Si NO hay pivotFields y NO es serverSide -->
        <v-autocomplete
          v-if="
            !props.externalRelation.pivotFields &&
            !props.externalRelation.serverSide
          "
          :label="props.externalRelation.name"
          v-model="selectedItem"
          :items="
            props.filteredItems?.[props.externalRelation.relation]
              ? props.filteredItems[props.externalRelation.relation](
                  items,
                  props.formData,
                )
              : items
          "
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[props.externalRelation.relation],
              )
          "
          :item-props="props.customItemProps?.[props.externalRelation.relation]"
          :item-title="generateItemTitle(props.externalRelation.formKey)"
          item-value="id"
          hide-details
          @update:modelValue="addItem"
        >
          <!-- storeShortcut para la relación principal -->
          <template v-if="props.externalRelation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              @click="storeExternalShortcutShow = true"
            ></v-btn>
            <auto-form-dialog
              v-model:show="storeExternalShortcutShow"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="props.externalRelation.model"
              @success="handleExternalStoreShortcutSuccess"
              @update:show="getItems"
            />
          </template>
        </v-autocomplete>

        <!-- Si hay pivotFields y NO es serverSide -->
        <v-autocomplete
          v-else-if="!props.externalRelation.serverSide"
          :label="props.externalRelation.name"
          v-model="selectedItem"
          :items="
            props.filteredItems?.[props.externalRelation.relation]
              ? props.filteredItems[props.externalRelation.relation](
                  items,
                  props.formData,
                )
              : items
          "
          :item-title="generateItemTitle(props.externalRelation.formKey)"
          :item-props="props.customItemProps?.[props.externalRelation.relation]"
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[props.externalRelation.relation],
              )
          "
          item-value="id"
          :rules="[ruleRequired]"
          density="compact"
        >
          <!-- storeShortcut para la relación principal -->
          <template v-if="props.externalRelation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              density="compact"
              @click="storeExternalShortcutShow = true"
            ></v-btn>
            <auto-form-dialog
              v-model:show="storeExternalShortcutShow"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="props.externalRelation.model"
              @success="handleExternalStoreShortcutSuccess"
              @update:show="getItems"
            />
          </template>
        </v-autocomplete>

        <!-- Si NO hay pivotFields y SÍ es serverSide -->
        <autocomplete-server
          v-else-if="!props.externalRelation.pivotFields"
          :label="props.externalRelation.name"
          v-model="selectedItem"
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[props.externalRelation.relation],
              )
          "
          :end-point="props.externalRelation.endPoint"
          :item-props="props.customItemProps?.[props.externalRelation.relation]"
          :item-title="props.externalRelation.formKey"
          hide-details
          :items="items"
          :filtered-items="
            props.filteredItems?.[props.externalRelation.relation]
          "
          :form-data="props.formData"
          @update:modelValue="addItem"
        >
          <!-- storeShortcut para la relación principal -->
          <template v-if="props.externalRelation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              @click="storeExternalShortcutShow = true"
            ></v-btn>
            <auto-form-dialog
              v-model:show="storeExternalShortcutShow"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="props.externalRelation.model"
              @success="handleExternalStoreShortcutSuccess"
              @update:show="getItems"
            />
          </template>
        </autocomplete-server>

        <!-- Si hay pivotFields y SÍ es serverSide -->
        <autocomplete-server
          v-else-if="props.externalRelation.serverSide"
          :label="props.externalRelation.name"
          v-model="selectedItem"
          :item-title="props.externalRelation.formKey"
          :item-props="props.customItemProps?.[props.externalRelation.relation]"
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[props.externalRelation.relation],
              )
          "
          :rules="[ruleRequired]"
          density="compact"
          :end-point="props.externalRelation.endPoint"
          :items="items"
          :filtered-items="
            props.filteredItems?.[props.externalRelation.relation]
          "
          :form-data="props.formData"
          :item="storeExternalShortcutCreatedItem"
        >
          <!-- storeShortcut para la relación principal -->
          <template v-if="props.externalRelation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              density="compact"
              @click="storeExternalShortcutShow = true"
            ></v-btn>
            <auto-form-dialog
              v-model:show="storeExternalShortcutShow"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="props.externalRelation.model"
              @success="handleExternalStoreShortcutSuccess"
              @update:show="getItems"
            />
          </template>
        </autocomplete-server>
      </v-col>

      <!-- CAMPOS DE PIVOTE -->
      <v-col
        cols="12"
        :md="props.externalRelation.pivotFields?.length > 1 ? 12 : 6"
        v-for="field in props.externalRelation.pivotFields ?? []"
        :key="field.field"
      >
        <!-- Dependiendo del "type" del campo -->
        <v-text-field
          v-if="
            !field.relation &&
            field.type !== 'boolean' &&
            field.type !== 'date' &&
            field.type !== 'password' &&
            field.type !== 'select' &&
            field.type !== 'text'
          "
          density="compact"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
        />
        <v-checkbox
          v-else-if="field.type === 'boolean'"
          density="compact"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
        />
        <v-text-field
          v-else-if="field.type === 'date'"
          type="date"
          density="compact"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
        />
        <v-text-field
          v-else-if="field.type === 'password'"
          density="compact"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
          type="password"
        />
        <v-select
          v-else-if="field.type === 'select'"
          density="compact"
          :items="field.options"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
          :clearable="!field.rules?.required"
        />
        <v-textarea
          v-else-if="field.type === 'text'"
          density="compact"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
        />
        <!-- Campo RELACIÓN en el pivote (serverSide) -->
        <autocomplete-server
          v-else-if="field.relation && field.relation.serverSide"
          :label="field.rules?.required ? field.name + ' *' : field.name"
          v-model="pivotData[field.field]"
          :item-title="field.relation.formKey"
          :item-props="props.customItemProps?.[field.relation.relation]"
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[field.relation.relation],
              )
          "
          :rules="getFieldRules(pivotData[field.field], field)"
          density="compact"
          :end-point="field.relation.endPoint"
          :filtered-items="props.filteredItems?.[field.relation.relation]"
          :form-data="props.formData"
          :item="storePivotShortcutCreatedItems[field.field] || null"
        >
          <template v-if="field.relation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              density="compact"
              @click="storePivotShortcutShows[field.field] = true"
            >
            </v-btn>
            <auto-form-dialog
              v-model:show="storePivotShortcutShows[field.field]"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="field.relation.model"
              @success="
                (flash) => handlePivotStoreShortcutSuccess(field, flash)
              "
            />
          </template>
        </autocomplete-server>

        <!-- Campo RELACIÓN en el pivote (NO serverSide) -->
        <v-autocomplete
          v-else-if="field.relation && !field.relation.serverSide"
          :items="
            props.filteredItems?.[field.relation.relation]
              ? props.filteredItems[field.relation.relation](
                  relations[field.field],
                )
              : relations[field.field]
          "
          :label="field.rules?.required ? field.name + ' *' : field.name"
          :item-props="props.customItemProps?.[field.relation.relation]"
          :item-title="generateItemTitle(field.relation.formKey)"
          :custom-filter="
            (item, queryText, itemText) =>
              searchByWords(
                item,
                queryText,
                itemText,
                props.customFilters?.[field.relation.relation],
              )
          "
          item-value="id"
          v-model="pivotData[field.field]"
          :rules="getFieldRules(pivotData[field.field], field)"
          density="compact"
        >
          <!-- storeShortcut para el campo de pivote -->
          <template v-if="field.relation.storeShortcut" v-slot:prepend>
            <v-btn
              icon="mdi-plus-circle"
              density="compact"
              @click="storePivotShortcutShows[field.field] = true"
            >
            </v-btn>
            <auto-form-dialog
              v-model:show="storePivotShortcutShows[field.field]"
              type="create"
              :filteredItems="props.filteredItems"
              :customFilters="props.customFilters"
              :customItemProps="props.customItemProps"
              :modelName="field.relation.model"
              @success="
                (flash) => handlePivotStoreShortcutSuccess(field, flash)
              "
              @update:show="getRelations"
            />
          </template>
        </v-autocomplete>
      </v-col>

      <!-- Botón "Agregar" -->
      <v-col
        v-if="props.externalRelation.pivotFields"
        cols="12"
        class="text-center pt-0"
      >
        <v-btn
          @click="addItem()"
          :disabled="!addForm"
          color="blue-darken-1"
          variant="text"
        >
          Agregar
        </v-btn>
      </v-col>
    </v-row>
  </v-form>

  <!-- LISTADO DE ELEMENTOS YA RELACIONADOS (belongsToMany) -->
  <v-row
    v-if="!isHasMany && item && item[props.externalRelation.relation]"
    v-for="relationItem in item[props.externalRelation.relation]"
    :key="relationItem.id"
    class="pa-0 ma-0"
  >
    <!-- VISTA NORMAL (sin editar) -->
    <v-row
      v-if="relationItem.id !== pivotEditing"
      class="align-center justify-center my-2 mx-1 elevation-5 rounded pa-2"
    >
      <v-col class="my-3">
        {{ generateItemTitle(props.externalRelation.formKey)(relationItem) }}
      </v-col>
      <!-- Mostramos los campos del pivote (tipo "badge" o "chip") -->
      <v-col
        class="d-flex align-center justify-center"
        v-for="field in props.externalRelation.pivotFields ?? []"
        :key="field.field"
      >
        <v-chip>
          {{ field.name }}:
          <!-- Relación NO serverSide -->
          <template
            v-if="
              field.relation &&
              !field.relation.serverSide &&
              relations[field.field]
            "
          >
            {{
              tableItemTitle(
                field.relation.formKey,
                relations[field.field]?.find(
                  (r) => r.id === relationItem.pivot[field.field],
                ),
              )
            }}
          </template>
          <!-- Relación serverSide -->
          <template v-else-if="field.relation && field.relation.serverSide">
            <span>
              {{
                getServerSideRelationItemTitle(
                  field,
                  relationItem.pivot[field.field],
                )
              }}
            </span>
          </template>
          <v-checkbox
            density="compact"
            class="mt-5"
            v-else-if="field.type === 'boolean'"
            :model-value="Boolean(Number(relationItem.pivot[field.field]))"
            disabled
          />
          <span v-else>{{ relationItem.pivot[field.field] }}</span>
        </v-chip>
      </v-col>
      <v-col class="text-end">
        <slot
          :name="`${props.externalRelation.relation}.actions`"
          :item="relationItem"
        />
        <v-btn
          v-if="props.externalRelation.pivotFields"
          icon
          density="compact"
          variant="text"
          @click="editItem(relationItem.id)"
        >
          <v-icon>mdi-pencil</v-icon>
          <v-tooltip right>Editar</v-tooltip>
        </v-btn>
        <v-btn
          icon
          density="compact"
          variant="text"
          @click="removeItem(relationItem.id)"
        >
          <v-icon>mdi-delete</v-icon>
          <v-tooltip right>Eliminar</v-tooltip>
        </v-btn>
      </v-col>
    </v-row>

    <!-- FORM DE EDICIÓN DE LOS CAMPOS PIVOTE -->
    <v-form
      v-else
      v-model="updateForm"
      @submit.prevent="updateItem"
      class="w-100"
    >
      <v-row
        class="align-center justify-center my-3 mx-1 elevation-5 rounded pa-5'"
      >
        <v-col
          cols="12"
          :md="
            !props.externalRelation.pivotFields ||
            props.externalRelation.pivotFields.length > 1
              ? 12
              : 6
          "
        >
          <v-autocomplete
            :label="props.externalRelation.name"
            :model-value="relationItem"
            :items="[relationItem]"
            :item-title="generateItemTitle(props.externalRelation.formKey)"
            item-value="id"
            density="compact"
            disabled
          />
        </v-col>

        <v-col
          cols="12"
          :md="props.externalRelation.pivotFields?.length > 1 ? 12 : 6"
          v-for="field in props.externalRelation.pivotFields ?? []"
          :key="field.field"
        >
          <v-text-field
            v-if="
              !field.relation &&
              field.type !== 'boolean' &&
              field.type !== 'date' &&
              field.type !== 'password' &&
              field.type !== 'select' &&
              field.type !== 'text'
            "
            density="compact"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
          />
          <v-checkbox
            v-else-if="field.type === 'boolean'"
            density="compact"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
          />
          <v-text-field
            v-else-if="field.type === 'date'"
            density="compact"
            type="date"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
          />
          <v-text-field
            v-else-if="field.type === 'password'"
            density="compact"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
            type="password"
          />
          <v-select
            v-else-if="field.type === 'select'"
            density="compact"
            :items="field.options"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
            :clearable="!field.rules?.required"
          />
          <v-textarea
            v-else-if="field.type === 'text'"
            density="compact"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
          />
          <!-- Relación en modo edición pivote (serverSide) -->
          <autocomplete-server
            v-else-if="field.relation && field.relation.serverSide"
            :label="field.rules?.required ? field.name + ' *' : field.name"
            v-model="pivotEditData[field.field]"
            :item-title="field.relation.formKey"
            :item-props="props.customItemProps?.[field.relation.relation]"
            :custom-filter="
              (item, queryText, itemText) =>
                searchByWords(
                  item,
                  queryText,
                  itemText,
                  props.customFilters?.[field.relation.relation],
                )
            "
            :rules="getFieldRules(pivotEditData[field.field], field)"
            density="compact"
            :end-point="field.relation.endPoint"
            :item="
              serverSideRelationItems[field.field]?.[pivotEditData[field.field]]
            "
            :filtered-items="props.filteredItems?.[field.relation.relation]"
            :form-data="props.formData"
          >
            <template v-if="field.relation.storeShortcut" v-slot:prepend>
              <v-btn
                icon="mdi-plus-circle"
                density="compact"
                @click="storePivotShortcutShows[field.field] = true"
              />
              <auto-form-dialog
                v-model:show="storePivotShortcutShows[field.field]"
                type="create"
                :filteredItems="props.filteredItems"
                :customFilters="props.customFilters"
                :customItemProps="props.customItemProps"
                :modelName="field.relation.model"
                @success="
                  (flash) => handlePivotStoreShortcutSuccess(field, flash)
                "
              />
            </template>
          </autocomplete-server>

          <!-- Relación en modo edición pivote (NO serverSide) -->
          <v-autocomplete
            v-else-if="field.relation && !field.relation.serverSide"
            :items="
              props.filteredItems?.[field.relation.relation]
                ? props.filteredItems[field.relation.relation](
                    relations[field.field],
                  )
                : relations[field.field]
            "
            :label="field.rules?.required ? field.name + ' *' : field.name"
            :item-props="props.customItemProps?.[field.relation.relation]"
            :item-title="generateItemTitle(field.relation.formKey)"
            :custom-filter="
              (item, queryText, itemText) =>
                searchByWords(
                  item,
                  queryText,
                  itemText,
                  props.customFilters?.[field.relation.relation],
                )
            "
            item-value="id"
            v-model="pivotEditData[field.field]"
            :rules="getFieldRules(pivotEditData[field.field], field)"
            density="compact"
          >
            <!-- storeShortcut para la relación del pivote en edición -->
            <template v-if="field.relation.storeShortcut" v-slot:prepend>
              <v-btn
                icon="mdi-plus-circle"
                density="compact"
                @click="storePivotShortcutShows[field.field] = true"
              />
              <auto-form-dialog
                v-model:show="storePivotShortcutShows[field.field]"
                type="create"
                :filteredItems="props.filteredItems"
                :customFilters="props.customFilters"
                :customItemProps="props.customItemProps"
                :modelName="field.relation.model"
                @success="
                  (flash) => handlePivotStoreShortcutSuccess(field, flash)
                "
                @update:show="getRelations"
              />
            </template>
          </v-autocomplete>
        </v-col>

        <!-- Botones GUARDAR / CANCELAR -->
        <v-col cols="12" class="text-center">
          <v-btn
            @click="updateItem(relationItem.id)"
            color="blue-darken-1"
            variant="text"
            :disabled="!updateForm"
          >
            Guardar
          </v-btn>
          <v-btn
            @click="pivotEditing = null"
            color="red-darken-1"
            variant="text"
          >
            Cancelar
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-row>

  <!-- ============================================== -->
  <!-- HASMANY (1:n) -->
  <!-- ============================================== -->

  <template v-if="isHasMany && childModel">
    <auto-table
      :title="props.externalRelation.name"
      :model="childModel"
      :exactFilters="childExactFilters"
      :filteredItems="props.filteredItems"
      :customFilters="props.customFilters"
      :customItemProps="props.customItemProps"
      :listMode="true"
    />
  </template>
</template>
