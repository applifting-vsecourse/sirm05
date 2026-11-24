// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import {
  Poll,
  PollCounts,
  Quack,
  QuackRef,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { QuacksService, toSearchTerms } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  parentId: null,
  deleted: false,
  replyCount: 0,
  replyTo: null,
  ...overrides,
});

const aRef = (overrides: Partial<QuackRef> = {}): QuackRef => ({
  userId: 'u1',
  parentId: null,
  deleted: false,
  ...overrides,
});

const aPoll = (votes = [1, 0], myOptionId: string | null = null): Poll => ({
  options: [
    { id: 'o1', text: 'Pizza', votes: votes[0] },
    { id: 'o2', text: 'Sushi', votes: votes[1] },
  ],
  myOptionId,
});

const user = { id: 'u1' } as Identity;

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(user)).resolves.toEqual(quacks);
    // polls are read for the viewer, so "my vote" is theirs
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', [], undefined);
  });

  it('passes the search to the repository as words', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(user, 'marek pond');

    expect(repository.getQuacks).toHaveBeenCalledWith(
      'u1',
      ['marek', 'pond'],
      undefined,
    );
  });

  it('narrows to the signed-in user’s quacks when mine is set', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(user, 'pond', true);

    expect(repository.getQuacks).toHaveBeenCalledWith('u1', ['pond'], 'u1');
  });

  describe('deleting', () => {
    const setup = (
      ref: QuackRef | null,
    ): { repository: MockProxy<QuackRepository>; service: QuacksService } => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue(ref);
      return { repository, service: new QuacksService(repository) };
    };

    it('deletes the signed-in user’s own quack', async () => {
      const { repository, service } = setup(aRef());

      await service.deleteQuack(user, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it('refuses to delete someone else’s quack', async () => {
      const { repository, service } = setup(aRef({ userId: 'u2' }));

      await expect(service.deleteQuack(user, 'q1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('lets an admin delete someone else’s quack', async () => {
      const { repository, service } = setup(aRef({ userId: 'u2' }));

      await service.deleteQuack({ id: 'a1', role: 'admin' } as Identity, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it('treats a missing quack as not found', async () => {
      const { repository, service } = setup(null);

      await expect(service.deleteQuack(user, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('treats an already deleted quack as not found', async () => {
      const { repository, service } = setup(aRef({ deleted: true }));

      await expect(service.deleteQuack(user, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });
  });

  describe('replies', () => {
    const setup = (
      parent: QuackRef | null,
    ): { repository: MockProxy<QuackRepository>; service: QuacksService } => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue(parent);
      return { repository, service: new QuacksService(repository) };
    };

    it('creates a reply owned by the signed-in user', async () => {
      const { repository, service } = setup(aRef({ userId: 'u2' }));
      const reply = aQuack({ id: 'r1', parentId: 'q1' });
      repository.createQuack.mockResolvedValue(reply);

      await expect(
        service.createReply(user, 'q1', { text: 'hi', mood: 'happy' }),
      ).resolves.toEqual(reply);
      expect(repository.createQuack).toHaveBeenCalledWith({
        text: 'hi',
        mood: 'happy',
        userId: 'u1',
        parentId: 'q1',
      });
    });

    it('refuses to reply to a reply', async () => {
      const { repository, service } = setup(aRef({ parentId: 'q0' }));

      await expect(
        service.createReply(user, 'r1', { text: 'hi' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createQuack).not.toHaveBeenCalled();
    });

    it.each([
      ['missing', null],
      ['deleted', aRef({ deleted: true })],
    ])('refuses to reply to a %s quack', async (_, parent) => {
      const { repository, service } = setup(parent);

      await expect(
        service.createReply(user, 'q1', { text: 'hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.createQuack).not.toHaveBeenCalled();
    });

    it('lists the replies of a deleted quack — its thread stays', async () => {
      const { repository, service } = setup(aRef({ deleted: true }));
      const replies = [aQuack({ id: 'r1', parentId: 'q1' })];
      repository.getReplies.mockResolvedValue(replies);

      await expect(service.getReplies(user, 'q1')).resolves.toEqual(replies);
      expect(repository.getReplies).toHaveBeenCalledWith('q1', 'u1');
    });

    it('treats replies of a missing quack as not found', async () => {
      const { service } = setup(null);

      await expect(service.getReplies(user, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);

    await expect(
      service.createQuack(user, {
        text: 'hello',
        mood: 'happy',
        pollOptions: ['Pizza', 'Sushi'],
      }),
    ).resolves.toEqual(created);
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: 'happy',
      pollOptions: ['Pizza', 'Sushi'],
      userId: 'u1',
    });
  });

  describe('voting', () => {
    const setup = (
      poll: Poll | null = aPoll(),
    ): {
      repository: MockProxy<QuackRepository>;
      service: QuacksService;
      events: unknown[];
    } => {
      const repository = mock<QuackRepository>();
      repository.getPoll.mockResolvedValue(poll);
      const service = new QuacksService(repository);
      const events: unknown[] = [];
      service.pollCountsStream().subscribe((event) => events.push(event));
      return { repository, service, events };
    };

    it('records the vote for the signed-in user and publishes the new counts', async () => {
      const { repository, service, events } = setup();
      repository.getPoll
        .mockResolvedValueOnce(aPoll([1, 0]))
        .mockResolvedValueOnce(aPoll([1, 1], 'o2'));

      await expect(service.vote(user, 'q1', 'o2')).resolves.toEqual(
        aPoll([1, 1], 'o2'),
      );

      expect(repository.vote).toHaveBeenCalledWith('q1', 'u1', 'o2');
      // the stream carries counts only, never who voted
      expect(events).toEqual([
        {
          quackId: 'q1',
          options: [
            { id: 'o1', votes: 1 },
            { id: 'o2', votes: 1 },
          ],
        },
      ]);
    });

    it('rejects an answer that is not part of the poll', async () => {
      const { repository, service, events } = setup();

      await expect(service.vote(user, 'q1', 'other')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.vote).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });

    it('treats a quack without a poll as not found', async () => {
      const { repository, service } = setup(null);

      await expect(service.vote(user, 'q1', 'o1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.withdrawVote(user, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.vote).not.toHaveBeenCalled();
      expect(repository.withdrawVote).not.toHaveBeenCalled();
    });

    it('withdraws the vote of the signed-in user and publishes the new counts', async () => {
      const { repository, service, events } = setup();

      await expect(service.withdrawVote(user, 'q1')).resolves.toEqual(aPoll());

      expect(repository.withdrawVote).toHaveBeenCalledWith('q1', 'u1');
      expect(events).toHaveLength(1);
    });

    it('publishes counts in the order they were read, even if a later read is faster', async () => {
      const { repository, service, events } = setup();
      let releaseFirstRead!: (poll: Poll) => void;
      repository.getPoll
        .mockResolvedValueOnce(aPoll()) // first vote: check
        .mockResolvedValueOnce(aPoll()) // second vote: check
        .mockReturnValueOnce(new Promise((r) => (releaseFirstRead = r)))
        .mockResolvedValueOnce(aPoll([2, 0]));

      const first = service.vote(user, 'q1', 'o1');
      const second = service.vote(user, 'q1', 'o1');
      await new Promise((r) => setImmediate(r));
      expect(events).toHaveLength(0);

      releaseFirstRead(aPoll([1, 0]));
      await Promise.all([first, second]);

      expect(events).toEqual([
        { quackId: 'q1', options: aPoll([1, 0]).options.map(countsOnly) },
        { quackId: 'q1', options: aPoll([2, 0]).options.map(countsOnly) },
      ]);
    });
  });
});

const countsOnly = ({
  id,
  votes,
}: PollCounts['options'][number]): PollCounts['options'][number] => ({
  id,
  votes,
});

describe('toSearchTerms', () => {
  it.each([
    [undefined, []],
    ['', []],
    ['   ', []],
    ['  pond  ', ['pond']],
    ['marek   pond', ['marek', 'pond']],
    ['@marek', ['marek']],
    ['@ pond', ['pond']],
    ['50%_off', ['50%_off']],
  ])('%p -> %p', (search, terms) => {
    expect(toSearchTerms(search)).toEqual(terms);
  });
});

// Cases R1–R6: docs/user-stories/quack-likes.cases.md
describe('QuacksService likes', () => {
  const likes = { likeCount: 1, likedByMe: true };
  let repository: MockProxy<QuackRepository>;
  let service: QuacksService;

  beforeEach(() => {
    repository = mock<QuackRepository>();
    repository.getLikes.mockResolvedValue(likes);
    service = new QuacksService(repository);
  });

  it('R1: liking a quack that does not exist is 404 and stores nothing', async () => {
    repository.getQuackRef.mockResolvedValue(null);

    await expect(service.likeQuack(user, 'q1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.like).not.toHaveBeenCalled();
  });

  it('R2: liking a deleted quack is 404 and stores nothing', async () => {
    repository.getQuackRef.mockResolvedValue(aRef({ deleted: true }));

    await expect(service.likeQuack(user, 'q1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.like).not.toHaveBeenCalled();
  });

  it.each([
    ['does not exist', null],
    ['is deleted', aRef({ deleted: true })],
  ])(
    'R3: taking back a like on a quack that %s is 404 and removes nothing',
    async (_, ref) => {
      repository.getQuackRef.mockResolvedValue(ref);

      await expect(service.unlikeQuack(user, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.unlike).not.toHaveBeenCalled();
    },
  );

  it('R4: liking stores the like for the session user and returns the likes', async () => {
    repository.getQuackRef.mockResolvedValue(aRef({ userId: 'someone-else' }));

    await expect(service.likeQuack(user, 'q1')).resolves.toEqual(likes);
    expect(repository.like).toHaveBeenCalledWith('q1', user.id);
    expect(repository.getLikes).toHaveBeenCalledWith('q1', user.id);
  });

  it('R5: I can like my own quack', async () => {
    repository.getQuackRef.mockResolvedValue(aRef({ userId: user.id }));

    await expect(service.likeQuack(user, 'q1')).resolves.toEqual(likes);
    expect(repository.like).toHaveBeenCalledWith('q1', user.id);
  });

  it('R6: taking a like back removes the session user like and returns the likes', async () => {
    const after = { likeCount: 0, likedByMe: false };
    repository.getQuackRef.mockResolvedValue(aRef());
    repository.getLikes.mockResolvedValue(after);

    await expect(service.unlikeQuack(user, 'q1')).resolves.toEqual(after);
    expect(repository.unlike).toHaveBeenCalledWith('q1', user.id);
  });
});
