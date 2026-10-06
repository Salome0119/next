import "../globals.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-slate-900 text-slate-100">
      {children}
    </div>
  );
}