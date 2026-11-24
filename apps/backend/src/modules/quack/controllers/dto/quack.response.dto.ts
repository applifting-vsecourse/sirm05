import { Quack, QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { PollResponseDto } from './poll.response.dto';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class ReplyToDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when the quack replied to was deleted',
  })
  username!: string | null;
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({ type: PollResponseDto, nullable: true })
  poll!: PollResponseDto | null;

  @ApiProperty({ type: String, nullable: true })
  parentId!: string | null;

  @ApiProperty({
    description: 'Deleted: text is empty, show a placeholder (ADR 0004)',
  })
  deleted!: boolean;

  @ApiProperty({ description: 'Live replies' })
  replyCount!: number;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ description: 'Whether the viewer liked it' })
  likedByMe!: boolean;

  @ApiProperty({ type: ReplyToDto, nullable: true })
  replyTo!: ReplyToDto | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user || !quack.likes) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user and quack.likes to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      poll: quack.poll,
      parentId: quack.parentId,
      deleted: quack.deleted,
      replyCount: quack.replyCount,
      ...quack.likes,
      replyTo: quack.replyTo,
    };
  }
}
