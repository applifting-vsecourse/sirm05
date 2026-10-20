import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchQuacksDto } from './search-quacks.dto';

describe('SearchQuacksDto mine', () => {
  it.each([
    [undefined, undefined],
    ['true', true],
    ['false', false],
  ])('accepts %p as %p', async (mine, expected) => {
    const dto = plainToInstance(SearchQuacksDto, { mine });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.mine).toBe(expected);
  });

  it.each(['yes', '1', ''])('rejects %p', async (mine) => {
    await expect(
      validate(plainToInstance(SearchQuacksDto, { mine })),
    ).resolves.not.toHaveLength(0);
  });
});
