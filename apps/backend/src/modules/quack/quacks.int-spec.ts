import {
  anonymous,
  createTestApp,
  resetDatabase,
  signUp,
} from '@/test/int.helpers';
import { INestApplication } from '@nestjs/common';

describe('GET /api/quacks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns 401 to a signed-out visitor', async () => {
    await anonymous(app).get('/api/quacks').expect(401);
  });

  it('returns 200 to a signed-in user', async () => {
    const { agent } = await signUp(app);
    await agent.get('/api/quacks').expect(200, []);
  });
});
