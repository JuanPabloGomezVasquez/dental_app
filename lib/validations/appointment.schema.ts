import { z } from "zod"

export const createAppointmentSchema = z.object({
  patientId:   z.string().min(1, "Paciente requerido"),
  doctorId:    z.string().min(1, "Doctor requerido"),
  procedureId: z.string().min(1, "Procedimiento requerido"),
  date:        z.string().min(1, "Fecha y hora requeridas"),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

export type AppointmentWithRelations = {
  id:            string
  patientId:     string
  doctorId:      string
  procedureId:   string
  date:          string
  reminderJobId: string | null
  createdAt:     string
  updatedAt:     string
  patient:       { firstName: string; lastName: string }
  doctor:        { name: string }
  procedure:     { name: string; cupsCode?: string | null }
}
