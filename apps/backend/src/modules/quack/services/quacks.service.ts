import {
  Likes,
  Poll,
  PollCounts,
  Quack,
  QuackMood,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

// Splits a search into words; a leading "@" is ignored so "@marek" = "marek".
export const toSearchTerms = (search = ''): string[] =>
  search
    .split(/\s+/)
    .map((word) => word.replace(/^@+/, ''))
    .filter(Boolean);

@Injectable()
export class QuacksService {
  private readonly pollCounts = new Subject<PollCounts>();
  // Reads for the live stream run one at a time, so a later event never
  // carries older counts than an earlier one (see ADR 0002).
  private countsQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    viewer: Identity,
    search?: string,
    mine = false,
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks(
      viewer.id,
      toSearchTerms(search),
      mine ? viewer.id : undefined,
    );
  }

  // A deleted quack's thread stays readable — that's why it's a tombstone.
  async getReplies(viewer: Identity, quackId: string): Promise<Quack[]> {
    if (!(await this.quackRepository.getQuackRef(quackId))) {
      throw new NotFoundException('Quack not found');
    }
    return this.quackRepository.getReplies(quackId, viewer.id);
  }

  // Only the author or a moderator (admin) may delete — checked here, so calling
  // the API directly doesn't get around it. A tombstone counts as gone (ADR 0004).
  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const quack = await this.quackRepository.getQuackRef(quackId);
    if (!quack || quack.deleted) throw new NotFoundException('Quack not found');
    if (quack.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    await this.quackRepository.deleteQuack(quackId);
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood; pollOptions?: string[] },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      pollOptions: quackData.pollOptions,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  // One level only: a reply can't be replied to. No polls in replies.
  async createReply(
    user: Identity,
    parentId: string,
    replyData: { text: string; mood?: QuackMood },
  ): Promise<Quack> {
    const parent = await this.quackRepository.getQuackRef(parentId);
    if (!parent || parent.deleted) {
      throw new NotFoundException('Quack not found');
    }
    if (parent.parentId) {
      throw new BadRequestException(
        'You can only reply to a quack, not a reply',
      );
    }
    return this.quackRepository.createQuack({
      text: replyData.text,
      mood: replyData.mood,
      userId: user.id,
      parentId,
    });
  }

  async vote(user: Identity, quackId: string, optionId: string): Promise<Poll> {
    const poll = await this.getPollOrThrow(quackId, user);
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException('That answer is not part of this poll');
    }
    await this.quackRepository.vote(quackId, user.id, optionId);
    return this.publishCounts(quackId, user);
  }

  async withdrawVote(user: Identity, quackId: string): Promise<Poll> {
    await this.getPollOrThrow(quackId, user);
    await this.quackRepository.withdrawVote(quackId, user.id);
    return this.publishCounts(quackId, user);
  }

  // Anyone signed in may like any live quack, their own and replies included.
  async likeQuack(user: Identity, quackId: string): Promise<Likes> {
    await this.getLiveQuackOrThrow(quackId);
    await this.quackRepository.like(quackId, user.id);
    return this.quackRepository.getLikes(quackId, user.id);
  }

  async unlikeQuack(user: Identity, quackId: string): Promise<Likes> {
    await this.getLiveQuackOrThrow(quackId);
    await this.quackRepository.unlike(quackId, user.id);
    return this.quackRepository.getLikes(quackId, user.id);
  }

  pollCountsStream(): Observable<PollCounts> {
    return this.pollCounts.asObservable();
  }

  private async getLiveQuackOrThrow(quackId: string): Promise<void> {
    const quack = await this.quackRepository.getQuackRef(quackId);
    if (!quack || quack.deleted) throw new NotFoundException('Quack not found');
  }

  private async getPollOrThrow(quackId: string, user: Identity): Promise<Poll> {
    const poll = await this.quackRepository.getPoll(quackId, user.id);
    if (!poll) throw new NotFoundException('Poll not found');
    return poll;
  }

  private publishCounts(quackId: string, user: Identity): Promise<Poll> {
    const read = this.countsQueue.then(() =>
      this.getPollOrThrow(quackId, user),
    );
    this.countsQueue = read.catch(() => undefined);
    return read.then((poll) => {
      this.pollCounts.next({
        quackId,
        options: poll.options.map(({ id, votes }) => ({ id, votes })),
      });
      return poll;
    });
  }
}
