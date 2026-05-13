"use client";

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfExportButtonProps } from "./pdf-export-button";
import type { ClinicalNote } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 13, marginBottom: 6, marginTop: 14 },
  text: { fontSize: 10, marginBottom: 3, color: "#374151" },
  noteHeader: { fontSize: 10, marginBottom: 2, color: "#1d4ed8" },
});

function NoteItem({ note }: { note: ClinicalNote }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.noteHeader}>
        [{note.type}] {new Date(note.createdAt).toLocaleDateString("es-CO")}
      </Text>
      <Text style={styles.text}>{note.content}</Text>
    </View>
  );
}

function HistoryDocument({ patient, history }: PdfExportButtonProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.subtitle}>CC: {patient.idNumber}</Text>
        {history.background ? (
          <View>
            <Text style={styles.sectionTitle}>Antecedentes</Text>
            <Text style={styles.text}>{history.background}</Text>
          </View>
        ) : null}
        {history.notes.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Notas Clínicas</Text>
            {history.notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function PdfButtonInner({ patient, history }: PdfExportButtonProps) {
  return (
    <PDFDownloadLink
      document={<HistoryDocument patient={patient} history={history} />}
      fileName={`historia-clinica-${patient.idNumber}.pdf`}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
    >
      {({ loading }: { loading: boolean }) => (loading ? "Generando..." : "Exportar HC")}
    </PDFDownloadLink>
  );
}
