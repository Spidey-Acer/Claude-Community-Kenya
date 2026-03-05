import { auth } from "@/auth"

export async function AdminHeader({ title }: { title: string }) {
  const session = await auth()
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined

  return (
    <header className="h-14 border-b border-border-default bg-bg-secondary px-6 flex items-center justify-between">
      <h1 className="text-sm font-mono font-semibold text-text-primary tracking-wide">{title}</h1>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono text-text-secondary">{user.name}</div>
            <div className="text-[10px] font-mono text-text-dim">{user.role?.replace("_", " ")}</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-green-primary/20 border border-green-primary/30 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-green-primary">
              {user.name?.charAt(0).toUpperCase() ?? "A"}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
