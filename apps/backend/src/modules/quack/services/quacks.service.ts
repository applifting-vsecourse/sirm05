import {
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

  // Only the author or a moderator (admin) may delete — checked here, so calling
  // the API directly doesn't get around it.
  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.getQuackAuthorId(quackId);
    if (!authorId) throw new NotFoundException('Quack not found');
    if (authorId !== user.id && user.role !== 'admin') {
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

  pollCountsStream(): Observable<PollCounts> {
    return this.pollCounts.asObservable();
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
