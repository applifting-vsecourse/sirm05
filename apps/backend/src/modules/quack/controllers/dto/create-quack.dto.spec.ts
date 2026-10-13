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
