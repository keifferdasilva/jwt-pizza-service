const request = require('supertest')
const app = require('../service');
const {Role, DB} = require("../database/database");

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}

test('login', async() =>{
    const user = await createAdminUser();
    const login = {email: user.email, password: user.password};
    const loginRes = await request(app).put('/api/auth').send(login);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.user.email).toMatch(user.email);
    expect(loginRes.body.user.roles).toEqual([{role: "admin"}]);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.name).toMatch(user.name);
});

test('register', async() =>{
    let user = { password: 'toomanysecrets'};
    user.name = randomName();
    user.email = user.name + '@jwt.com';

    const registerRes = await request(app).post('/api/auth').send(user);
    expect(registerRes.statusCode).toBe(200);
    expect(registerRes.body.user.email).toMatch(user.email);
    expect(registerRes.body.user.name).toMatch(user.name);
    expect(registerRes.body).toHaveProperty('token');
    expect(registerRes.body.user.roles).toEqual([{role: "diner"}]);
});

test('bad register', async() =>{
    const registerRes = await request(app).post('/api/auth');
    expect(registerRes.statusCode).toBe(400);
    expect(registerRes.body.message).toMatch('name, email, and password are required');
});

test('logout', async () =>{
    const user = await createAdminUser();
    const login = {email: user.email, password: user.password};
    const loginRes = await request(app).put('/api/auth').send(login);
    const token = loginRes.body.token;
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
    expect(logoutRes.statusCode).toBe(200);
});

test('invalid authtoken', async() =>{
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', randomName());
    expect(logoutRes.statusCode).toBe(401);
    expect(logoutRes.body.message).toBe('unauthorized');
})

test('update user', async() =>{
    const user = await createAdminUser();
    const login = {email: user.email, password: user.password};
    const loginRes = await request(app).put('/api/auth').send(login);
    const id = loginRes.body.user.id;
    const token = loginRes.body.token;

    const newPassword = 'test';
    const newEmail = randomName() + '@test.com';
    let newUser = {email: newEmail, password: newPassword};
    const updateUserRes = await request(app).put(`/api/auth/${id}`).set('Authorization', `Bearer ${token}`).send(newUser);

    expect(updateUserRes.statusCode).toBe(200);
    expect(updateUserRes.body.email).toMatch(newEmail);
    expect(updateUserRes.body.name).toMatch(loginRes.body.user.name);
    expect(updateUserRes.body.id).toBe(id);

})

test('unauthorized update user', async() =>{
    let user = { password: 'toomanysecrets'};
    user.name = randomName();
    user.email = user.name + '@jwt.com';

    const registerRes = await request(app).post('/api/auth').send(user);

    const id = registerRes.body.user.id;
    const token = registerRes.body.token;

    const newPassword = 'test';
    const newEmail = randomName() + '@test.com';
    let newUser = {email: newEmail, password: newPassword};
    const updateUserRes = await request(app).put(`/api/auth/${id}`).set('Authorization', `Bearer ${token}`).send(newUser);

    expect(updateUserRes.status).toBe(403);
    expect(updateUserRes.body.message).toMatch('unauthorized');
})