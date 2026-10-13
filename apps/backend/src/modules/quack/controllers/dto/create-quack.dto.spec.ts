import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const errorsFor = (body: object): Promise<ValidationError[]> =>
  validate(plainToInstance(CreateQuackDto, body));

describe('CreateQuackDto', () => {
  it.each([undefined, null, 'happy', 'sad', 'angry', 'silly'])(
    'accepts mood %p',
    async (mood) => {
      await expect(errorsFor({ text: 'hi', mood })).resolves.toHaveLength(0);
    },
  );

  it.each(['excited', '', 1])('rejects mood %p', async (mood) => {
    await expect(errorsFor({ text: 'hi', mood })).resolves.not.toHaveLength(0);
  });
});

describe('CreateQuackDto pollOptions', () => {
  const answers = (n: number): string[] =>
    Array.from({ length: n }, (_, i) => `answer ${i}`);

  it.each([undefined, answers(2), answers(10), ['a'.repeat(50), 'b']])(
    'accepts %p',
    async (pollOptions) => {
      await expect(
        errorsFor({ text: 'Lunch?', pollOptions }),
      ).resolves.toHaveLength(0);
    },
  );

  it.each([
    ['one answer', ['Pizza']],
    ['eleven answers', answers(11)],
    ['an empty answer', ['Pizza', '']],
    ['a blank answer', ['Pizza', '   ']],
    ['a 51-character answer', ['a'.repeat(51), 'b']],
    ['duplicates ignoring case and spaces', ['Pizza', ' pizza ']],
    ['a non-string', ['Pizza', 1]],
    ['a non-array', 'Pizza'],
  ])('rejects %s', async (_, pollOptions) => {
    await expect(
      errorsFor({ text: 'Lunch?', pollOptions }),
    ).resolves.not.toHaveLength(0);
  });

  it('trims answers', () => {
    const dto = plainToInstance(CreateQuackDto, {
      text: 'Lunch?',
      pollOptions: [' Pizza ', 'Sushi'],
    });
    expect(dto.pollOptions).toEqual(['Pizza', 'Sushi']);
  });
});
