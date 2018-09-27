const express = require('express');
const bodyParser = require('body-parser');
const mongoDb = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();

const secret = 'universidaddepalermo2018';
const connectionString = 'mongodb://pabloanania:universidaddepalermo2018@ds115753.mlab.com:15753/pabloanania';
const databaseName = 'pabloanania';
//const connectionString = 'mongodb://localhost:27017/';
//const databaseName = 'tap';
const tokenExpiration = 60;                     // Expresado en segundos



/*
*   SERVIDOR
*/
// Parsea los body en formato json
app.use((req, res, next) => {
    bodyParser.json()(req, res, (err) => {
        if (err) {
            endByError(res, "El formato de json no es correcto: " + err.message, 400);
            return;
        }
        next();
    });
});


// Loguea las requests
app.use((req, res, next) => {
    console.log(`${req.method}: ${req.path}`);

    next();
});

// Inicia servidor
var server = app.listen(process.env.PORT || 3000, function () {
    console.log('API funcionando con express...');
});
module.exports = server;

// Envía response con fin abrupto por error
function endByError(res, message, code){
    res.status(code).send({"error": message}).end();
}



/*
*   API
*/
/*
*   ENTIDAD USERS
*/  
app.get('/api/users', (req, res) => {  
    let token = req.query.token;
    
    jwtValidateToken(res, token, function(data){
        mongoFind({}, databaseName, "users", {}, function(users){
            res.status(200).send( {"users": users, "token": data.token} );
        });   
    });     
});

app.post('/api/users/', (req, res) => {
    if (req.body.username == undefined || req.body.password == undefined){
        endByError(res, "La request no posee el formato válido", 400);
        return;
    }

    let token = req.body.token;

    jwtValidateToken(res, token, function(data){ 
        if (data.error == undefined){
            mongoInsert({ "username": req.body.username, "password" : req.body.password }, databaseName, "users", function(i_res, err){
                if (err){
                    if (err.code == 11000)
                        endByError(res, "El usuario que intenta crear ya existe", 400);
                }else
                    res.status(201).send( {"token": data.token} );
            });
        }
    });
});

function getUserIdByQuery(userQuery, onSuccessCallback){
    mongoFindOne(userQuery, databaseName, "users", function(data){
        onSuccessCallback(data != null ? data._id.toString() : null);
    });
}

function getUserIdByName(username, onSuccessCallback){
    getUserIdByQuery({"username": username}, onSuccessCallback);
}

/*
*   ENTIDAD LOGIN
*/
app.post('/api/login', (req, res) => {
    let user = req.body;
    
    // Obtiene el token
    mongoFind(user, databaseName, "users", {}, function(data){
        if (data.length == 1){
            var token = jwtCreateToken({ "username": data[0].username, "id": data[0]._id.toString() });

            res.status(200).send( {"token": token} );
        }else{
            endByError(res, "Credenciales incorrectas", 401);
            return;
        }
    });
});

/*
*   ENTIDAD MESSAGES
*/
app.post('/api/messages', (req, res) => {
    if (req.body.to == undefined || req.body.message == undefined){
        endByError(res, "La request no posee el formato válido", 400);
        return;
    }

    let token = req.body.token;

    jwtValidateToken(res, token, function(data){
        if (data.error == undefined){
            getUserIdByName(req.body.to, function(user){
                if (user != null){
                    mongoInsert({ "from": data.id, "to": user, "message": req.body.message, "readed": false }, databaseName, "messages");
                
                    res.status(201).send( {"token": data.token} );
                }else{
                    endByError(res, "El usuario indicado no existe", 400);
                }
            });
        }
    });
});

app.get('/api/messages', (req, res) => {
    let token = req.query.token;

    jwtValidateToken(res, token, function(data){
        if (data.error == undefined){
            let objToFind = { "to": data.id };
            if (req.query.unread != undefined) 
                objToFind["readed"] = false;

            mongoFind(objToFind, databaseName, "messages", {}, function(msgs){
                res.status(200).send( {"messages": msgs, "token": data.token} );
                
                for (var i=0; i<msgs.length; i++)
                    mongoUpdateOne({"_id": msgs[i]._id}, {"readed": true}, databaseName, "messages", function(){});
            });
        }
    });
});



/*
*   BASE
*/
// Se conecta a la Base
function mongoConnect(onSuccessCallback){
    mongoDb.connect(connectionString, function(err, db) {
        if (err){
            console.log("Error de conexion a la DB: " + err.message); 
        }
        onSuccessCallback(db);
    });
}

function mongoInsert(objToInsert, databaseName, collectionName, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).insertOne(objToInsert, function(err, res) {
            onSuccessCallback(res, err);
            db.close();
        });
    });
}

function mongoFindOne(objToFind, databaseName, collectionName, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).findOne(objToFind, function(err, res) {
            onSuccessCallback(res, err);
            db.close();
        });
    });
}

function mongoFind(objToFind, databaseName, collectionName, objSortRules, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).find(objToFind).sort(objSortRules).toArray(function(err, res) {
            onSuccessCallback(res, err);
            db.close();
        });
    });
}

function mongoDeleteOne(objToFind, databaseName, collectionName, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).deleteOne(objToFind, function(err, res) {
            onSuccessCallback(res, err);
            db.close();
        });
    });
}

function mongoUpdateOne(objToFind, updateObj, databaseName, collectionName, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).updateOne(objToFind, {$set: updateObj}, function(err, res) {
            onSuccessCallback(res, err);
            db.close();
        });
    });
}

/*
* JSON WEB TOKEN (JWT) TOOLKIT
*/
function jwtCreateToken(payload){
    return jwt.sign(payload, secret, { expiresIn: tokenExpiration } );
}

function jwtValidateToken(res, token, onFinishValidation){
    jwt.verify(token, secret, function(err, decoded){
        if (err != null)
            endByError(res, "El token de usuario no es válido", 401);
        else{
            var token = jwtCreateToken( { "username": decoded.username, "id": decoded.id } );
            onFinishValidation( { "username": decoded.username, "id": decoded.id, "token": token } );
        }
    });
}