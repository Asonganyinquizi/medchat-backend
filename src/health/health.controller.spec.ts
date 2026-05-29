import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('returns status ok', () => {
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
  });

  it('returns a valid ISO timestamp', () => {
    const result = controller.getHealth();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns a fresh timestamp on each call', async () => {
    const first = controller.getHealth();
    await new Promise((r) => setTimeout(r, 10));
    const second = controller.getHealth();
    expect(new Date(second.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(first.timestamp).getTime(),
    );
  });
});
