<script setup>
import VueCal from "vue-cal"
import "vue-cal/dist/vuecal.css"
import AutoFormDialog from "./AutoFormDialog.vue"
import useDialogs from "../../Composables/LaravelAutoCrud/useDialogs"
import {
  formatCalendarDate,
  formatDateTime,
} from "../../Utils/LaravelAutoCrud/dates"
import { ref, watch } from "vue"
import { generateItemTitle } from "../../Utils/LaravelAutoCrud/datatableUtils"
import { useAutoCrud } from "../../Adapters/LaravelAutoCrud/context"

const autoCrud = useAutoCrud()

const props = defineProps(["model"])
const endPoint = props.model.endPoint
const currentDateInterval = ref({
  startDate: null,
  endDate: null,
})

const { showFormDialog, formDialogType, item, openDialog } = useDialogs()

const events = ref([])

const changeCurrentMonth = (event) => {
  if (event.view === "month" || event.view === "week" || event.view === "day") {
    currentDateInterval.value.startDate = event.startDate.toISOString()
    currentDateInterval.value.endDate = event.endDate.toISOString()
    loadEvents()
  }
}

const handleDialog = (date, type, item) => {
  if (
    activeView.value === "month" ||
    activeView.value === "week" ||
    activeView.value === "day"
  ) {
    if (type === "create") {
      if (date) {
        let createItem = {}
        createItem[props.model.calendarFields.start] = formatCalendarDate(
          date,
          true
        )

        createItem[props.model.calendarFields.end] = formatCalendarDate(
          date,
          true
        )

        openDialog("create", createItem)
      } else {
        openDialog("create")
      }
    } else if (type === "edit") {
      openDialog("edit", item)
    }
  }
}

function getEventClass(event, currentDate) {
  const eventStart = getLocalISODate(formatDateTime(event.start))
  const eventEnd = getLocalISODate(formatDateTime(event.end))

  if (eventStart === eventEnd) {
    return "event-single-day"
  } else if (currentDate === eventStart) {
    return "event-custom-start"
  } else if (currentDate === eventEnd) {
    return "event-custom-end"
  } else {
    return "event-custom-middle"
  }
}

const loadEvents = () => {
  autoCrud
    .post(`${endPoint}/load-calendar-events`, {
      start: currentDateInterval.value.startDate,
      end: currentDateInterval.value.endDate,
    })
    .then((response) => {
      const eventsData = response.data.eventsData ?? response.data
      let rawEvents = eventsData.items

      //Ordenar los eventos por created_at
      rawEvents.sort(
        (a, b) => new Date(a.item.created_at) - new Date(b.item.created_at)
      )

      if (activeView.value !== "month") {
        events.value = eventsData.items
        events.value = events.value.map((event) => {
          event.start = formatDateTime(event.start)
          event.end = formatDateTime(event.end)
          event.title = generateItemTitle(event.title, event.item)
          return event
        })
        return
      }

      // Obtener el rango de fechas visibles
      const startDate = new Date(currentDateInterval.value.startDate)
      const endDate = new Date(currentDateInterval.value.endDate)

      // Crear un mapa para almacenar las posiciones ocupadas en cada día
      const positionsPerDay = {}

      // Inicializar el mapa con fechas vacías
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = getLocalISODate(d)
        positionsPerDay[dateStr] = {}
      }

      // Procesar los eventos para asignar posiciones
      rawEvents.forEach((event) => {
        const eventStart = formatDateTime(event.start)
        const eventEnd = formatDateTime(event.end)
        const eventDates = []

        // Obtener todas las fechas que abarca el evento
        for (
          let d = eventStart;
          getLocalISODate(d) <= getLocalISODate(eventEnd);
          d.setDate(d.getDate() + 1)
        ) {
          eventDates.push(getLocalISODate(d))
        }

        // Encontrar la posición disponible más baja que esté libre en todas las fechas del evento
        let position = 0
        let foundPosition = false
        while (!foundPosition) {
          // Verificar si la posición está libre en todas las fechas
          const positionAvailable = eventDates.every(
            (date) => !positionsPerDay[date]?.[position]
          )

          if (positionAvailable) {
            // Asignar la posición al evento en todas las fechas
            eventDates.forEach((date) => {
              if (positionsPerDay[date]) {
                positionsPerDay[date][position] = event
              }
            })
            event.position = position
            foundPosition = true
          } else {
            position++
          }
        }
      })

      // Calcular el número máximo de superposiciones
      let maxOverlap = 0
      for (let date in positionsPerDay) {
        const positionsCount = Object.keys(positionsPerDay[date]).length
        if (positionsCount > maxOverlap) {
          maxOverlap = positionsCount
        }
      }

      // Construir los eventos finales para vue-cal
      const finalEvents = []

      for (let date in positionsPerDay) {
        const dayPositions = positionsPerDay[date]
        if (Object.keys(dayPositions).length !== 0) {
          for (let i = 0; i < maxOverlap; i++) {
            const event = dayPositions[i]
            if (event) {
              const styleClass = getEventClass(event, date)

              finalEvents.push({
                ...event,
                start: date,
                end: date,
                originalStart: event.start,
                originalEnd: event.end,
                title: generateItemTitle(event.title, event.item),
                position: i,
                class: styleClass + " " + event.class,
              })
            } else {
              // Agregar placeholder
              finalEvents.push({
                start: date,
                end: date,
                title: "null",
                class: "placeholder",
                position: i,
                draggable: false,
                resizable: false,
                editable: false,
                isPlaceholder: true,
              })
            }
          }
        }
      }

      // Ordenar finalEvents por fecha y posición para asegurar el orden correcto
      finalEvents.sort((a, b) => {
        if (a.start < b.start) return -1
        if (a.start > b.start) return 1
        return a.position - b.position
      })

      events.value = finalEvents
    })
}

watch(showFormDialog, (value) => {
  if (!value) {
    loadEvents()
  }
})

const activeView = ref("month")

const getLocalISODate = (date) => {
  const localDate = new Date(date)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
  return localDate.toISOString().split("T")[0]
}
</script>

<template>
  <auto-form-dialog
    v-model:show="showFormDialog"
    v-model:type="formDialogType"
    v-model:item="item"
    :model="props.model"
  >
  </auto-form-dialog>
  <vue-cal
    class="ma-5"
    events-on-month-view="short"
    v-model:active-view="activeView"
    @view-change="changeCurrentMonth"
    @ready="changeCurrentMonth"
    :events="events"
    :time="true"
    locale="es"
    :onEventClick="(item) => handleDialog(null, 'edit', item.item)"
    @cell-click="($event) => handleDialog($event, 'create')"
  ></vue-cal>
</template>

<style>
.vuecal__header,
.vuecal__menu,
.vuecal__title-bar,
.vuecal__title button,
.vuecal__arrow {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
}

.vuecal__header,
.vuecal__menu {
  border-radius: 4px 4px 0px 0px;
}

.vuecal__body,
.vuecal__weekdays-headings {
  background: rgba(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface));
}

.vuecal__body {
  border-radius: 0px 0px 4px 4px;
}

.vuecal__cell--out-of-scope {
  color: gray;
}

.vuecal {
  border-radius: 4px;
  border: thin solid rgba(var(--v-theme-on-surface));
  height: 807px;
}

.vuecal__event {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
  border-right: thin solid rgba(var(--v-theme-on-surface));
  border-left: thin solid rgba(var(--v-theme-on-surface));
}

.vuecal__event.event-single-day {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
  border: thin solid rgba(var(--v-theme-on-surface));
  border-radius: 8px;
}

.vuecal__event.event-custom-middle {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
  border-top: thin solid rgba(var(--v-theme-on-surface));
  border-bottom: thin solid rgba(var(--v-theme-on-surface));
  border-radius: 0px;
  border-right: 0px;
  border-left: 0px;
}

.vuecal__event.event-custom-start {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
  border-top: thin solid rgba(var(--v-theme-on-surface));
  border-bottom: thin solid rgba(var(--v-theme-on-surface));
  border-left: thin solid rgba(var(--v-theme-on-surface));
  border-radius: 8px 0 0 8px;
  border-right: 0px;
}

.vuecal__event.event-custom-end {
  background: rgba(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface));
  border-top: thin solid rgba(var(--v-theme-on-surface));
  border-bottom: thin solid rgba(var(--v-theme-on-surface));
  border-right: thin solid rgba(var(--v-theme-on-surface));
  border-radius: 0 8px 8px 0;
  border-left: 0px;
}

.vuecal__time-column .vuecal__time-cell {
  text-align: center;
  padding-right: 0px;
}

.placeholder {
  visibility: hidden;
  border: thin solid black;
}
</style>
