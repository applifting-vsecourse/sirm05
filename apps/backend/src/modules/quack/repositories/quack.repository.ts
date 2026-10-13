import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Poll, Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

// Everything a Poll needs, read for one viewer: options with vote counts, and
// at most one vote (theirs).
const pollOptionsInclude = {
  orderBy: { position: 'asc' },
  include: { _count: { select: { votes: true } } },
} satisfies Prisma.Quack$pollOptionsArgs;

type PollInclude = {
  pollOptions: typeof pollOptionsInclude;
  pollVotes: { where: { userId: string }; select: { optionId: true } };
};

const pollInclude = (viewerId: string): PollInclude => ({
  pollOptions: pollOptionsInclude,
  pollVotes: { where: { userId: viewerId }, select: { optionId: true } },
});

type PrismaPoll = Prisma.QuackGetPayload<{ include: PollInclude }>;

const mapPrismaPollToDomain = (quack: PrismaPoll): Poll | null =>
  quack.pollOptions.length === 0
    ? null
    : {
        options: quack.pollOptions.map((option) => ({
          id: option.id,
          text: option.text,
          votes: option._count.votes,
        })),
        myOptionId: quack.pollVotes[0]?.optionId ?? null,
      };

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & PrismaPoll & { user?: PrismaUser },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll: mapPrismaPollToDomain(quack),
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Every term must appear (case-insensitive) in the text, author name or username.
  async getQuacks(viewerId: string, terms: string[] = []): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: {
        AND: terms.map((term) => {
          // Prisma passes `contains` to ILIKE unescaped, so % and _ would act as wildcards.
          const escaped = term.replace(/[\\%_]/g, '\\$&');
          const contains = { contains: escaped, mode: 'insensitive' } as const;
          return {
            OR: [
              { text: contains },
              { user: { name: contains } },
              { user: { username: contains } },
            ],
          };
        }),
      },
      include: { user: true, ...pollInclude(viewerId) },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: QuackMood;
    pollOptions?: string[];
    userId: string;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: {
          create: (createQuackData.pollOptions ?? []).map((text, position) => ({
            text,
            position,
          })),
        },
      },
      include: { user: true, ...pollInclude(createQuackData.userId) },
    });
    return mapPrismaQuackToDomain(quack);
  }

  // null when the quack doesn't exist or has no poll.
  async getPoll(quackId: string, viewerId: string): Promise<Poll | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      include: pollInclude(viewerId),
    });
    return quack ? mapPrismaPollToDomain(quack) : null;
  }

  // The (quackId, userId) primary key makes this an atomic ON CONFLICT upsert:
  // repeated or simultaneous votes never count a person twice.
  async vote(quackId: string, userId: string, optionId: string): Promise<void> {
    await this.prisma.pollVote.upsert({
      where: { quackId_userId: { quackId, userId } },
      create: { quackId, userId, optionId },
      update: { optionId },
    });
  }

  async withdrawVote(quackId: string, userId: string): Promise<void> {
    await this.prisma.pollVote.deleteMany({ where: { quackId, userId } });
  }
}
