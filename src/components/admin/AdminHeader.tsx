import { auth } from "@/auth"

export async function AdminHeader({ title }: { title: string }) {
  const session = await auth()
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined

  return (
    <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center justify-between">
      <h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">{title}</h1>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono text-[#ccc]">{user.name}</div>
            <div className="text-[10px] font-mono text-[#444]">{user.role?.replace("_", " ")}</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#00ff41]/20 border border-[#00ff41]/30 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-[#00ff41]">
              {user.name?.charAt(0).toUpperCase() ?? "A"}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
