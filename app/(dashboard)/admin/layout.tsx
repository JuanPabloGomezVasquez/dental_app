import { AdminTabNav } from "@/components/admin/admin-tab-nav";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 pt-6 pb-0">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">Administración</h1>
        </div>
        <AdminTabNav />
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">{children}</div>
    </div>
  );
}
