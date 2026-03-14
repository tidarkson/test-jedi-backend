import request from 'supertest';
import express from 'express';
import testRepositoryRoutes from '../../../src/routes/testRepository';
import runsRoutes from '../../../src/routes/runs';

describe('Project-scoped route mounting', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mirrors real server mounting behavior.
    app.use('/api/v1/projects/:projectId', testRepositoryRoutes);
    app.use('/api/v1', runsRoutes);

    app.use((_req, res) => {
      res.status(404).json({
        status: 'error',
        code: 404,
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
      });
    });
  });

  it('POST /projects/:projectId/suites is reachable (returns 401 without token, not 404)', async () => {
    const response = await request(app)
      .post('/api/v1/projects/00000000-0000-0000-0000-000000000001/suites')
      .send({ name: 'Authentication Regression', description: 'Capture login' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('MISSING_TOKEN');
  });

  it('POST /projects/:projectId/cases is reachable (returns 401 without token, not 404)', async () => {
    const response = await request(app)
      .post('/api/v1/projects/00000000-0000-0000-0000-000000000001/cases')
      .send({
        suiteId: '00000000-0000-0000-0000-000000000002',
        title: 'Case title',
        priority: 'HIGH',
        severity: 'MAJOR',
        type: 'FUNCTIONAL',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('MISSING_TOKEN');
  });

  it('POST /projects/:projectId/runs is reachable (returns 401 without token, not 404)', async () => {
    const response = await request(app)
      .post('/api/v1/projects/00000000-0000-0000-0000-000000000001/runs')
      .send({
        title: 'Regression Run',
        type: 'MANUAL',
        environment: 'Staging',
        caseSelection: { suiteIds: ['00000000-0000-0000-0000-000000000002'] },
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('MISSING_TOKEN');
  });
});
