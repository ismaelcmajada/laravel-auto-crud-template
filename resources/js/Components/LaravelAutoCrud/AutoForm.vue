<script setup>
import { useForm } from "@inertiajs/vue3"
import axios from "axios"
import { ref, computed, watch, nextTick } from "vue"
import AutoExternalRelation from "./AutoExternalRelation.vue"
import AutocompleteServer from "./AutocompleteServer.vue"
import { formatDate, formatDateTime } from "../../Utils/LaravelAutoCrud/dates"
import { getFieldRules } from "../../Utils/LaravelAutoCrud/rules"
import AutoFormDialog from "./AutoFormDialog.vue"
import {
  searchByWords,
  generateItemTitle,
} from "../../Utils/LaravelAutoCrud/autocompleteUtils"
import VDatetimePicker from "./VDatetimePicker.vue"

const props = defineProps([
  "item",
  "type",
  "model",
  "customFilters",
  "filteredItems",
  "customItemProps",
])

const emit = defineEmits([
  "update:item",
  "update:type",
  "formChange",
  "isDirty",
  "success",
  "close",
])

const model = computed(() => {
  return props.model
})

const type = computed({
  get: () => props.type,
  set: (value) => emit("update:type", value),
})

const item = computed({
  get: () => props.item,
  set: (value) => emit("update:item", value),
})

const filteredFormFields = computed(() => {
  return model.value.formFields
})

const hiddenFormFieldsLength = computed(() => {
  return (
    filteredFormFields.value.filter(
      (field) => field.hidden || (type.value === "create" && field.onlyUpdate),
    ).length ?? 0
  )
})

const relations = ref({})
const comboboxItems = ref({})
const storeShortcutShows = ref({})
const storeExternalShortcutShows = ref({})
const storeShortcutCreatedItems = ref({})

const formRef = ref(null)

const imagePreview = ref({})
const filePreview = ref({})
const filesToDelete = ref({})
const imagesToDelete = ref({})
const fileInputKey = ref(0)
const imageInputKey = ref(0)

const getRelations = () => {
  const relationsFromFormFields = filteredFormFields.value.filter(
    (field) => field.relation && !field.relation.serverSide,
  )

  relationsFromFormFields.forEach((field) => {
    axios.get(`${field.relation.endPoint}/all`).then((response) => {
      relations.value[field.field] = response.data
    })
  })
}

const getComboboxItems = () => {
  const comboboxFields = filteredFormFields.value.filter(
    (field) => field.type === "combobox",
  )

  comboboxFields.forEach((field) => {
    axios.get(`${field.endPoint}/all`).then((response) => {
      comboboxItems.value[field.field] = response.data
    })
  })
}

const mapComboboxItems = (field, items) => {
  return items?.map((item) => item[field.itemTitle])
}

const form = ref(false)

const formData = useForm(
  Object.fromEntries(filteredFormFields.value.map((f) => [f.field, null])),
)

const initFields = () => {
  // Resetear archivos a eliminar, previews y forzar reseteo del input
  filesToDelete.value = {}
  imagesToDelete.value = {}
  filePreview.value = {}
  imagePreview.value = {}
  fileInputKey.value++
  imageInputKey.value++

  if (type.value === "edit" && item.value) {
    filteredFormFields.value.forEach((field) => {
      if (field.type === "password") {
        formData[field.field] = ""
        if (field.rules) field.rules.required = false
      } else if (field.type === "boolean") {
        // Convertir a booleano real (puede venir como 1, 0, "1", "0", true, false)
        const val = item.value[field.field]
        formData[field.field] = val === true || val === 1 || val === "1"
      } else if (field.type === "date") {
        if (item.value[field.field]) {
          formData[field.field] = formatDate(item.value[field.field])
        }
      } else if (field.type === "datetime") {
        if (item.value[field.field]) {
          formData[field.field] = formatDateTime(item.value[field.field])
        }
      } else {
        formData[field.field] = item.value[field.field]
        if (field.type === "image" && item.value[field.field]) {
          if (field.multiple) {
            // Múltiples imágenes - limpiar imágenes pendientes y parsear JSON existente
            formData[field.field] = null
            if (item.value[field.field]) {
              try {
                imagePreview.value[field.field] = JSON.parse(
                  item.value[field.field],
                )
              } catch (e) {
                imagePreview.value[field.field] = []
              }
            } else {
              imagePreview.value[field.field] = []
            }
          } else {
            imagePreview.value[field.field] = `/laravel-auto-crud/${
              item.value[field.field]
            }`
          }
        }
        if (field.type === "file") {
          if (field.multiple) {
            // Múltiples archivos - limpiar archivos pendientes y parsear JSON existente
            formData[field.field] = null
            if (item.value[field.field]) {
              try {
                filePreview.value[field.field] = JSON.parse(
                  item.value[field.field],
                )
              } catch (e) {
                filePreview.value[field.field] = []
              }
            } else {
              filePreview.value[field.field] = []
            }
          } else if (item.value[field.field]) {
            filePreview.value[field.field] = item.value[field.field]
          }
        }
        if (field.type === "select") {
          if (field.multiple) {
            formData[field.field] = item.value[field.field]?.split(", ") || []
          }
        }
        // Custom fields: cargar valor si existe
        if (field.isCustomField && item.value[field.field] !== undefined) {
          formData[field.field] = item.value[field.field]
        }
      }

      if (field.relation?.storeShortcut) {
        storeShortcutShows.value[field.field] = false
      }
    })
  } else if (type.value === "create") {
    filteredFormFields.value.forEach((field) => {
      // Booleanos: inicializar a false por defecto
      if (field.type === "boolean") {
        formData[field.field] = field.default ?? false
      } else {
        formData[field.field] = field.default ?? null
      }

      if (item.value?.[field.field] && field.type === "date") {
        formData[field.field] = formatDate(item.value[field.field])
      }

      if (field.relation?.storeShortcut) {
        storeShortcutShows.value[field.field] = false
      }

      // Custom fields: inicializar con valor por defecto
      if (field.isCustomField) {
        formData[field.field] = field.default ?? null
      }
    })
  }

  model.value.externalRelations.forEach((relation) => {
    if (relation.storeShortcut) {
      storeExternalShortcutShows.value[relation.relation] = false
    }
  })

  // Esperar al siguiente tick para que Vue procese los cambios antes de resetear defaults
  nextTick(() => {
    formData.defaults()
    emit("isDirty", false)
  })
}

const submit = () => {
  if (type.value === "edit") {
    formData.post(`${model.value.endPoint}/${item.value.id}`, {
      _method: "put",
      forceFormData: true,
      onSuccess: (page) => {
        item.value = page.props.flash.data
        filesToDelete.value = {}
        // Limpiar transform para evitar re-envío de archivos y flags
        formData.transform((data) => data)
        initFields()
        emit("success", page.props.flash)
      },
    })
  } else if (type.value === "create") {
    formData.post(model.value.endPoint, {
      onSuccess: (page) => {
        item.value = page.props.flash.data
        filesToDelete.value = {}
        // Limpiar transform para evitar re-envío de archivos y flags
        formData.transform((data) => data)
        initFields()
        emit("success", page.props.flash)
        if (model.value.externalRelations.length > 0) {
          type.value = "edit"
        } else {
          emit("close")
        }
      },
    })
  }
}

const handleImageUpload = (file, imageFieldName, multiple = false) => {
  if (file && file.target.files.length > 0) {
    if (multiple) {
      // Múltiples imágenes
      const files = Array.from(file.target.files)
      formData[imageFieldName] = files
      // Incluir también imágenes a eliminar si las hay
      const deleteImages = imagesToDelete.value[imageFieldName] || []
      formData.transform((data) => ({
        ...data,
        [imageFieldName]: files,
        [imageFieldName + "_edited"]: true,
        ...(deleteImages.length > 0 && {
          [imageFieldName + "_delete"]: deleteImages,
        }),
      }))
    } else {
      // Imagen única
      formData.transform((data) => ({
        ...data,
        [imageFieldName + "_edited"]: true,
      }))
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.value[imageFieldName] = e.target.result
      }
      reader.readAsDataURL(file.target.files[0])
      formData[imageFieldName] = file.target.files[0]
    }
  } else {
    // Si se vacía el input, limpiar imágenes pendientes
    if (multiple) {
      clearImageInput(imageFieldName)
    } else {
      formData[imageFieldName] = null
      imagePreview.value[imageFieldName] = null
    }
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const clearImageInput = (imageFieldName) => {
  // Verificar si hay imágenes marcadas para eliminar
  const hasImagesToDelete =
    imagesToDelete.value[imageFieldName] &&
    imagesToDelete.value[imageFieldName].length > 0

  // Limpiar solo las imágenes nuevas del input
  formData[imageFieldName] = null

  if (hasImagesToDelete) {
    // Hay imágenes marcadas para eliminar, mantener dirty
    formData.transform((data) => ({
      ...data,
      [imageFieldName]: null,
      [imageFieldName + "_delete"]: imagesToDelete.value[imageFieldName],
      [imageFieldName + "_edited"]: true,
    }))
  } else {
    // No hay imágenes marcadas para eliminar, resetear el campo
    formData.defaults(imageFieldName, null)
    formData.reset(imageFieldName)
    formData.transform((data) => {
      const newData = { ...data }
      delete newData[imageFieldName + "_edited"]
      delete newData[imageFieldName + "_delete"]
      return newData
    })
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const handleFileUpload = (file, fileFieldName, multiple = false) => {
  if (file && file.target.files.length > 0) {
    if (multiple) {
      // Múltiples archivos
      const files = Array.from(file.target.files)
      formData[fileFieldName] = files
      // Incluir también archivos a eliminar si los hay
      const deleteFiles = filesToDelete.value[fileFieldName] || []
      formData.transform((data) => ({
        ...data,
        [fileFieldName]: files,
        [fileFieldName + "_edited"]: true,
        ...(deleteFiles.length > 0 && {
          [fileFieldName + "_delete"]: deleteFiles,
        }),
      }))
    } else {
      // Un solo archivo
      formData[fileFieldName] = file.target.files[0]
      formData.transform((data) => ({
        ...data,
        [fileFieldName + "_edited"]: true,
      }))
    }
  } else {
    // Si se vacía el input, limpiar archivos pendientes
    clearFileInput(fileFieldName)
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const clearFileInput = (fileFieldName) => {
  // Verificar si hay archivos marcados para eliminar
  const hasFilesToDelete =
    filesToDelete.value[fileFieldName] &&
    filesToDelete.value[fileFieldName].length > 0

  // Limpiar solo los archivos nuevos del input
  formData[fileFieldName] = null

  if (hasFilesToDelete) {
    // Hay archivos marcados para eliminar, mantener dirty
    formData.transform((data) => ({
      ...data,
      [fileFieldName]: null,
      [fileFieldName + "_delete"]: filesToDelete.value[fileFieldName],
      [fileFieldName + "_edited"]: true,
    }))
  } else {
    // No hay archivos marcados para eliminar, resetear el campo
    formData.defaults(fileFieldName, null)
    formData.reset(fileFieldName)
    formData.transform((data) => {
      const newData = { ...data }
      delete newData[fileFieldName + "_edited"]
      delete newData[fileFieldName + "_delete"]
      return newData
    })
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const removeImage = (imageFieldName, index = null) => {
  if (index !== null && Array.isArray(imagePreview.value[imageFieldName])) {
    // Eliminar una imagen específica de múltiples - guardar para eliminar en backend
    const imageToDelete = imagePreview.value[imageFieldName][index]
    if (!imagesToDelete.value[imageFieldName]) {
      imagesToDelete.value[imageFieldName] = []
    }
    imagesToDelete.value[imageFieldName].push(imageToDelete)

    imagePreview.value[imageFieldName].splice(index, 1)
    if (imagePreview.value[imageFieldName].length === 0) {
      imagePreview.value[imageFieldName] = null
    }

    // Forzar dirty asignando al campo principal y transform
    formData[imageFieldName] = "__DELETE_MARKER__"
    formData[imageFieldName + "_delete"] = [
      ...imagesToDelete.value[imageFieldName],
    ]
    formData.transform((data) => ({
      ...data,
      [imageFieldName]: null,
      [imageFieldName + "_delete"]: imagesToDelete.value[imageFieldName],
      [imageFieldName + "_edited"]: true,
    }))
  } else {
    // Imagen única
    formData.transform((data) => ({
      ...data,
      [imageFieldName + "_edited"]: true,
    }))
    formData[imageFieldName + "_edited"] = true
    imagePreview.value[imageFieldName] = null
    formData[imageFieldName] = null
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const removeFile = (fileFieldName, index = null) => {
  if (index !== null && Array.isArray(filePreview.value[fileFieldName])) {
    // Eliminar un archivo específico de múltiples - guardar para eliminar en backend
    const fileToDelete = filePreview.value[fileFieldName][index]
    if (!filesToDelete.value[fileFieldName]) {
      filesToDelete.value[fileFieldName] = []
    }
    filesToDelete.value[fileFieldName].push(fileToDelete)

    filePreview.value[fileFieldName].splice(index, 1)
    if (filePreview.value[fileFieldName].length === 0) {
      filePreview.value[fileFieldName] = null
    }

    // Forzar dirty asignando al campo principal y transform
    formData[fileFieldName] = "__DELETE_MARKER__"
    formData[fileFieldName + "_delete"] = [
      ...filesToDelete.value[fileFieldName],
    ]
    formData.transform((data) => ({
      ...data,
      [fileFieldName]: null,
      [fileFieldName + "_delete"]: filesToDelete.value[fileFieldName],
      [fileFieldName + "_edited"]: true,
    }))
  } else {
    // Archivo único
    filePreview.value[fileFieldName] = null
    formData[fileFieldName] = "__DELETE_MARKER__"
    formData.transform((data) => ({
      ...data,
      [fileFieldName]: null,
      [fileFieldName + "_edited"]: true,
    }))
  }

  nextTick(() => {
    formRef.value?.validate()
  })
}

const downloadFile = (fileFieldName, filePath = null) => {
  const link = document.createElement("a")
  const path = filePath || filePreview.value[fileFieldName]
  link.href = `/laravel-auto-crud/${path}`
  link.download = filePath ? filePath.split("/").pop() : fileFieldName
  link.click()
}

watch(
  formData,
  (newValue) => {
    emit("formChange", newValue)
  },
  { deep: true },
)

watch(
  item,
  () => {
    initFields()
  },
  { immediate: true },
)

const updateRelatedFields = (foreignKey, value) => {
  const relatedFields = filteredFormFields.value.filter(
    (field) => field.foreignKey && field.foreignKey === foreignKey,
  )

  relatedFields.forEach((field) => {
    formData[field.field] = relations.value[foreignKey].find(
      (relation) => relation.id === value,
    )[field.field]
  })
}

const updateComboField = (field, value) => {
  if (typeof value === "object") {
    formData[field.field] = value.id
    formData[field.comboField] = value[field.relation.formKey]
  } else {
    if (
      relations.value[field.field].find(
        (relation) => relation[field.relation.formKey] === value,
      )
    ) {
      formData[field.field] = relations.value[field.field].find(
        (relation) => relation[field.relation.formKey] === value,
      ).id
    } else {
      formData[field.field] = null
    }
    formData[field.comboField] = value
  }
}

getRelations()
getComboboxItems()

const handleStoreShortcutSuccess = (field, flash) => {
  const createdItem = flash.data
  if (!createdItem) return

  // Asignar el id del item creado al campo del formulario
  formData[field.field] = createdItem.id

  if (field.relation.serverSide) {
    // Para serverSide, guardar el item creado para pasarlo como prop
    storeShortcutCreatedItems.value[field.field] = createdItem
  } else {
    // Para no-serverSide, recargar las relaciones
    getRelations()
  }
}

const isFormDirty = computed(() => {
  return formData.isDirty
})

watch(isFormDirty, (value) => {
  emit("isDirty", value)
})
</script>

<template>
  <v-form ref="formRef" v-model="form" @submit.prevent="submit">
    <slot
      name="prepend"
      :model="model"
      :type="type"
      :item="item"
      :formData="formData"
      :submit="submit"
    >
    </slot>
    <v-row>
      <!-- Recorremos cada field -->
      <template v-for="field in filteredFormFields" :key="field.field">
        <!-- Creamos un slot con name dinámico: "field.[nombreDelCampo]" -->
        <slot
          :name="`field.${field.field}`"
          :formData="formData"
          :field="field"
          :item="item"
          :type="type"
          :submit="submit"
          :getFieldRules="getFieldRules"
        >
          <!-- Fallback que se muestra si el padre NO define este slot -->
          <!-- Aquí dentro va toda tu lógica habitual de if/else para cada type -->
          <v-col
            cols="12"
            v-show="!field.hidden && (type !== 'create' || !field.onlyUpdate)"
            :md="
              filteredFormFields.length - hiddenFormFieldsLength > 1 &&
              field.type !== 'image' &&
              field.type !== 'file'
                ? 6
                : 12
            "
          >
            <v-text-field
              v-if="
                !field.relation &&
                !field.comboField &&
                field.type !== 'boolean' &&
                field.type !== 'date' &&
                field.type !== 'datetime' &&
                field.type !== 'password' &&
                field.type !== 'select' &&
                field.type !== 'text' &&
                field.type !== 'image' &&
                field.type !== 'file' &&
                field.type !== 'combobox'
              "
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-text-field>

            <div v-if="field.type === 'image'">
              <!-- Input para imagen única -->
              <v-file-input
                v-if="!field.multiple && !imagePreview[field.field]"
                :label="field.rules?.required ? field.name + ' *' : field.name"
                v-model="formData[field.field]"
                :rules="getFieldRules(formData[field.field], field)"
                @change="(file) => handleImageUpload(file, field.field, false)"
                accept="image/*"
                prepend-icon="mdi-file-image"
              ></v-file-input>

              <!-- Input para múltiples imágenes (sin v-model para evitar bug) -->
              <v-file-input
                v-if="field.multiple"
                :key="`image-${field.field}-${imageInputKey}`"
                :label="field.rules?.required ? field.name + ' *' : field.name"
                :rules="
                  getFieldRules(
                    formData[field.field] === '__DELETE_MARKER__'
                      ? null
                      : formData[field.field],
                    field,
                    imagePreview[field.field]?.length
                      ? 'skipRequired'
                      : undefined,
                  )
                "
                @change="(file) => handleImageUpload(file, field.field, true)"
                @click:clear="() => clearImageInput(field.field)"
                accept="image/*"
                prepend-icon="mdi-file-image"
                multiple
                :chips="true"
                :hint="
                  imagePreview[field.field]?.length
                    ? `${
                        imagePreview[field.field].length
                      } imagen(es) guardada(s)`
                    : ''
                "
                persistent-hint
              ></v-file-input>

              <!-- Preview imagen única -->
              <v-row
                v-if="!field.multiple && imagePreview[field.field]"
                class="align-center justify-center my-3 mx-1 elevation-6 rounded pa-2"
              >
                <v-col cols="12" md="1" class="text-center">
                  {{ field.name }}
                </v-col>
                <v-col cols="12" md="10" class="my-3 d-flex justify-center">
                  <v-img
                    v-if="imagePreview"
                    :src="imagePreview[field.field]"
                    max-width="200"
                    max-height="200"
                    contain
                  ></v-img>
                </v-col>
                <v-col cols="12" md="1" class="text-center">
                  <v-btn
                    icon
                    @click="removeImage(field.field)"
                    color="red"
                    class="mt-2"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Preview múltiples imágenes existentes -->
              <div
                v-if="
                  field.multiple &&
                  Array.isArray(imagePreview[field.field]) &&
                  imagePreview[field.field].length > 0
                "
              >
                <v-row
                  v-for="(imagePath, index) in imagePreview[field.field]"
                  :key="index"
                  class="align-center justify-center my-2 mx-1 elevation-3 rounded pa-2"
                >
                  <v-col cols="12" md="10" class="d-flex justify-center">
                    <v-img
                      :src="`/laravel-auto-crud/${imagePath}`"
                      max-width="150"
                      max-height="150"
                      contain
                    ></v-img>
                  </v-col>

                  <v-col cols="12" md="2" class="text-center">
                    <v-btn
                      icon
                      size="small"
                      @click="removeImage(field.field, index)"
                      color="red"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </div>

            <div v-if="field.type === 'file'">
              <!-- Input para archivo único -->
              <v-file-input
                v-if="!field.multiple && !filePreview[field.field]"
                :label="field.rules?.required ? field.name + ' *' : field.name"
                v-model="formData[field.field]"
                :rules="
                  getFieldRules(
                    formData[field.field] === '__DELETE_MARKER__'
                      ? null
                      : formData[field.field],
                    field,
                  )
                "
                @change="(file) => handleFileUpload(file, field.field, false)"
                :accept="field.rules?.accept"
                prepend-icon="mdi-file"
              ></v-file-input>

              <!-- Input para múltiples archivos (sin v-model para evitar bug) -->
              <v-file-input
                v-if="field.multiple"
                :key="`file-${field.field}-${fileInputKey}`"
                :label="field.rules?.required ? field.name + ' *' : field.name"
                :rules="
                  getFieldRules(
                    formData[field.field] === '__DELETE_MARKER__'
                      ? null
                      : formData[field.field],
                    field,
                    filePreview[field.field]?.length
                      ? 'skipRequired'
                      : undefined,
                  )
                "
                @change="(file) => handleFileUpload(file, field.field, true)"
                @click:clear="() => clearFileInput(field.field)"
                :accept="field.rules?.accept"
                prepend-icon="mdi-file"
                multiple
                :chips="true"
                :hint="
                  filePreview[field.field]?.length
                    ? `${
                        filePreview[field.field].length
                      } archivo(s) guardado(s)`
                    : ''
                "
                persistent-hint
              ></v-file-input>

              <!-- Preview archivo único -->
              <v-row
                v-if="!field.multiple && filePreview[field.field]"
                class="align-center justify-center my-3 mx-1 elevation-6 rounded pa-2"
              >
                <v-col cols="12" md="10" class="text-center">
                  {{ field.name }}
                </v-col>

                <v-col cols="12" md="2" class="text-center">
                  <v-btn
                    icon
                    @click="downloadFile(field.field)"
                    color="blue"
                    class="mr-2"
                  >
                    <v-icon>mdi-download</v-icon>
                    <v-tooltip activator="parent">Descargar</v-tooltip>
                  </v-btn>
                  <v-btn icon @click="removeFile(field.field)" color="red">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Preview múltiples archivos existentes -->
              <div
                v-if="
                  field.multiple &&
                  Array.isArray(filePreview[field.field]) &&
                  filePreview[field.field].length > 0
                "
              >
                <v-row
                  v-for="(filePath, index) in filePreview[field.field]"
                  :key="index"
                  class="align-center justify-center my-2 mx-1 elevation-3 rounded pa-2"
                >
                  <v-col cols="12" md="10" class="text-center">
                    {{ filePath.split("/").pop() }}
                  </v-col>

                  <v-col cols="12" md="2" class="text-center">
                    <v-btn
                      icon
                      size="small"
                      @click="downloadFile(field.field, filePath)"
                      color="blue"
                      class="mr-1"
                    >
                      <v-icon>mdi-download</v-icon>
                      <v-tooltip activator="parent">Descargar</v-tooltip>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      @click="removeFile(field.field, index)"
                      color="red"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </div>

            <v-checkbox
              v-else-if="field.type === 'boolean'"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-checkbox>

            <v-text-field
              v-else-if="field.type === 'date'"
              type="date"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-text-field>

            <v-datetime-picker
              v-else-if="field.type === 'datetime'"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model:datetime="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-datetime-picker>

            <v-text-field
              v-else-if="field.type === 'password'"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
              type="password"
            ></v-text-field>

            <v-select
              v-else-if="field.type === 'select'"
              :items="field.options"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
              :clearable="!field.rules?.required"
              :multiple="field.multiple"
            ></v-select>

            <v-textarea
              v-else-if="field.type === 'text'"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-textarea>

            <v-combobox
              v-else-if="field.type === 'combobox'"
              :items="
                props.filteredItems?.[field.field]
                  ? mapComboboxItems(
                      field,
                      props.filteredItems[field.field](
                        comboboxItems[field.field],
                        props.formData,
                      ),
                    )
                  : mapComboboxItems(field, comboboxItems[field.field])
              "
              :label="field.rules?.required ? field.name + ' *' : field.name"
              :custom-filter="props.customFilters?.[field.field]"
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
            ></v-combobox>

            <v-autocomplete
              v-else-if="
                field.relation &&
                !field.comboField &&
                !field.relation.serverSide &&
                !field.relation.polymorphic
              "
              :items="
                props.filteredItems?.[field.relation.relation]
                  ? props.filteredItems[field.relation.relation](
                      relations[field.field],
                      props.formData,
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
              v-model="formData[field.field]"
              :rules="getFieldRules(formData[field.field], field)"
              @update:model-value="updateRelatedFields(field.field, $event)"
            >
              <template v-if="field.relation.storeShortcut" v-slot:prepend>
                <v-btn
                  icon="mdi-plus-circle"
                  @click="storeShortcutShows[field.field] = true"
                >
                </v-btn>
                <auto-form-dialog
                  v-model:show="storeShortcutShows[field.field]"
                  type="create"
                  :filteredItems="props.filteredItems"
                  :customFilters="props.customFilters"
                  :customItemProps="props.customItemProps"
                  :modelName="field.relation.model"
                  @success="(flash) => handleStoreShortcutSuccess(field, flash)"
                  @update:show="getRelations"
                />
              </template>
            </v-autocomplete>

            <autocomplete-server
              v-else-if="
                field.relation && !field.comboField && field.relation.serverSide
              "
              :label="field.rules?.required ? field.name + ' *' : field.name"
              :item-props="props.customItemProps?.[field.relation.relation]"
              :item-title="field.relation.formKey"
              :custom-filter="
                (item, queryText, itemText) =>
                  searchByWords(
                    item,
                    queryText,
                    itemText,
                    props.customFilters?.[field.relation.relation],
                  )
              "
              v-model="formData[field.field]"
              :end-point="field.relation.endPoint"
              :rules="getFieldRules(formData[field.field], field)"
              @update:model-value="updateRelatedFields(field.field, $event)"
              :item="
                storeShortcutCreatedItems[field.field]
                  ? storeShortcutCreatedItems[field.field]
                  : formData[field.field]
                    ? item?.[field.relation.relation]
                    : null
              "
            >
              <template v-if="field.relation.storeShortcut" v-slot:prepend>
                <v-btn
                  icon="mdi-plus-circle"
                  @click="storeShortcutShows[field.field] = true"
                >
                </v-btn>
                <auto-form-dialog
                  v-model:show="storeShortcutShows[field.field]"
                  type="create"
                  :filteredItems="props.filteredItems"
                  :customFilters="props.customFilters"
                  :customItemProps="props.customItemProps"
                  :modelName="field.relation.model"
                  @success="(flash) => handleStoreShortcutSuccess(field, flash)"
                  @update:show="getRelations"
                />
              </template>
            </autocomplete-server>

            <v-combobox
              v-else-if="field.relation && field.comboField"
              :label="field.rules?.required ? field.name + ' *' : field.name"
              v-model="formData[field.comboField]"
              :rules="getFieldRules(formData[field.field], field)"
              :items="
                props.filteredItems?.[field.relation.relation]
                  ? props.filteredItems[field.relation.relation](
                      relations[field.field],
                      props.formData,
                    )
                  : relations[field.field]
              "
              :item-title="generateItemTitle(field.relation.formKey)"
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
              @update:model-value="updateComboField(field, $event)"
            ></v-combobox>
          </v-col>
        </slot>
      </template>
    </v-row>
    <slot
      name="append"
      :model="model"
      :type="type"
      :item="item"
      :formData="formData"
      :submit="submit"
    ></slot>
    <div class="d-flex justify-center">
      <v-btn
        color="blue-darken-1"
        :disabled="!isFormDirty || !form"
        variant="text"
        @click="submit"
      >
        Guardar
      </v-btn>
    </div>
  </v-form>
  <slot
    name="after-save"
    :model="model"
    :type="type"
    :item="item"
    :formData="formData"
  ></slot>
  <div
    v-if="type === 'edit' && model.externalRelations.length > 0"
    v-for="relation in model.externalRelations"
  >
    <v-divider
      :thickness="3"
      class="mt-2"
      v-if="relation.form === true || relation.form === undefined"
    ></v-divider>
    <auto-external-relation
      v-if="
        type === 'edit' &&
        (relation.form === true || relation.form === undefined)
      "
      :endPoint="model.endPoint"
      :item="item"
      :externalRelation="relation"
      :filteredItems="props.filteredItems"
      :customFilters="props.customFilters"
      :customItemProps="props.customItemProps"
      :withTitle="false"
      :formData="formData"
    >
      <template v-slot:[`${relation.relation}.actions`]="{ item }">
        <slot
          :name="`auto-external-relation.${relation.relation}.actions`"
          :item="item"
        >
        </slot>
      </template>
    </auto-external-relation>
  </div>
</template>
