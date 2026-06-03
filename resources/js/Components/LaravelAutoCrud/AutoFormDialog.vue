<script setup>
import AutoForm from "./AutoForm.vue"
import { computed, ref } from "vue"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps([
  "show",
  "item",
  "type",
  "model",
  "customFilters",
  "filteredItems",
  "customItemProps",
  "modelName",
])

const emit = defineEmits([
  "update:show",
  "update:type",
  "update:item",
  "formChange",
  "isDirty",
  "success",
])

const model = computed(() => {
  if (props.modelName) {
    const parts = props.modelName.split("\\")
    const modelName = parts[parts.length - 1].toLowerCase()

    return autoCrud.model(modelName)
  } else {
    return props.model
  }
})

const show = computed({
  get: () => props.show,
  set: (value) => {
    emit("update:show")
    if (!value) {
      item.value = null
    }
  },
})

const type = computed({
  get: () => props.type,
  set: (value) => {
    emit("update:type", value)
  },
})

const item = computed({
  get: () => props.item,
  set: (value) => {
    emit("update:item", value)
  },
})

const isFormDirty = ref(false)
const showConfirmDialog = ref(false)

const handleIsFormDirty = (value) => {
  isFormDirty.value = value
  emit("isDirty", value)
}

const handleClose = () => {
  if (isFormDirty.value) {
    showConfirmDialog.value = true
  } else {
    show.value = false
  }
}

const confirmClose = () => {
  showConfirmDialog.value = false
  isFormDirty.value = false
  show.value = false
}

const cancelClose = () => {
  showConfirmDialog.value = false
}
</script>

<template>
  <v-dialog
    scrollable
    v-model="show"
    width="1024"
    :persistent="isFormDirty"
    @click:outside="handleClose"
  >
    <v-card>
      <v-card-title class="mt-2 position-relative d-flex align-center">
        <div class="text-center" style="flex: 1">
          <span v-if="type == 'create'"> Crear elemento </span>
          <span v-else> Editar elemento </span>
        </div>
        <div
          class="d-flex align-center"
          style="position: absolute; right: 0; margin-right: 10px; gap: 8px"
        >
          <slot name="header-actions" :item="item" :type="type" :model="model">
          </slot>
          <v-chip v-if="isFormDirty" color="warning" size="small">
            Sin guardar
          </v-chip>
        </div>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text>
        <v-container>
          <slot
            name="prepend"
            :model="model"
            :type="type"
            :item="item"
            :show="show"
          >
          </slot>
          <slot
            name="auto-form"
            :model="model"
            :type="type"
            :item="item"
            :isFormDirty="isFormDirty"
            :handleIsFormDirty="handleIsFormDirty"
          >
            <auto-form
              :model="model"
              v-model:type="type"
              v-model:item="item"
              :customFilters="props.customFilters"
              :filteredItems="props.filteredItems"
              :customItemProps="props.customItemProps"
              @formChange="emit('formChange', $event)"
              @isDirty="handleIsFormDirty($event)"
              @success="emit('success', $event)"
              @close="((isFormDirty = false), (show = false))"
            >
              <template #prepend="slotProps">
                <slot name="auto-form.prepend" v-bind="slotProps"> </slot>
              </template>

              <template
                v-for="field in model.formFields"
                :key="field.field"
                #[`field.${field.field}`]="slotProps"
              >
                <!--
                  Aquí, reexponemos un slot "auto-form.field.xxx"
                  de modo que 'AutoTable.vue' (o quien invoque)
                  pueda personalizarlo.
                -->
                <slot
                  :name="`auto-form.field.${field.field}`"
                  v-bind="slotProps"
                >
                  <!-- fallback vacío -->
                </slot>
              </template>

              <template #append="slotProps">
                <slot name="auto-form.append" v-bind="slotProps"> </slot>
              </template>

              <template #after-save="slotProps">
                <slot name="auto-form.after-save" v-bind="slotProps"> </slot>
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
          <slot
            name="append"
            :model="model"
            :type="type"
            :item="item"
            :show="show"
          >
          </slot>
        </v-container>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="d-flex justify-center">
        <v-btn color="red-darken-1" variant="text" @click="handleClose">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Confirmation dialog for unsaved changes -->
  <v-dialog v-model="showConfirmDialog" max-width="400">
    <v-card>
      <v-card-title class="text-headline-small"> Cambios sin guardar </v-card-title>
      <v-card-text>
        Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar el
        formulario? Los cambios se perderán.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="cancelClose">
          Cancelar
        </v-btn>
        <v-btn color="red-darken-1" variant="text" @click="confirmClose">
          Cerrar sin guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
