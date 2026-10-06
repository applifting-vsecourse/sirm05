import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

// Splits a search into words; a leading "@" is ignored so "@marek" = "marek".
export const toSearchTerms = (search = ''): string[] =>
  search
    .split(/\s+/)
    .map((word) => word.replace(/^@+/, ''))
    .filter(Boolean);

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(search?: string): Promise<Quack[]> {
    return this.quackRepository.getQuacks(toSearchTerms(search));
  }

  async createQuack(
    user: Identity,
    quackData: { text: string },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
