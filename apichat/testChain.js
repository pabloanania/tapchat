
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;
chai.use(chaiHttp);
const url= 'http://localhost:3000';

   
//testeo traer todos los usuarios
describe('get de usuarios: ',()=>{
          it('get de usuarios', (done) => {
            chai.request(url)
              .get('/api/users')
              .end( function(err,res){
                console.log(res.body)
                expect(res).to.have.status(200);
                done();
              });
          });
        });
    
//testeo insertar un usuario
describe('Inserte un usuario ',()=>{
    it('Inserte un usuario', (done) => {
      chai.request(url)
        .post('/api/users')
        .send({id:0, username: "cacho", password: "123456"})
        .end( function(err,res){
          console.log(res.body)
          expect(res).to.have.status(200);
          done();
        });
    });
  });

     
//testeo get mensajes
describe('get message: ',()=>{
    it('get message', (done) => {
      chai.request(url)
        .get('/api/messages')
        .end( function(err,res){
          console.log(res.body)
          expect(res).to.have.status(200);
          done();
        });
    });
  });

//testeo post mensajes
describe('post message ',()=>{
    it('post message', (done) => {
      chai.request(url)
        .post('/api/message')
        .send({from:1, to: "cacho", message: "hello"})
        .end( function(err,res){
          console.log(res.body)
          expect(res).to.have.status(200);
          done();
        });
    });
  });