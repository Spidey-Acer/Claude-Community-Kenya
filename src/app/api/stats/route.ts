import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })

    if (!settings) {
      // Fallback defaults if no DB row exists yet
      return NextResponse.json(
        {
          success: true,
          data: {
            discordMembers: 78,
            whatsappMembers: 96,
            linkedinMembers: 61,
            totalMembers: 235,
            eventsHeld: 5,
            citiesActive: ["Nairobi", "Mombasa"],
            resourceCount: 33,
            websiteStatus: "live",
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    }

    const citiesActive = Array.isArray(settings.citiesActive)
      ? settings.citiesActive as string[]
      : JSON.parse(settings.citiesActive as string) as string[]

    return NextResponse.json(
      {
        success: true,
        data: {
          discordMembers: settings.discordMembers,
          whatsappMembers: settings.whatsappMembers,
          linkedinMembers: settings.linkedinMembers,
          totalMembers:
            settings.discordMembers +
            settings.whatsappMembers +
            settings.linkedinMembers,
          eventsHeld: settings.eventsHeld,
          citiesActive,
          resourceCount: settings.resourceCount,
          websiteStatus: settings.websiteStatus,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("[STATS] Failed to fetch stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
