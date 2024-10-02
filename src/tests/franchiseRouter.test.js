const request = require('supertest')
const app = require('../service');
const {Role, DB} = require("../database/database");

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser()  {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}

async function loginUser(user){

    const login = {email: user.email, password: user.password};
    const res = await request(app).put('/api/auth').send(login);

    return {token: res.body.token, id: res.body.user.id};
}


test('default get', async() =>{
    const getRes = await request(app).get('/api/franchise/');
    expect(getRes.statusCode).toBe(200);
});

test('create franchise', async() =>{
    const user = await createAdminUser();
    const data = await loginUser(user);

    const name = randomName();
    const newFranchise = {name: name, admins: [{email: user.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${data.token}`).send(newFranchise);

    expect(createRes.statusCode).toBe(200);
    expect(createRes.body.name).toMatch(name);
    expect(createRes.body.admins).toEqual(expect.arrayContaining([expect.objectContaining({email : user.email})]));
    await request(app).delete(`/api/franchise/${createRes.body.id}`).set('Authorization', `Bearer ${data.token}`);
})

test('unauthorized create franchise', async() =>{
    let user = { password: 'toomanysecrets'};
    user.name = randomName();
    user.email = user.name + '@jwt.com';

    const registerRes = await request(app).post('/api/auth').send(user);

    const name = randomName();
    const newFranchise = {name: name, admins: [{email: user.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${registerRes.body.token}`).send(newFranchise);

    expect(createRes.statusCode).toBe(403);
    expect(createRes.body.message).toMatch('unable to create a franchise');
})

test('delete franchise', async() =>{

})

test('unauthorized delete franchise', async() =>{
    const user = await createAdminUser();
    const data = await loginUser(user);

    const name = randomName();
    const newFranchise = {name: name, admins: [{email: user.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${data.token}`).send(newFranchise);
    const id = createRes.body.id;

    let unauthUser = { password: 'toomanysecrets'};
    unauthUser.name = randomName();
    unauthUser.email = unauthUser.name + '@jwt.com';

    const registerRes = await request(app).post('/api/auth').send(unauthUser);
    const deleteRes = await request(app).delete(`/api/franchise/${id}`).set('Authorization', `Bearer ${registerRes.body.token}`);
    expect(deleteRes.statusCode).toBe(403);
    expect(deleteRes.body.message).toMatch('unable to delete a franchise');
})

test('get user franchises', async() =>{
    const user = await createAdminUser();
    const data = await loginUser(user);

    const name = randomName();
    const newFranchise = {name: name, admins: [{email: user.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${data.token}`).send(newFranchise);
    expect(createRes.statusCode).toBe(200);

    const otherUser = await createAdminUser();
    const otherData = await loginUser(otherUser);

    const otherName = randomName();
    const otherFranchise = {name: otherName, admins: [{email: otherUser.email}]};
    const otherCreateRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${otherData.token}`).send(otherFranchise);
    expect(otherCreateRes.statusCode).toBe(200);

    const getUserFranchiseRes = await request(app).get(`/api/franchise/${data.id}`).set('Authorization', `Bearer ${data.token}`);
    expect(getUserFranchiseRes.statusCode).toBe(200);
    expect(getUserFranchiseRes.body[0].name).toMatch(name);
    expect(getUserFranchiseRes.body[0].admins).toEqual(expect.arrayContaining([expect.objectContaining({email : user.email})]));
    //TODO: make sure other user's franchise is not in the response
})

test('create store', async() =>{
    const user = await createAdminUser();
    const data = await loginUser(user);

    const name = randomName();
    const newFranchise = {name: name, admins: [{email: user.email}]};
    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${data.token}`).send(newFranchise);
    const id = createFranchiseRes.body.id;

    const storeName = randomName();
    const createStoreRes = await request(app).post(`/api/franchise/${id}/store`).set('Authorization', `Bearer ${data.token}`).send({name: storeName});
    expect(createStoreRes.statusCode).toBe(200);
    expect(createStoreRes.body).toEqual(expect.objectContaining({name: storeName, franchiseId: id}));
})

test('delete store', async() =>{

})


