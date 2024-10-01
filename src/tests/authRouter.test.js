const request = require('supertest')
const app = require('../service');
const {Role, DB} = require("../database/database");

beforeAll( async() =>{
   const newUser = { name: "keiffer", email: "k@jwt.com", password: "admin", roles: [{ role: Role.Admin }] };
    DB.addUser(newUser).then((r) => console.log('created user: ', r));
});

test('login', async() =>{
    const login = {email: "k@jwt.com", password: "admin"};
    const loginRes = await request(app).put('/api/auth').send(login);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.user.id).toBe(2);
    expect(loginRes.body.user.email).toMatch("k@jwt.com");
    expect(loginRes.body.user.roles).toEqual([{role: "admin"}]);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.name).toMatch('keiffer');
});