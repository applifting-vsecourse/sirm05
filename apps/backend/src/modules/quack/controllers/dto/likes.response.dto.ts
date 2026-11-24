import { ApiProperty } from '@nestjs/swagger';

export class LikesResponseDto {
  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ description: 'Whether the viewer liked it' })
  likedByMe!: boolean;
}
