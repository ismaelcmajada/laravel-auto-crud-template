<script setup>
import { ref, computed, watch, onMounted } from "vue"
import { format, parse } from "date-fns"

const DEFAULT_DATE = null // Cambiado a null para representar la ausencia de fecha
const DEFAULT_TIME = null
const DEFAULT_DATE_FORMAT = "dd-MM-yyyy"
const DEFAULT_TIME_FORMAT = "HH:mm"
const DEFAULT_DIALOG_WIDTH = 340
const DEFAULT_CLEAR_TEXT = "CLEAR"
const DEFAULT_OK_TEXT = "OK"

const props = defineProps({
  datetime: {
    type: [Date, String],
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: "",
  },
  dialogWidth: {
    type: Number,
    default: DEFAULT_DIALOG_WIDTH,
  },
  dateFormat: {
    type: String,
    default: DEFAULT_DATE_FORMAT,
  },
  timeFormat: {
    type: String,
    default: DEFAULT_TIME_FORMAT,
  },
  clearText: {
    type: String,
    default: DEFAULT_CLEAR_TEXT,
  },
  okText: {
    type: String,
    default: DEFAULT_OK_TEXT,
  },
  textFieldProps: {
    type: Object,
    default: () => ({}),
  },
  datePickerProps: {
    type: Object,
    default: () => ({}),
  },
  timePickerProps: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["update:datetime"])

const display = ref(false)
const activeTab = ref(0)
const date = ref(DEFAULT_DATE) // Ahora es un objeto Date o null
const time = ref(DEFAULT_TIME)
const timerRef = ref(null)

const dateTimeFormat = computed(() => `${props.dateFormat} ${props.timeFormat}`)

const selectedDatetime = computed(() => {
  if (date.value && time.value) {
    const [hours, minutes, seconds] = time.value.split(":").map(Number)
    const datetime = new Date(date.value)
    datetime.setHours(hours)
    datetime.setMinutes(minutes)
    datetime.setSeconds(seconds || 0)

    if (+props.datetime != +datetime) {
      emit("update:datetime", datetime)
    }
    return datetime
  }
  return null
})

const formattedDatetime = computed(() => {
  return selectedDatetime.value
    ? format(selectedDatetime.value, dateTimeFormat.value)
    : ""
})

const dateSelected = computed(() => !date.value)

function init() {
  if (!props.datetime) return

  let initDateTime
  if (props.datetime instanceof Date) {
    initDateTime = props.datetime
  } else if (typeof props.datetime === "string") {
    initDateTime = parse(props.datetime, dateTimeFormat.value, new Date())
  }

  date.value = initDateTime // Asignamos el objeto Date directamente
  time.value = format(initDateTime, DEFAULT_TIME_FORMAT)
}

function okHandler() {
  resetPicker()
}

function clearHandler() {
  resetPicker()
  date.value = null // Restablecemos a null
  time.value = DEFAULT_TIME
  emit("update:datetime", null)
}

function resetPicker() {
  display.value = false
  activeTab.value = 0
  if (timerRef.value && timerRef.value.selectingHour !== undefined) {
    timerRef.value.selectingHour = true
  }
}

function showTimePicker() {
  activeTab.value = 1
}

onMounted(() => {
  init()
})

watch(
  () => props.datetime,
  () => {
    init()
  }
)
</script>

<template>
  <v-dialog v-model="display" :width="dialogWidth">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="{ ...activatorProps, ...textFieldProps }"
        :disabled="disabled"
        :loading="loading"
        :label="label"
        v-model="formattedDatetime"
        readonly
      >
        <template #progress>
          <slot name="progress">
            <v-progress-linear
              color="primary"
              indeterminate
              absolute
              height="2"
            ></v-progress-linear>
          </slot>
        </template>
      </v-text-field>
    </template>

    <v-card>
      <v-card-text class="px-0 py-0">
        <v-tabs v-model="activeTab" fixed-tabs>
          <v-tab>
            <slot name="dateIcon">
              <v-icon>mdi-calendar</v-icon>
            </slot>
          </v-tab>
          <v-tab :disabled="dateSelected">
            <slot name="timeIcon">
              <v-icon>mdi-clock</v-icon>
            </slot>
          </v-tab>
        </v-tabs>
        <v-window v-model="activeTab">
          <v-window-item>
            <v-date-picker
              v-model="date"
              v-bind="datePickerProps"
              @update:modelValue="showTimePicker"
              :max="props.datePickerProps.max"
              :min="props.datePickerProps.min"
              full-width
            ></v-date-picker>
          </v-window-item>
          <v-window-item>
            <v-time-picker
              ref="timerRef"
              v-model="time"
              format="24hr"
              v-bind="timePickerProps"
              full-width
            ></v-time-picker>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <slot name="actions">
          <v-btn color="grey-lighten-1" variant="text" @click="clearHandler">
            {{ clearText }}
          </v-btn>
          <v-btn color="green-darken-1" variant="text" @click="okHandler">
            {{ okText }}
          </v-btn>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
