<script setup>
import { ref, onMounted, computed } from "vue"
import DestroyDialog from "./DestroyDialog.vue"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps({
  modelName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const customFields = ref([])
const fieldTypes = ref([
  { value: "string", label: "Texto corto" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto largo" },
  { value: "boolean", label: "Sí/No" },
  { value: "date", label: "Fecha" },
  { value: "datetime", label: "Fecha y hora" },
  { value: "select", label: "Selección" },
])
const loading = ref(false)
const dialog = ref(false)
const editingField = ref(null)

// Diálogos de confirmación
const showConfirmCloseDialog = ref(false)
const showDestroyDialog = ref(false)
const fieldToDelete = ref(null)

const defaultField = {
  label: "",
  type: "string",
  options: [],
  rules: { required: false },
  is_active: true,
  show_in_table: false,
}

const formData = autoCrud.form({ ...defaultField })
const optionsInput = ref("")

// Detectar si el formulario tiene cambios
const isFormDirty = computed(() => formData.isDirty)

const loadCustomFields = async () => {
  loading.value = true
  try {
    const response = await autoCrud.get(autoCrud.customFieldsEndpoint(props.modelName))
    customFields.value = response.data
  } catch (error) {
    console.error("Error loading custom fields:", error)
  } finally {
    loading.value = false
  }
}

const openDialog = (field = null) => {
  if (field) {
    editingField.value = field
    formData.label = field.label
    formData.type = field.type
    formData.options = field.options || []
    formData.rules = field.rules || { required: false }
    formData.is_active = field.is_active
    formData.show_in_table = field.show_in_table
    optionsInput.value = field.options?.join(", ") || ""
  } else {
    editingField.value = null
    formData.reset()
    optionsInput.value = ""
  }
  formData.defaults()
  dialog.value = true
}

const handleCloseDialog = () => {
  if (isFormDirty.value) {
    showConfirmCloseDialog.value = true
  } else {
    closeDialog()
  }
}

const closeDialog = () => {
  dialog.value = false
  editingField.value = null
  formData.reset()
  optionsInput.value = ""
}

const confirmCloseDialog = () => {
  showConfirmCloseDialog.value = false
  closeDialog()
}

const saveField = () => {
  if (formData.type === "select" && optionsInput.value) {
    formData.options = optionsInput.value.split(",").map((o) => o.trim())
  }

  const url = editingField.value
    ? `${autoCrud.customFieldsEndpoint(props.modelName)}/${editingField.value.id}`
    : autoCrud.customFieldsEndpoint(props.modelName)

  formData.post(url, {
    preserveScroll: true,
    onSuccess: () => {
      loadCustomFields()
      // Cerrar diálogo y resetear form
      dialog.value = false
      editingField.value = null
      formData.reset()
      formData.defaults()
      optionsInput.value = ""
      emit("updated")
    },
  })
}

const openDestroyDialog = (field) => {
  fieldToDelete.value = field
  showDestroyDialog.value = true
}

const closeDestroyDialog = () => {
  showDestroyDialog.value = false
  fieldToDelete.value = null
}

const onFieldDeleted = () => {
  loadCustomFields()
  emit("updated")
}

// Endpoint para el DestroyDialog
const customFieldsEndpoint = computed(
  () => autoCrud.customFieldsEndpoint(props.modelName)
)

const toggleActive = (field) => {
  autoCrud.mutate("post",
    `${autoCrud.customFieldsEndpoint(props.modelName)}/${field.id}`,
    { is_active: !field.is_active },
  ).then(() => {
    loadCustomFields()
    emit("updated")
  })
}

const getTypeName = (type) => {
  const found = fieldTypes.value.find((t) => t.value === type)
  return found?.label || type
}

onMounted(() => {
  loadCustomFields()
})
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <span>Campos Personalizados</span>
      <v-spacer></v-spacer>
      <v-btn color="primary" size="small" @click="openDialog()">
        <v-icon left>mdi-plus</v-icon>
        Añadir Campo
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate></v-progress-linear>

      <v-list v-if="customFields.length > 0">
        <v-list-item
          v-for="field in customFields"
          :key="field.id"
          :class="{ 'opacity-50': !field.is_active }"
        >
          <template v-slot:prepend>
            <v-icon>mdi-form-textbox</v-icon>
          </template>

          <v-list-item-title>{{ field.label }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ getTypeName(field.type) }}
            <v-chip v-if="field.rules?.required" size="x-small" class="ml-2">
              Requerido
            </v-chip>
            <v-chip
              v-if="field.show_in_table"
              size="x-small"
              color="info"
              class="ml-1"
            >
              En tabla
            </v-chip>
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="toggleActive(field)"
            >
              <v-icon>{{ field.is_active ? "mdi-eye" : "mdi-eye-off" }}</v-icon>
              <v-tooltip activator="parent">{{
                field.is_active ? "Desactivar" : "Activar"
              }}</v-tooltip>
            </v-btn>
            <v-btn icon size="small" variant="text" @click="openDialog(field)">
              <v-icon>mdi-pencil</v-icon>
              <v-tooltip activator="parent">Editar</v-tooltip>
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              @click="openDestroyDialog(field)"
            >
              <v-icon>mdi-delete</v-icon>
              <v-tooltip activator="parent">Eliminar</v-tooltip>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>

      <v-alert v-else type="info" variant="tonal">
        No hay campos personalizados definidos para este modelo.
      </v-alert>
    </v-card-text>
  </v-card>

  <!-- Dialog para crear/editar campo -->
  <v-dialog
    v-model="dialog"
    max-width="500"
    :persistent="isFormDirty"
    @click:outside="handleCloseDialog"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>{{
          editingField ? "Editar Campo" : "Nuevo Campo Personalizado"
        }}</span>
        <v-spacer></v-spacer>
        <v-chip v-if="isFormDirty" color="warning" size="small">
          Sin guardar
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="formData.label"
          label="Etiqueta *"
          required
        ></v-text-field>

        <v-select
          v-model="formData.type"
          :items="fieldTypes"
          item-title="label"
          item-value="value"
          label="Tipo de Campo *"
        ></v-select>

        <v-text-field
          v-if="formData.type === 'select'"
          v-model="optionsInput"
          label="Opciones (separadas por coma)"
          hint="Ej: Opción 1, Opción 2, Opción 3"
          persistent-hint
        ></v-text-field>

        <v-checkbox
          v-model="formData.rules.required"
          label="Campo requerido"
        ></v-checkbox>

        <v-checkbox
          v-model="formData.show_in_table"
          label="Mostrar en tabla"
        ></v-checkbox>

        <v-checkbox
          v-model="formData.is_active"
          label="Campo activo"
        ></v-checkbox>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="red-darken-1" variant="text" @click="handleCloseDialog">
          Cerrar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="saveField"
          :loading="formData.processing"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Diálogo de confirmación para cerrar sin guardar -->
  <v-dialog v-model="showConfirmCloseDialog" max-width="400">
    <v-card>
      <v-card-title class="text-headline-small">Cambios sin guardar</v-card-title>
      <v-card-text>
        Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar el
        formulario? Los cambios se perderán.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey"
          variant="text"
          @click="showConfirmCloseDialog = false"
        >
          Cancelar
        </v-btn>
        <v-btn color="red-darken-1" variant="text" @click="confirmCloseDialog">
          Cerrar sin guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Diálogo de confirmación para eliminar -->
  <destroy-dialog
    :show="showDestroyDialog"
    :item="fieldToDelete || {}"
    :end-point="customFieldsEndpoint"
    element-name="label"
    @close-dialog="closeDestroyDialog"
    @reload-items="onFieldDeleted"
  />
</template>
