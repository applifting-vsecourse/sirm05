import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  Likes,
  Poll,
  Quack,
  QuackMood,
  QuackRef,
} from '@/modules/quack/domain/quack';
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

// Everything a Quack needs: author, poll, live reply count and who a reply answers.
const quackIncludeRest = {
  user: true,
  _count: { select: { replies: { where: { deletedAt: null } } } },
  parent: {
    select: { deletedAt: true, user: { select: { username: true } } },
  },
} satisfies Prisma.QuackInclude;

type QuackInclude = PollInclude & typeof quackIncludeRest;

const quackInclude = (viewerId: string): QuackInclude => ({
  ...quackIncludeRest,
  ...pollInclude(viewerId),
});

type PrismaFullQuack = Prisma.QuackGetPayload<{ include: QuackInclude }>;

const mapPrismaQuackToDomain = (quack: PrismaFullQuack): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: {
    id: quack.user.id,
    name: quack.user.name,
    username: quack.user.username ?? '',
  },
  poll: mapPrismaPollToDomain(quack),
  parentId: quack.parentId,
  deleted: quack.deletedAt !== null,
  replyCount: quack._count.replies,
  replyTo: quack.parent
    ? {
        username: quack.parent.deletedAt
          ? null
          : (quack.parent.user.username ?? ''),
      }
    : null,
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Without terms: the feed — top-level quacks, plus tombstones that still hold
  // live replies (ADR 0004). With terms: search at any level; every term must
  // appear (case-insensitive) in the text, author name or username.
  // With authorId, only that user's quacks. Tombstones never match a search or Mine.
  async getQuacks(
    viewerId: string,
    terms: string[] = [],
    authorId?: string,
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: {
        userId: authorId,
        parentId: terms.length ? undefined : null,
        ...(terms.length || authorId
          ? { deletedAt: null }
          : {
              OR: [
                { deletedAt: null },
                { replies: { some: { deletedAt: null } } },
              ],
            }),
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
      include: quackInclude(viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: QuackMood;
    pollOptions?: string[];
    userId: string;
    parentId?: string;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        parent: createQuackData.parentId
          ? { connect: { id: createQuackData.parentId } }
          : undefined,
        pollOptions: {
          create: (createQuackData.pollOptions ?? []).map((text, position) => ({
            text,
            position,
          })),
        },
      },
      include: quackInclude(createQuackData.userId),
    });
    return mapPrismaQuackToDomain(quack);
  }

  // Live replies of a quack, oldest first.
  async getReplies(parentId: string, viewerId: string): Promise<Quack[]> {
    const replies = await this.prisma.quack.findMany({
      where: { parentId, deletedAt: null },
      include: quackInclude(viewerId),
      orderBy: { createdAt: 'asc' },
    });
    return replies.map(mapPrismaQuackToDomain);
  }

  // null when the quack doesn't exist.
  async getQuackRef(quackId: string): Promise<QuackRef | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true, parentId: true, deletedAt: true },
    });
    return quack
      ? {
          userId: quack.userId,
          parentId: quack.parentId,
          deleted: quack.deletedAt !== null,
        }
      : null;
  }

  // ADR 0004: wipe the content, keep the row for its replies. Deleting the
  // poll options takes their votes with them (onDelete: Cascade).
  async deleteQuack(quackId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.pollOption.deleteMany({ where: { quackId } }),
      this.prisma.quack.updateMany({
        where: { id: quackId, deletedAt: null },
        data: { text: '', mood: null, deletedAt: new Date() },
      }),
    ]);
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

  // One row per (quack, user): liking twice stores nothing new (ADR 0005).
  async like(_quackId: string, _userId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async unlike(_quackId: string, _userId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async getLikes(_quackId: string, _viewerId: string): Promise<Likes> {
    throw new Error('not implemented');
  }
}
