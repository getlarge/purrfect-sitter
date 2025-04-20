import axios from 'axios';

describe('API Health Check', () => {
  it('should return a healthy status', async () => {
    const res = await axios.get('http://localhost:3000/health');

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('status', 'ok');
  });

  it('should return the correct auth strategy', async () => {
    const authStrategy = process.env.AUTH_STRATEGY || 'db';
    const res = await axios.get('http://localhost:3000/health');

    expect(res.data).toHaveProperty('authStrategy', authStrategy);
  });
});
