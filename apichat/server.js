const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const mongoDb = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();

const secret = 'universidaddepalermo2018';
const tokenExpiration = 60;                     // Expresado en segundos


/*
*   API
*/
/*
*   ENTIDAD USERS
*/  


//tenes que verificar si en la query string hay un username, si lo hay tomarlo para filtrar el mongoFind
app.get('/api/users', (req, res) => {  
    let token = req.query.token;
    
    //valido el token 
    jwtValidateToken(res, token, function(data){
        mongoFind({}, "tap", "users", {}, function(users){
           if (users.length > 0){
                res.status(200).send( {"users": users, "token": data.token} );
            }else{
                endByError(res, "No existen usuarios", 404);
            }
        });   
    });     
});

app.post('/api/users/', (req, res) => {
    let token = req.body.token;

    jwtValidateToken(res, token, function(data){ 
        if (data.error == undefined){
            mongoInsert({ "username": req.body.username, "password" : req.body.password }, "tap", "users");
            res.status(200).send("Usuario dado de alta");
        }
    });              
});

function getUserIdByQuery(userQuery, onSuccessCallback){
    mongoFindOne(userQuery, "tap", "users", function(data){
        onSuccessCallback(data._id.toString());
    });
}

/*
*   ENTIDAD LOGIN
*/
app.post('/api/login', (req, res) => {
    let user = req.body;
    
    // Obtiene el token
    mongoFind(user, "tap", "users", {}, function(data){
        if (data.length > 0){
            var token = jwtCreateToken({ "username": data[0].username, "id": data[0]._id.toString() });

            res.status(200).send( {"token": token} );
        }else{
            endByError(res, "Credenciales incorrectas", 401);
        }
    });
});

/*
*   ENTIDAD MESSAGES
*/
app.post('/api/messages', (req, res) => {
    let token = req.body.token;

    jwtValidateToken(res, token, function(data){
        if (data.error == undefined){
            getUserIdByQuery(req.user, function(user){
                mongoInsert({ "from": data.id, "to": user, "message": req.body.message, "readed": false }, "tap", "messages");
                
                res.status(200).send( {"token": data.token} );
            });
        }
    });
});

app.get('/api/messages', (req, res) => {
    let token = req.query.token;

    jwtValidateToken(res, token, function(data){
        if (data.error == undefined){
            let objToFind = { "from": data.id };
            if (req.query.unread != undefined) 
                objToFind["readed"] = false;

            mongoFind(objToFind, "tap", "messages", {}, function(msgs){
                res.status(200).send( {"messages": msgs, "token": data.token} );
                
                for (var i=0; i<msgs.length; i++)
                    mongoUpdateOne({"_id": msgs[i]._id}, {"readed": true}, "tap", "messages");
            });
        }
    });
});



/*
*   SERVIDOR
*/
// Parsea los body en formato json
app.use(bodyParser.json());

// Loguea las requests
app.use((req, res, next) => {
    console.log(`${req.method}: ${req.path} - ${moment().format(moment.HTML5_FMT.DATETIME_LOCAL_MS)}`);

    next();
});

// Inicia servidor
app.listen(process.env.PORT || 3000, function () {
    console.log('API funcionando con express...');
});

// Envía response con fin abrupto por error
function endByError(res, message, code){
    res.status(code).send({"error": message}).end();
}

/*
*   BASE
*/
// Se conecta a la Base
function mongoConnect(onSuccessCallback){
    mongoDb.connect("mongodb://localhost:27017/", function(err, db) {
        if (err) throw err;
        onSuccessCallback(db);
    });
}

function mongoInsert(objToInsert, databaseName, collectionName){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).insertOne(objToInsert, function(err, res) {
            if (err) throw err;
            console.log("1 documento insertado");
            db.close();
        });
    });
}

function mongoFindOne(objToFind, databaseName, collectionName, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).findOne(objToFind, function(err, res) {
            if (err) throw err;
            onSuccessCallback(res);
            db.close();
        });
    });
}

function mongoFind(objToFind, databaseName, collectionName, objSortRules, onSuccessCallback){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).find(objToFind).sort(objSortRules).toArray(function(err, res) {
            if (err) throw err;
            onSuccessCallback(res);
            db.close();
        });
    });
}

function mongoDeleteOne(objToFind, databaseName, collectionName){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).deleteOne(objToFind, function(err, res) {
            if (err) throw err;
            db.close();
        });
    });
}

function mongoUpdateOne(objToFind, updateObj, databaseName, collectionName){
    mongoConnect(function(db){
        db.db(databaseName).collection(collectionName).updateOne(objToFind, {$set: updateObj}, function(err, res) {
            if (err) throw err;
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