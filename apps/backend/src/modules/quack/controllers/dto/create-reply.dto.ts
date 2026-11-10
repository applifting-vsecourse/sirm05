import { PickType } from '@nestjs/swagger';
import { CreateQuackDto } from './create-quack.dto';

// A reply is a quack without a poll.
export class CreateReplyDto extends PickType(CreateQuackDto, [
  'text',
  'mood',
] as const) {}
