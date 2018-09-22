let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
const expect = require('chai').expect;
chai.use(chaiHttp);
const url= 'http://localhost:3000';



describe('Users', function() {
  it('should list ALL users on /users GET');
  it('should add a SINGLE users on /user POST');
});


//testing de GET users
it('should list ALL users on /users GET', function(done) {
  chai.request(server)
    .get('/api/users')
    .end(function(err, res){
      res.should.have.status(200);
      done();
    });
});


//testing POST de users
it('should add a SINGLE user on /users POST', function(done) {
  chai.request(server)
    .post('/api/users')
    .send({'username': 'cacho', 'password': '1234'})
    .end(function(err, res){
      res.should.have.status(200);
      res.should.be.json;
      res.body.should.be.a('object');
      res.body.should.have.property('SUCCESS');
      res.body.SUCCESS.should.be.a('object');
      res.body.SUCCESS.should.have.property('_id');
      res.body.SUCCESS.should.have.property('name');
      res.body.SUCCESS.should.have.property('password');
      done();
    });
});