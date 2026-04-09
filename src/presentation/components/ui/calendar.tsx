'use client'

import * as React from 'react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'

import 'react-day-picker/style.css'

/**
 * Wrapper do DayPicker (react-day-picker v9) com folha de estilo base.
 * Use para outros modos (single, multiple) sem duplicar o import de CSS.
 */
function Calendar(props: DayPickerProps) {
  return <DayPicker {...props} />
}

export { Calendar, DayPicker, type DayPickerProps }
export type { DateRange } from 'react-day-picker'
