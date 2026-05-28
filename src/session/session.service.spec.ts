import { Session } from './session.entity';
import { SessionService } from './session.service';

type SessionRepositoryMock = {
  create: jest.Mock<Session, [Partial<Session>?]>;
  save: jest.Mock<Promise<Session>, [Session]>;
  findOne: jest.Mock<Promise<Session | null>, [{ where: { id: string } }]>;
};

function createRepositoryMock(): SessionRepositoryMock {
  return {
    create: jest.fn((session?: Partial<Session>) => session as Session),
    save: jest.fn(async (session: Session) => session),
    findOne: jest.fn(),
  };
}

describe('SessionService', () => {
  it('creates a session with a generated or supplied UUID', async () => {
    const repository = createRepositoryMock();
    const service = new SessionService(repository as never);
    const id = '1a348a8d-cb26-4db2-977a-49e884058219';

    await service.createSession(id);

    expect(repository.create).toHaveBeenCalledWith({ id });
    expect(repository.save).toHaveBeenCalledWith({ id });
  });

  it('retrieves an existing session by id', async () => {
    const repository = createRepositoryMock();
    const service = new SessionService(repository as never);
    const session = { id: '1a348a8d-cb26-4db2-977a-49e884058219' } as Session;
    repository.findOne.mockResolvedValue(session);

    await expect(service.getSession(session.id)).resolves.toBe(session);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: session.id },
    });
  });

  it('creates a session when ensureSession cannot find one', async () => {
    const repository = createRepositoryMock();
    const service = new SessionService(repository as never);
    const id = '1a348a8d-cb26-4db2-977a-49e884058219';
    repository.findOne.mockResolvedValue(null);

    await service.ensureSession(id);

    expect(repository.create).toHaveBeenCalledWith({ id });
    expect(repository.save).toHaveBeenCalledWith({ id });
  });
});
