const request = require('supertest')
const app = require('./service');

test('basic', ()=>{
    expect(true).toBe(true);
});

test('default endpoint', async() =>{
    const defaultRes = await request(app).get('/');
    expect(defaultRes.statusCode).toBe(200);
    expect(defaultRes.body.message).toMatch('welcome to JWT Pizza')
    expect(defaultRes.body.version).toMatch(/^2024[0-2][0-9][0-3][0-9]\.[0-1][0-9][0-5][0-9][0-5][0-9]$/);
});

test('unknown endpoint', async() =>{
   const unknownRes = await request(app).get('/test');
   expect(unknownRes.status).toBe(404);
   expect(unknownRes.body.message).toMatch('unknown endpoint');
});

test('docs endpoint', async() =>{
    const docsRes = await request(app).get('/docs');
    expect(docsRes.statusCode).toBe(200);
});