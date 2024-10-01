const request = require('supertest')
const app = require('../service');

test('login', async() =>{
    const login = {email: "a@jwt.com", password: "admin"};
    const loginRes = await request(app).put('/api/auth').send(login);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.user.id).toBe(1);
    expect(loginRes.body.user.email).toMatch("a@jwt.com");
    expect(loginRes.body.user.roles).toEqual([{role: "admin"}]);
    expect(loginRes.body).toHaveProperty('token');
});