<script setup>
import { computed } from "vue"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps(["show", "elementName", "item", "items", "endPoint"])

const emit = defineEmits(["closeDialog", "reloadItems"])

const dialogState = computed({
  get: () => props.show,
  set: () => {
    emit("closeDialog")
  },
})

const submit = () => {
  if (props.items && props.items.length > 0) {
    autoCrud.mutate("post", `${props.endPoint}/restore-many`, props.items).then(() => {
      emit("reloadItems")
      dialogState.value = false
    })
  } else if (props.item.id) {
    autoCrud.mutate("post", `${props.endPoint}/${props.item.id}/restore`, {}).then(() => {
      emit("reloadItems")
      dialogState.value = false
    })
  } else {
    dialogState.value = false
  }
}
</script>

<template>
  <v-dialog scrollable v-model="dialogState" width="auto">
    <v-card>
      <v-card-title>
        <span class="text-headline-medium"
          >Restaurar
          {{ props.items && props.items.length > 0 ? "elementos" : "elemento" }}
        </span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text>
        <v-container v-if="props.items && props.items.length > 0">
          ¿Seguro que desea restaurar los elementos?
          <v-list v-if="props.elementName">
            <v-list-item
              v-for="item in props.items"
              :key="item.id"
              :title="item[props.elementName]"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-menu-right"></v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-container>
        <v-container v-else>
          ¿Seguro que desea restaurar el elemento?
          <v-list v-if="props.elementName">
            <v-list-item
              :key="props.item.id"
              :title="props.item[props.elementName]"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-menu-right"></v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-container>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="d-flex justify-center">
        <v-btn color="red-darken-1" variant="text" @click="dialogState = false">
          Cerrar
        </v-btn>
        <v-btn color="blue-darken-1" variant="text" @click="submit">
          Restaurar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
