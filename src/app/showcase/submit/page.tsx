import { getSessionUserId } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { getEvents } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { ShowcaseComposer, type ComposerEventOption } from "@/components/karibu/showcase/ShowcaseComposer"

/**
 * /showcase/submit — the showcase composer route.
 *
 * The auth/verification gate runs server-side (same facts the API re-checks
 * on every write: signed in, active, emailVerified) so a guest or unverified
 * member never sees the form flash before being told they can't use it.
 * ShowcaseComposer renders the three states itself — see its `authState` prop.
 */

export default async function ShowcaseSubmitPage() {
  const userId = await getSessionUserId()

  if (!userId) {
    return (
      <>
        <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Showcase", url: "/showcase" }, { name: "Submit" }]} />
        <ShowcaseComposer authState={{ status: "guest" }} />
      </>
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, emailVerified: true },
  })

  if (!user?.active || !user.emailVerified) {
    return (
      <>
        <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Showcase", url: "/showcase" }, { name: "Submit" }]} />
        <ShowcaseComposer authState={{ status: "unverified" }} />
      </>
    )
  }

  // All events, newest first — a post can point at a past event it grew out
  // of just as easily as one it's launching at. `id` is optional on the
  // shared Event type (static/legacy data can lack one) but always present
  // on a DB row, which getEvents() exclusively returns.
  const events = await getEvents().catch(() => [])
  const eventOptions: ComposerEventOption[] = events.flatMap((e) =>
    e.id ? [{ id: e.id, title: e.title, date: e.date, city: e.city }] : [],
  )

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Showcase", url: "/showcase" }, { name: "Submit" }]} />
      <ShowcaseComposer authState={{ status: "ready", events: eventOptions }} />
    </>
  )
}
