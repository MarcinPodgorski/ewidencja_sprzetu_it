import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { departmentsRouter } from './modules/departments/departments.routes';
import { employeesRouter } from './modules/employees/employees.routes';
import { appUsersRouter } from './modules/appUsers/appUsers.routes';
import { computersRouter } from './modules/computers/computers.routes';
import { monitorsRouter } from './modules/monitors/monitors.routes';
import { miceRouter } from './modules/mice/mice.routes';
import { keyboardsRouter } from './modules/keyboards/keyboards.routes';
import { phonesRouter } from './modules/phones/phones.routes';
import { simCardsRouter } from './modules/simCards/simCards.routes';
import { printersRouter } from './modules/printers/printers.routes';
import { tonersRouter } from './modules/toners/toners.routes';
import { equipmentSearchRouter } from './modules/equipment/equipment.search.routes';
import { equipmentListsRouter } from './modules/equipmentLists/equipmentLists.routes';
import { protocolsRouter } from './modules/protocols/protocols.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { fakturyRouter } from './modules/faktury/faktury.routes';
import { oprogramowanieRouter } from './modules/onboarding/oprogramowanie.routes';
import { profileOprogramowaniaRouter } from './modules/onboarding/profile.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { onboardingStartRouter } from './modules/onboarding/start.routes';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  // CSP wyłączone: to prosty wewnętrzny SPA serwowany z tej samej domeny co API
  // (bez zewnętrznych skryptów/CDN) — helmet i tak daje pozostałe nagłówki bezpieczeństwa.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/departments', departmentsRouter);
  apiRouter.use('/employees', employeesRouter);
  apiRouter.use('/app-users', appUsersRouter);
  apiRouter.use('/computers', computersRouter);
  apiRouter.use('/monitors', monitorsRouter);
  apiRouter.use('/mice', miceRouter);
  apiRouter.use('/keyboards', keyboardsRouter);
  apiRouter.use('/phones', phonesRouter);
  apiRouter.use('/sim-cards', simCardsRouter);
  apiRouter.use('/printers', printersRouter);
  apiRouter.use('/toners', tonersRouter);
  apiRouter.use('/equipment', equipmentSearchRouter);
  apiRouter.use('/equipment-lists', equipmentListsRouter);
  apiRouter.use('/protocols', protocolsRouter);
  apiRouter.use('/dashboard', dashboardRouter);
  apiRouter.use('/faktury', fakturyRouter);
  apiRouter.use('/oprogramowanie', oprogramowanieRouter);
  apiRouter.use('/profile-oprogramowania', profileOprogramowaniaRouter);
  apiRouter.use('/onboarding', onboardingRouter);
  // Publiczny (bez logowania) — jednolinijkowiec `irm …/start/<kod> | iex` na nowym laptopie.
  apiRouter.use('/start', onboardingStartRouter);

  // Każda ścieżka pod /api nieobsłużona powyżej kończy się jawnym 404 JSON —
  // rejestrowane jako ostatnie w apiRouter, więc nigdy nie "przecieka" do SPA fallbacku.
  apiRouter.use(notFoundHandler);

  app.use(`${env.APP_BASE_PATH}/api`, apiRouter);

  // Statyczny build klienta (React SPA) — pojawia się po `npm run build:client` (Faza 4+).
  // W dev bez builda ta gałąź jest pomijana (frontend serwowany osobno przez Vite dev server).
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(env.APP_BASE_PATH, express.static(clientDist));
    app.get(`${env.APP_BASE_PATH}/*`, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
