
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// This is the accelerated Prisma client for server-side application logic.
// It should NOT be imported into any component or file that might be used in an Edge environment.
const prismaClientSingleton = () => {
  return new PrismaClient().$extends(withAccelerate())
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
