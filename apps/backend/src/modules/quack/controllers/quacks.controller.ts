import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Put,
  Query,
  Sse,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import { CreateQuackDto } from './dto/create-quack.dto';
import { PollResponseDto } from './dto/poll.response.dto';
import { QuackResponseDto } from './dto/quack.response.dto';
import { SearchQuacksDto } from './dto/search-quacks.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({
    summary: 'List quacks, optionally filtered by a search and to mine',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({
    status: 400,
    description: 'Search longer than 100 chars or mine not true/false',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: SearchQuacksDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(
      user,
      query.q,
      query.mine,
    );
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own quack, with its poll' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: "Someone else's quack" })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async delete(
    @User() user: Identity,
    @Param('id') quackId: string,
  ): Promise<void> {
    await this.quacksService.deleteQuack(user, quackId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Empty text, unknown mood or invalid poll answers',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      pollOptions: body.pollOptions,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Sse('poll-events')
  @ApiOperation({
    summary: 'Server-Sent Events: live vote counts of every poll',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  pollEvents(): Observable<MessageEvent> {
    return this.quacksService
      .pollCountsStream()
      .pipe(map((counts) => ({ data: counts })));
  }

  @Put(':id/vote')
  @ApiOperation({ summary: 'Vote in a poll, or move your vote' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 400, description: 'Answer not part of this poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or has no poll' })
  async vote(
    @User() user: Identity,
    @Param('id') quackId: string,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    return this.quacksService.vote(user, quackId, body.optionId);
  }

  @Delete(':id/vote')
  @ApiOperation({ summary: 'Withdraw your vote from a poll' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or has no poll' })
  async withdrawVote(
    @User() user: Identity,
    @Param('id') quackId: string,
  ): Promise<PollResponseDto> {
    return this.quacksService.withdrawVote(user, quackId);
  }
}
