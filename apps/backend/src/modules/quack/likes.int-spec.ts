// Cases A1–A12: docs/user-stories/quack-likes.cases.md
import {
  anonymous,
  createTestApp,
  resetDatabase,
  signUp,
} from '@/test/int.helpers';
import { INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

type ApiQuack = { id: string; likeCount: number; likedByMe: boolean };

describe('Likes API', () => {
  let app: INestApplication;
  let me: Agent;

  const postQuack = async (agent: Agent, text = 'quack'): Promise<string> =>
    (await agent.post('/api/quacks').send({ text }).expect(201)).body.id;

  const inList = async (
    agent: Agent,
    path: string,
    id: string,
  ): Promise<ApiQuack | undefined> =>
    ((await agent.get(path).expect(200)).body as ApiQuack[]).find(
      (q) => q.id === id,
    );

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    me = (await signUp(app)).agent;
  });
  afterAll(async () => {
    await app.close();
  });

  it('A1: a signed-out visitor gets 401', async () => {
    const id = await postQuack(me);
    await anonymous(app).put(`/api/quacks/${id}/like`).expect(401);
    await anonymous(app).delete(`/api/quacks/${id}/like`).expect(401);
  });

  it('A2: liking a quack with no likes makes it 1, liked by me', async () => {
    const { agent: author } = await signUp(app);
    const id = await postQuack(author);

    await me
      .put(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 1, likedByMe: true });
  });

  it('A3: liking again keeps it at 1', async () => {
    const id = await postQuack(me);
    await me.put(`/api/quacks/${id}/like`).expect(200);

    await me
      .put(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 1, likedByMe: true });
  });

  it('A4: two likes at the same moment count once', async () => {
    const id = await postQuack(me);

    const responses = await Promise.all([
      me.put(`/api/quacks/${id}/like`),
      me.put(`/api/quacks/${id}/like`),
    ]);

    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(await inList(me, '/api/quacks', id)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
  });

  it('A5: taking the like back makes it 0, not liked by me', async () => {
    const id = await postQuack(me);
    await me.put(`/api/quacks/${id}/like`).expect(200);

    await me
      .delete(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 0, likedByMe: false });
  });

  it('A6: taking back a like I never gave changes nothing', async () => {
    const { agent: other } = await signUp(app);
    const id = await postQuack(me);
    await other.put(`/api/quacks/${id}/like`).expect(200);

    await me
      .delete(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 1, likedByMe: false });
  });

  it('A7: each viewer sees the same count and their own likedByMe', async () => {
    const { agent: second } = await signUp(app);
    const { agent: third } = await signUp(app);
    const id = await postQuack(me);
    await me.put(`/api/quacks/${id}/like`).expect(200);
    await second
      .put(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 2, likedByMe: true });

    expect(await inList(me, '/api/quacks', id)).toMatchObject({
      likeCount: 2,
      likedByMe: true,
    });
    expect(await inList(third, '/api/quacks', id)).toMatchObject({
      likeCount: 2,
      likedByMe: false,
    });
  });

  it('A8: liking a quack that does not exist is 404', async () => {
    await me.put('/api/quacks/does-not-exist/like').expect(404);
    await me.delete('/api/quacks/does-not-exist/like').expect(404);
  });

  it('A9: liking a deleted quack is 404', async () => {
    const id = await postQuack(me);
    await me.delete(`/api/quacks/${id}`).expect(204);

    await me.put(`/api/quacks/${id}/like`).expect(404);
    await me.delete(`/api/quacks/${id}/like`).expect(404);
  });

  it('A10: a deleted quack loses its likes', async () => {
    const { agent: replier } = await signUp(app);
    const id = await postQuack(me);
    // A reply keeps the tombstone in the feed (ADR 0004).
    await replier
      .post(`/api/quacks/${id}/replies`)
      .send({ text: 'reply' })
      .expect(201);
    await replier.put(`/api/quacks/${id}/like`).expect(200);
    await me.delete(`/api/quacks/${id}`).expect(204);

    expect(await inList(replier, '/api/quacks', id)).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
  });

  it('A11: a reply can be liked and the thread shows it', async () => {
    const id = await postQuack(me);
    const replyId = (
      await me
        .post(`/api/quacks/${id}/replies`)
        .send({ text: 'reply' })
        .expect(201)
    ).body.id;

    await me
      .put(`/api/quacks/${replyId}/like`)
      .expect(200, { likeCount: 1, likedByMe: true });
    expect(
      await inList(me, `/api/quacks/${id}/replies`, replyId),
    ).toMatchObject({ likeCount: 1, likedByMe: true });
  });

  it('A12: I can like my own quack', async () => {
    const id = await postQuack(me);

    await me
      .put(`/api/quacks/${id}/like`)
      .expect(200, { likeCount: 1, likedByMe: true });
  });
});
