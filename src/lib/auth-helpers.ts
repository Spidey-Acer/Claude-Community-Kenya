import { auth } from "@/auth"

/**
 * Returns the user id of the current session, or null if not signed in.
 *
 * Used by public submission endpoints (ideas, projects, community, speaker,
 * volunteer, demo) so they attach a userId FK when the submitter is logged in.
 * Submissions remain available to anonymous users — userId is optional.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth()
  const id = (session?.user as { id?: string } | undefined)?.id
  return id && id.length > 0 ? id : null
}
