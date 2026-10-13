import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

const errorsFor = (overrides: object): Promise<ValidationError[]> =>
  validate(
    plainToInstance(UpdateProfileDto, {
      username: 'marek.s',
      name: 'Marek',
      ...overrides,
    }),
  );

describe('UpdateProfileDto', () => {
  it.each([
    {},
    { username: 'abc' },
    { username: 'a'.repeat(30) },
    { username: 'Marek_S.99' },
    { bio: 'x'.repeat(160) },
    { bio: null, defaultMood: null },
    { defaultMood: 'silly' },
  ])('accepts %p', async (overrides) => {
    await expect(errorsFor(overrides)).resolves.toHaveLength(0);
  });

  it.each([
    { username: 'ab' },
    { username: 'a'.repeat(31) },
    { username: 'marek s' },
    { username: 'marek-s' },
    { username: 'žluťák' },
    { name: '   ' },
    { bio: 'x'.repeat(161) },
    { defaultMood: 'excited' },
  ])('rejects %p', async (overrides) => {
    await expect(errorsFor(overrides)).resolves.not.toHaveLength(0);
  });
});
