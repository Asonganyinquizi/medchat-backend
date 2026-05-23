import { Controller, Get } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('api/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getAllSessions() {
    return this.sessionService.getAllSessions();
  }
}
