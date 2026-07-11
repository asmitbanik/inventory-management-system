import { prisma } from './prisma.js';

export async function acceptPendingInvites(userId: string, email: string) {
  const pendingInvites = await prisma.orgInvite.findMany({ where: { email } });
  for (const invite of pendingInvites) {
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: { userId, organizationId: invite.organizationId },
      },
      update: {},
      create: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });
    await prisma.orgInvite.delete({ where: { id: invite.id } });
  }
}
