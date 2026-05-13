"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CajaRecordWithDetails } from "@/lib/validations/caja.schema";
import type { CajaPage } from "@/lib/services/caja.service";
import { CajaTable } from "@/components/caja/caja-table";
import { CajaForm } from "@/components/caja/caja-form";
import { CajaDetail } from "@/components/caja/caja-detail";

interface CajaPageClientProps {
  data: CajaPage;
  search: string;
  status: string;
}

export function CajaPageClient({ data, search, status }: CajaPageClientProps) {
  const router = useRouter();
  const [records, setRecords] = useState(data.records);
  const [total, setTotal] = useState(data.total);
  const [selectedRecord, setSelectedRecord] = useState<CajaRecordWithDetails | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    setRecords(data.records);
    setTotal(data.total);
  }, [data]);

  function handleSearch(searchValue: string) {
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (status) params.set("status", status);
    params.set("page", "1");
    router.replace(`/caja?${params.toString()}`);
  }

  function handleFilterStatus(newStatus: string | null) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (newStatus) params.set("status", newStatus);
    params.set("page", "1");
    router.replace(`/caja?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(page));
    router.replace(`/caja?${params.toString()}`);
  }

  function handleFormSuccess(record: CajaRecordWithDetails) {
    setRecords((prev) => [record, ...prev]);
    setTotal((prev) => prev + 1);
    router.refresh();
  }

  function handlePaymentSuccess(updated: CajaRecordWithDetails) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} registro{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Nuevo registro
        </button>
      </div>

      <CajaTable
        records={records}
        total={total}
        page={data.page}
        pages={data.pages}
        onSearch={handleSearch}
        onFilterStatus={handleFilterStatus}
        onPageChange={handlePageChange}
        onViewDetail={(record) => {
          setSelectedRecord(record);
          setIsDetailOpen(true);
        }}
      />

      <CajaForm
        open={isFormOpen}
        onSuccess={handleFormSuccess}
        onClose={() => setIsFormOpen(false)}
      />

      <CajaDetail
        open={isDetailOpen}
        record={selectedRecord}
        onPaymentSuccess={handlePaymentSuccess}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
