let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();
let nav_token;

chai.use(chaiHttp);



describe('Users', function() {
  // Testing de POST login. Además obtiene el token para navegar el resto de la API
  it('Obtener token: POST /api/login', function(done) {
    chai.request(server)
      .post('/api/login')
      .send({'username': 'pepe', 'password': '1234'})
      .end(function(err, res){
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        nav_token = res.body.token;
        done();
      });
  });

  // Testing de GET users
  it('Listar todos los usuarios: GET /api/users', function(done) {
    chai.request(server)
      .get('/api/users?token=' + nav_token)
      .end(function(err, res){
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        nav_token = res.body.token;
        done();
      });
  });

  // Testing POST de messages
  it('Enviar un mensaje: POST /api/messages', function(done) {
    chai.request(server)
      .post('/api/messages')
      .send({'to': 'cacho', 'message': 'Hola soy cacho y estoy probando Mocha + Chai','token': nav_token})
      .end(function(err, res){
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        done();
      });
  });
});