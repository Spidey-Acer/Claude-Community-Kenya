import bcrypt from "bcryptjs"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD || "changeme123!"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const hash = await bcrypt.hash(NEW_PASSWORD, 12)
  const user = await prisma.user.update({
    where: { email: "claudecommunitykenya@gmail.com" },
    data: { passwordHash: hash },
  })

  console.log("Password reset for:", user.email)
  console.log("New password:", NEW_PASSWORD)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
