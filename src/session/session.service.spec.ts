import { SessionService } from './session.service';
import { PrismaService } from '../database/prisma.service';

const SESSION_ID = '1a348a8d-cb26-4db2-977a-49e884058219';

function createPrismaMock() {
  return {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('SessionService', () => {
  it('creates a session with a supplied UUID', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    const expected = { id: SESSION_ID };
    (prisma.session.create as jest.Mock).mockResolvedValue(expected);

    const result = await service.createSession(SESSION_ID);

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { id: SESSION_ID },
    });
    expect(result).toEqual(expected);
  });

  it('creates a session without an id', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    (prisma.session.create as jest.Mock).mockResolvedValue({
      id: 'generated-id',
    });

    await service.createSession();

    expect(prisma.session.create).toHaveBeenCalledWith({ data: {} });
  });

  it('retrieves an existing session by id', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    const session = { id: SESSION_ID };
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(session);

    const result = await service.getSession(SESSION_ID);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
    });
    expect(result).toEqual(session);
  });

  it('returns null when session does not exist', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.getSession(SESSION_ID);

    expect(result).toBeNull();
  });

  it('returns existing session when ensureSession finds one', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    const session = { id: SESSION_ID };
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(session);

    const result = await service.ensureSession(SESSION_ID);

    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(result).toEqual(session);
  });

  it('creates a session when ensureSession cannot find one', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    const session = { id: SESSION_ID };
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.session.create as jest.Mock).mockResolvedValue(session);

    const result = await service.ensureSession(SESSION_ID);

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { id: SESSION_ID },
    });
    expect(result).toEqual(session);
  });

  it('returns all sessions ordered by createdAt desc', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    const sessions = [{ id: SESSION_ID }];
    (prisma.session.findMany as jest.Mock).mockResolvedValue(sessions);

    const result = await service.getAllSessions();

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(sessions);
  });

  it('updates session summary', async () => {
    const prisma = createPrismaMock();
    const service = new SessionService(prisma);
    (prisma.session.update as jest.Mock).mockResolvedValue({});

    await service.updateSessionSummary(SESSION_ID, 'Test summary');

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { summary: 'Test summary' },
    });
  });
});
