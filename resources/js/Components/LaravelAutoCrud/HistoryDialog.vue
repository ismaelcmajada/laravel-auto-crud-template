<script setup>
import { computed } from "vue"

const props = defineProps(["show", "item"])
const emit = defineEmits(["closeDialog"])

const dialogState = computed({
  get: () => props.show,
  set: (value) => {
    emit("closeDialog", value)
  },
})

//Función para formatear en español y de forma legible el datetime de la base de datos
const formatDate = (date) => {
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }
  return new Date(date).toLocaleDateString("es-ES", options)
}
</script>
<template>
  <v-dialog scrollable v-model="dialogState" width="1024">
    <v-card>
      <v-card-title>
        <span class="text-headline-medium">Historial</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-container>
          <div v-for="record in props.item.records" :key="record.id">
            <div class="elevation-5 rounded">
              <v-row class="ma-0 mb-3 px-2 pt-2 pt-md-0">
                <v-col cols="12" md="3" class="d-flex align-center">
                  <v-row class="py-3">
                    <v-col class="pa-0" cols="12">
                      <v-chip class="w-100 justify-center">
                        <v-icon
                          start
                          icon="mdi-format-list-bulleted-type"
                        ></v-icon>
                        {{ record.action }}
                      </v-chip>
                    </v-col>
                    <v-col class="pa-0 pt-1" cols="12">
                      <v-chip class="w-100 justify-center">
                        <v-icon start icon="mdi-calendar"></v-icon>
                        {{ formatDate(record.created_at) }}
                      </v-chip>
                    </v-col>
                  </v-row>
                </v-col>
                <v-col>
                  <div
                    class="d-flex flex-column h-100 align-center justify-center text-center"
                  >
                    <div class="w-100">
                      {{ record.user.name }}
                      <v-divider></v-divider>
                      {{ record.user.email }}
                      <p></p>
                    </div>
                  </div>
                </v-col>
                <v-col cols="12" md="2"></v-col>
              </v-row>
            </div>
          </div>
        </v-container>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions class="d-flex justify-center">
        <v-btn color="red-darken-1" variant="text" @click="dialogState = false">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
