import { appointmentsService } from "@/lib/services/appointments.service";
import { patientsService } from "@/lib/services/patients.service";

export type RipsConsulta = {
  codPrestador: string;
  fechaInicioAtencion: string;
  numAutorizacion: null;
  codConsulta: string;
  modalidadGrupoServicioTecSal: "01";
  grupoServicios: "02";
  codServicio: 601;
  finalidadTecnologiaSalud: "27";
  causaMotivoAtencion: "26";
  codDiagnosticoPrincipal: "Z01.2";
  condicionDestinoUsuarioEgreso: "21";
  numFEVPagoModerador: 0;
  valorPagoModerador: 0;
};

export type RipsUsuario = {
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  codPaisResidencia: "170";
  codMunicipioResidencia: string;
  codZonaTerritorialResidencia: "01";
  fechaNacimiento: string;
  codSexo: "3";
  servicios: { consultas: RipsConsulta[] };
};

export type RipsJson = {
  numDocumentoIdObligado: string;
  numFactura: string;
  tipoNota: null;
  consecutivo: number;
  usuarios: RipsUsuario[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  return value;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "1900-01-01";
  return date.toISOString().split("T")[0]!;
}

export async function buildRipsJson(dateFrom: Date, dateTo: Date): Promise<RipsJson> {
  const nitConsultorio = getRequiredEnv("NIT_CONSULTORIO");
  const municipioCode = getRequiredEnv("RIPS_MUNICIPIO_CODE");
  const codPrestador = getRequiredEnv("RIPS_COD_PRESTADOR");

  const appointments = await appointmentsService.listByDateRange(dateFrom, dateTo);

  const patientIds = [...new Set(appointments.map((a) => a.patientId))];
  const patientMap = new Map(
    await Promise.all(
      patientIds.map(async (pid) => {
        try {
          const p = await patientsService.get(pid);
          return [pid, p] as const;
        } catch {
          return [pid, null] as const;
        }
      })
    )
  );

  const usuarioMap = new Map<string, RipsUsuario>();

  for (const apt of appointments) {
    const patient = patientMap.get(apt.patientId);
    if (!patient) continue;

    if (!usuarioMap.has(apt.patientId)) {
      usuarioMap.set(apt.patientId, {
        tipoDocumentoIdentificacion: "CC",
        numDocumentoIdentificacion: patient.idNumber,
        codPaisResidencia: "170",
        codMunicipioResidencia: municipioCode,
        codZonaTerritorialResidencia: "01",
        fechaNacimiento: formatDate(patient.birthDate),
        codSexo: "3",
        servicios: { consultas: [] },
      });
    }

    const usuario = usuarioMap.get(apt.patientId)!;
    usuario.servicios.consultas.push({
      codPrestador,
      fechaInicioAtencion: apt.date,
      numAutorizacion: null,
      codConsulta: apt.procedure.cupsCode ?? "89.01",
      modalidadGrupoServicioTecSal: "01",
      grupoServicios: "02",
      codServicio: 601,
      finalidadTecnologiaSalud: "27",
      causaMotivoAtencion: "26",
      codDiagnosticoPrincipal: "Z01.2",
      condicionDestinoUsuarioEgreso: "21",
      numFEVPagoModerador: 0,
      valorPagoModerador: 0,
    });
  }

  const numFactura = `${dateFrom.getFullYear()}${String(dateFrom.getMonth() + 1).padStart(2, "0")}001`;

  return {
    numDocumentoIdObligado: nitConsultorio,
    numFactura,
    tipoNota: null,
    consecutivo: 1,
    usuarios: [...usuarioMap.values()],
  };
}
