import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { employeesRouter } from './routes/employees.routes.js';
import { projectsRouter, assignmentsRouter } from './routes/projects.routes.js';
import { allocationsRouter } from './routes/allocations.routes.js';
import { capacityOverridesRouter } from './routes/capacityOverrides.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: env.isProduction ? false : true,
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/capacity-overrides', capacityOverridesRouter);

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Jeen Planner API listening on port ${env.port}`);
});
