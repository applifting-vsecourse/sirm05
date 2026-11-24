import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';
import { PrismaService } from '@/core/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  setupApp(app);
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(PrismaService)
    .$executeRawUnsafe(
      'TRUNCATE "quack", "user", "session", "account", "verification" CASCADE',
    );
}

let userCount = 0;

// Signs up a fresh user; the returned agent carries their session cookie.
export async function signUp(
  app: INestApplication,
): Promise<{ agent: request.Agent; id: string }> {
  const agent = request.agent(app.getHttpServer());
  const n = ++userCount;
  const res = await agent
    .post('/api/auth/sign-up/email')
    .send({
      name: `Duck ${n}`,
      email: `duck${n}@test.example`,
      password: 'password123',
      username: `duck${n}`,
    })
    .expect(200);
  return { agent, id: res.body.user.id };
}

export const anonymous = (app: INestApplication): request.Agent =>
  request.agent(app.getHttpServer());
