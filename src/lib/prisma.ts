
import { PrismaClient } from '@prisma/client'

// This is the raw Prisma client, without Accelerate.
// It is intended ONLY for use in Edge environments like middleware, where the
// standard client with extensions is not compatible.
const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  // eslint-disable-next-line no-var
  var prismaRaw: undefined | ReturnType<typeof prismaClientSingleton>
}

const prismaRaw = globalThis.prismaRaw ?? prismaClientSingleton()

export default prismaRaw

if (process.env.NODE_ENV !== 'production') globalThis.prismaRaw = prismaRaw
