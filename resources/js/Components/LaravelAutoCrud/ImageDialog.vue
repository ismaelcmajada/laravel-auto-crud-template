<script setup>
import { computed } from "vue"

const props = defineProps({
  show: Boolean,
  imageUrl: String,
  altText: String,
})

const emit = defineEmits(["closeDialog"])

const dialogState = computed({
  get: () => props.show,
  set: () => {
    emit("closeDialog")
  },
})
</script>

<template>
  <v-dialog v-model="dialogState">
    <v-card>
      <v-card-title>
        <span class="text-headline-medium">Vista de imagen</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="text-center">
        <v-img
          :src="imageUrl"
          :alt="altText || 'Imagen ampliada'"
          max-height="78vh"
        ></v-img>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="d-flex justify-center">
        <v-btn color="primary" variant="text" @click="dialogState = false">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
